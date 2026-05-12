"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { RecipeSummary } from "@/lib/types";
import { isFavorite, toggleFavorite } from "@/lib/storage";

interface Props {
  recipe: RecipeSummary;
  onFavoriteChange?: () => void;
}

export default function RecipeCard({ recipe, onFavoriteChange }: Props) {
  const router = useRouter();
  const [faved, setFaved] = useState(false);

  useEffect(() => {
    setFaved(isFavorite(recipe.id));
  }, [recipe.id]);

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = toggleFavorite(recipe);
    setFaved(added);
    onFavoriteChange?.();
  };

  return (
    <div
      className="recipe-card relative"
      onClick={() => router.push(`/recipe/${recipe.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/recipe/${recipe.id}`)}
    >
      <div className="relative aspect-[4/3] bg-warm-100 overflow-hidden">
        {recipe.thumbnail ? (
          <Image
            src={recipe.thumbnail}
            alt={recipe.title}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}
        <button
          onClick={handleFav}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/80 rounded-full text-sm shadow-sm active:scale-95 transition-transform"
          aria-label={faved ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          {faved ? "❤️" : "🤍"}
        </button>
      </div>
      <div className="p-3">
        <h3 className="font-medium text-gray-800 text-sm leading-tight line-clamp-2">
          {recipe.title}
        </h3>
        {recipe.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{recipe.description}</p>
        )}
        {recipe.author && (
          <p className="text-xs text-gray-400 mt-0.5">{recipe.author}</p>
        )}
      </div>
    </div>
  );
}
