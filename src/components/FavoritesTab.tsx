"use client";

import { useState, useEffect } from "react";
import RecipeCard from "./RecipeCard";
import { RecipeSummary } from "@/lib/types";
import { getFavorites } from "@/lib/storage";

export default function FavoritesTab() {
  const [favorites, setFavorites] = useState<RecipeSummary[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const refresh = () => setFavorites(getFavorites());

  if (favorites.length === 0) {
    return (
      <div className="px-4 py-5 text-center py-20 text-gray-400">
        <div className="text-5xl mb-3">🤍</div>
        <p className="text-sm font-medium">저장된 레시피가 없어요</p>
        <p className="text-xs mt-1">레시피 카드의 ♡를 눌러 즐겨찾기에 추가해보세요</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <h2 className="text-base font-bold text-gray-700 mb-3">즐겨찾기 {favorites.length}개</h2>
      <div className="grid grid-cols-2 gap-3">
        {favorites.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} onFavoriteChange={refresh} />
        ))}
      </div>
    </div>
  );
}
