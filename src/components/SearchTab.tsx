"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RecipeCard from "./RecipeCard";
import { RecipeSummary, INGREDIENT_CATEGORIES } from "@/lib/types";

export default function SearchTab() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inputValue, setInputValue] = useState("");
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    const raw = searchParams.get("i");
    if (raw) {
      const items = raw.split(",").map((s) => s.trim()).filter(Boolean);
      if (items.length > 0) setSelectedIngredients(items);
    }
  }, [searchParams]);

  const toggleIngredient = (item: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addFromInput = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const newItems = trimmed.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
    setSelectedIngredients((prev) => {
      const next = [...prev];
      newItems.forEach((item) => { if (!next.includes(item)) next.push(item); });
      return next;
    });
    setInputValue("");
  };

  const doSearch = useCallback(async (ingredients: string[]) => {
    if (ingredients.length === 0) return;
    setLoading(true);
    setError("");
    setSearched(true);
    const params = new URLSearchParams({ i: ingredients.join(",") });
    router.replace(`/?${params.toString()}`, { scroll: false });
    try {
      const res = await fetch(`/api/search?ingredients=${encodeURIComponent(ingredients.join(","))}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setRecipes([]); }
      else setRecipes(data.recipes || []);
    } catch {
      setError("레시피를 검색하는 중 오류가 발생했습니다.");
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleShare = async () => {
    const params = new URLSearchParams({ i: selectedIngredients.join(",") });
    const url = `${window.location.origin}/?${params.toString()}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  return (
    <div className="px-4 py-5 space-y-5">
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">재료 직접 입력</h2>
        <div className="flex gap-2">
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
      </section>

      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">카테고리로 선택</h2>
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
              onClick={() => toggleIngredient(item)}
              className={`ingredient-chip ${selectedIngredients.includes(item) ? "selected" : ""}`}
            >
              {selectedIngredients.includes(item) && <span>✓</span>}
              {item}
            </button>
          ))}
        </div>
      </section>

      {selectedIngredients.length > 0 && (
        <section className="bg-warm-100 rounded-2xl p-4 border border-warm-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-700">
              선택된 재료 ({selectedIngredients.length})
            </h2>
            <button
              onClick={handleShare}
              className="text-xs text-primary underline underline-offset-2"
            >
              URL 공유
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedIngredients.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 bg-white text-gray-700 border border-warm-200 text-sm py-1 px-3 rounded-full"
              >
                {item}
                <button
                  onClick={() => setSelectedIngredients((p) => p.filter((i) => i !== item))}
                  className="text-gray-400 hover:text-secondary ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={() => doSearch(selectedIngredients)}
            disabled={loading}
            className="w-full bg-secondary hover:bg-warm-500 disabled:opacity-60 text-white font-semibold py-3 rounded-full transition-colors"
          >
            {loading ? "레시피 검색 중..." : "🔍 레시피 찾기"}
          </button>
        </section>
      )}

      {shareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg z-50">
          링크가 복사되었습니다!
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-10 text-gray-400">
          <div className="animate-spin text-4xl mb-3">🍳</div>
          <p className="text-sm">만개의레시피에서 찾는 중...</p>
        </div>
      )}

      {!loading && searched && recipes.length === 0 && !error && (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-3">🔍</div>
          <p>검색 결과가 없습니다.</p>
          <p className="text-sm mt-1">다른 재료를 선택해 보세요.</p>
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
            <a
              href="https://www.10000recipe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              만개의레시피
            </a>
          </p>
        </section>
      )}

      {!searched && selectedIngredients.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-5xl mb-3">🥕</div>
          <p className="text-sm font-medium">재료를 선택하고 레시피를 찾아보세요</p>
          <p className="text-xs mt-1">카테고리 버튼이나 직접 입력으로 추가해요</p>
        </div>
      )}
    </div>
  );
}
