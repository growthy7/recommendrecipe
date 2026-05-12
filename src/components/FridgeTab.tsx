"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import RecipeCard from "./RecipeCard";
import { RecipeSummary, INGREDIENT_CATEGORIES } from "@/lib/types";
import { getFridge, setFridge, getFridgeCode, setFridgeCode } from "@/lib/storage";

type SyncStatus = "idle" | "syncing" | "synced" | "error";

interface Props {
  initialCode?: string; // URL 공유로 넘어온 코드
}

export default function FridgeTab({ initialCode }: Props) {
  const [code, setCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [fridge, setFridgeState] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState("");

  const [inputValue, setInputValue] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // 초기화: localStorage에서 코드 복원 or URL 파라미터 코드 사용
  useEffect(() => {
    const saved = initialCode || getFridgeCode();
    if (saved) {
      setCode(saved);
      setCodeInput(saved);
      loadFromKV(saved);
    } else {
      setFridgeState(getFridge());
    }
  }, [initialCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFromKV = async (roomCode: string) => {
    setSyncStatus("syncing");
    setSyncError("");
    try {
      const res = await fetch(`/api/fridge/${encodeURIComponent(roomCode)}`);
      const data = await res.json();
      if (data.error) {
        setSyncError(data.error);
        setSyncStatus("error");
        setFridgeState(getFridge()); // KV 실패 시 로컬 사용
      } else {
        setFridgeState(data.ingredients);
        setFridge(data.ingredients);
        setSyncStatus("synced");
      }
    } catch {
      setSyncError("네트워크 오류");
      setSyncStatus("error");
      setFridgeState(getFridge());
    }
  };

  const saveToKV = useCallback(async (items: string[], roomCode: string) => {
    setSyncStatus("syncing");
    try {
      const res = await fetch(`/api/fridge/${encodeURIComponent(roomCode)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: items }),
      });
      const data = await res.json();
      if (data.error) {
        setSyncError(data.error);
        setSyncStatus("error");
      } else {
        setSyncStatus("synced");
        setSyncError("");
      }
    } catch {
      setSyncStatus("error");
      setSyncError("동기화 실패");
    }
  }, []);

  const updateFridge = (items: string[]) => {
    setFridgeState(items);
    setFridge(items); // 항상 로컬에도 저장

    if (!code) return;

    // 첫 로드 시 KV 덮어쓰기 방지
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }

    // 1초 디바운스로 KV에 저장
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveToKV(items, code), 1000);
  };

  const applyCode = async () => {
    const trimmed = codeInput.trim().toLowerCase();
    if (!trimmed) return;
    isFirstLoad.current = true;
    setCode(trimmed);
    setFridgeCode(trimmed);
    await loadFromKV(trimmed);
  };

  const clearCode = () => {
    setCode("");
    setCodeInput("");
    setFridgeCode("");
    setSyncStatus("idle");
    setSyncError("");
    setFridgeState(getFridge());
  };

  const handleShare = async () => {
    if (!code) return;
    const url = `${window.location.origin}/?fridge=${encodeURIComponent(code)}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  const toggleItem = (item: string) => {
    updateFridge(
      fridge.includes(item) ? fridge.filter((i) => i !== item) : [...fridge, item]
    );
  };

  const addFromInput = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const newItems = trimmed.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
    const next = [...fridge];
    newItems.forEach((item) => { if (!next.includes(item)) next.push(item); });
    updateFridge(next);
    setInputValue("");
  };

  const handleSearch = async () => {
    if (fridge.length === 0) return;
    setLoading(true);
    setSearchError("");
    setSearched(true);
    try {
      const res = await fetch(`/api/search?ingredients=${encodeURIComponent(fridge.join(","))}`);
      const data = await res.json();
      if (data.error) { setSearchError(data.error); setRecipes([]); }
      else setRecipes(data.recipes || []);
    } catch {
      setSearchError("레시피를 검색하는 중 오류가 발생했습니다.");
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const syncLabel: Record<SyncStatus, string> = {
    idle: "",
    syncing: "🔄 동기화 중...",
    synced: "✅ 동기화됨",
    error: `❌ ${syncError}`,
  };

  return (
    <div className="px-4 py-5 space-y-5">
      {/* 방 코드 설정 */}
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔗</span>
          <h2 className="text-sm font-semibold text-gray-700">가족 공유 코드</h2>
        </div>

        {!code ? (
          <>
            <p className="text-xs text-gray-400 mb-3">
              코드를 설정하면 같은 코드를 사용하는 기기와 냉장고 재료가 자동으로 동기화됩니다.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyCode()}
                placeholder="예: 우리가족 또는 kim2024"
                className="flex-1 border border-warm-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <button onClick={applyCode} className="btn-primary text-sm">연결</button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-warm-100 border border-warm-200 text-gray-700 text-sm font-medium px-3 py-1 rounded-full">
                  {code}
                </span>
                {syncStatus !== "idle" && (
                  <span className={`text-xs ${syncStatus === "error" ? "text-red-500" : "text-gray-400"}`}>
                    {syncLabel[syncStatus]}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="text-xs text-primary underline underline-offset-2"
                >
                  링크 공유
                </button>
                <button
                  onClick={clearCode}
                  className="text-xs text-gray-400 underline underline-offset-2"
                >
                  변경
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              링크를 가족에게 공유하면 같은 냉장고를 함께 사용할 수 있어요.
            </p>
          </div>
        )}
      </section>

      {shareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50">
          공유 링크가 복사되었습니다!
        </div>
      )}

      {/* 냉장고 현황 */}
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🧊</span>
          <h2 className="text-sm font-semibold text-gray-700">내 냉장고 재료</h2>
          {fridge.length > 0 && (
            <span className="ml-auto text-xs text-gray-400">{fridge.length}개</span>
          )}
        </div>
        {fridge.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            아직 재료가 없어요. 아래에서 추가해보세요!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {fridge.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 bg-warm-100 text-gray-700 border border-warm-200 text-sm py-1 px-3 rounded-full"
              >
                {item}
                <button
                  onClick={() => updateFridge(fridge.filter((i) => i !== item))}
                  className="text-gray-400 hover:text-secondary ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 재료 추가 */}
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">재료 추가</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFromInput()}
            placeholder="예: 당근, 달걀"
            className="flex-1 border border-warm-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <button onClick={addFromInput} className="btn-primary text-sm">추가</button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {INGREDIENT_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(idx)}
              className={`flex-shrink-0 text-xs py-1.5 px-3 rounded-full border transition-colors duration-150 ${
                activeCategory === idx
                  ? "bg-primary border-primary text-white"
                  : "border-warm-200 text-gray-600 hover:bg-warm-100"
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {INGREDIENT_CATEGORIES[activeCategory].items.map((item) => (
            <button
              key={item}
              onClick={() => toggleItem(item)}
              className={`ingredient-chip ${fridge.includes(item) ? "selected" : ""}`}
            >
              {fridge.includes(item) && <span>✓</span>}
              {item}
            </button>
          ))}
        </div>
      </section>

      {fridge.length > 0 && (
        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-primary hover:bg-secondary disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-colors"
        >
          {loading ? "검색 중..." : `🍳 냉장고 재료로 레시피 찾기 (${fridge.length}개)`}
        </button>
      )}

      {searchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {searchError}
        </div>
      )}

      {loading && (
        <div className="text-center py-10 text-gray-400">
          <div className="animate-spin text-4xl mb-3">🍳</div>
          <p className="text-sm">만개의레시피에서 찾는 중...</p>
        </div>
      )}

      {!loading && searched && recipes.length === 0 && !searchError && (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-3">🔍</div>
          <p>검색 결과가 없습니다.</p>
        </div>
      )}

      {!loading && recipes.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-gray-700 mb-3">레시피 {recipes.length}개</h2>
          <div className="grid grid-cols-2 gap-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">
            출처:{" "}
            <a href="https://www.10000recipe.com" target="_blank" rel="noopener noreferrer" className="underline">
              만개의레시피
            </a>
          </p>
        </section>
      )}
    </div>
  );
}
