"use client";

import { useState, useEffect } from "react";
import RecipeCard from "./RecipeCard";
import { RecipeSummary, INGREDIENT_CATEGORIES } from "@/lib/types";
import { getFridge, setFridge } from "@/lib/storage";

export default function FridgeTab() {
  const [fridge, setFridgeState] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setFridgeState(getFridge());
  }, []);

  const updateFridge = (items: string[]) => {
    setFridgeState(items);
    setFridge(items);
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
    setError("");
    setSearched(true);
    try {
      const res = await fetch(`/api/search?ingredients=${encodeURIComponent(fridge.join(","))}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setRecipes([]); }
      else setRecipes(data.recipes || []);
    } catch {
      setError("레시피를 검색하는 중 오류가 발생했습니다.");
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-5 space-y-5">
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
    </div>
  );
}
