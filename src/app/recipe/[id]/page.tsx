"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { RecipeDetail, RecipeSummary } from "@/lib/types";
import { isFavorite, toggleFavorite } from "@/lib/storage";

export default function RecipePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [faved, setFaved] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/recipe/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setRecipe(data.recipe);
          setFaved(isFavorite(id));
        }
      })
      .catch(() => setError("레시피를 불러오는 중 오류가 발생했습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleFav = () => {
    if (!recipe) return;
    const summary: RecipeSummary = {
      id: recipe.id,
      title: recipe.title,
      thumbnail: recipe.thumbnail,
      url: recipe.url,
      description: "",
    };
    setFaved(toggleFavorite(summary));
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center gap-3 text-gray-400">
        <div className="text-5xl animate-spin">🍳</div>
        <p className="text-sm">레시피를 불러오는 중...</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl">😢</div>
        <p className="text-gray-600 text-center">{error || "레시피를 찾을 수 없습니다."}</p>
        <button onClick={() => router.back()} className="btn-primary">돌아가기</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      {/* Sticky header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-primary font-medium text-sm"
        >
          ← 목록
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleFav}
            className="text-xl active:scale-90 transition-transform"
            aria-label={faved ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          >
            {faved ? "❤️" : "🤍"}
          </button>
          <a
            href={recipe.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 underline underline-offset-2"
          >
            원본 보기
          </a>
        </div>
      </div>

      {/* Hero image */}
      {recipe.thumbnail && (
        <div className="relative aspect-[4/3] bg-warm-100">
          <Image
            src={recipe.thumbnail}
            alt={recipe.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      <div className="px-4 py-5 space-y-6">
        {/* Title + meta */}
        <div>
          <h1 className="text-xl font-bold text-gray-800 leading-snug">{recipe.title}</h1>
          {(recipe.servings || recipe.cookTime || recipe.difficulty) && (
            <div className="flex gap-5 mt-3">
              {recipe.servings && (
                <div className="text-center">
                  <div className="text-lg">🍽️</div>
                  <div className="text-xs text-gray-500 mt-0.5">{recipe.servings}</div>
                </div>
              )}
              {recipe.cookTime && (
                <div className="text-center">
                  <div className="text-lg">⏱️</div>
                  <div className="text-xs text-gray-500 mt-0.5">{recipe.cookTime}</div>
                </div>
              )}
              {recipe.difficulty && (
                <div className="text-center">
                  <div className="text-lg">📊</div>
                  <div className="text-xs text-gray-500 mt-0.5">{recipe.difficulty}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ingredients */}
        {recipe.ingredients.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              재료
            </h2>
            <div className="space-y-3">
              {recipe.ingredients.map((group, gi) => (
                <div key={gi} className="bg-warm-50 rounded-xl p-3">
                  {group.name && group.name !== "재료" && (
                    <h3 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
                      {group.name}
                    </h3>
                  )}
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.items.map((item, ii) => (
                      <div
                        key={ii}
                        className="text-sm text-gray-700 bg-white rounded-lg px-2.5 py-1.5 border border-warm-100"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Steps */}
        {recipe.steps.length > 0 && (
          <section className="pb-8">
            <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-secondary rounded-full inline-block" />
              조리 순서
            </h2>
            <ol className="space-y-5">
              {recipe.steps.map((step) => (
                <li key={step.step} className="flex gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-secondary text-white text-sm font-bold rounded-full flex items-center justify-center mt-0.5">
                    {step.step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-relaxed">{step.description}</p>
                    {step.image && (
                      <div className="relative mt-2 aspect-video rounded-xl overflow-hidden bg-warm-100">
                        <Image
                          src={step.image}
                          alt={`${step.step}단계`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {recipe.ingredients.length === 0 && recipe.steps.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">상세 내용을 불러오지 못했습니다.</p>
            <a
              href={recipe.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-primary underline text-sm"
            >
              만개의레시피에서 직접 보기 →
            </a>
          </div>
        )}

        {/* Source */}
        <div className="border-t border-gray-100 pt-4 pb-6 text-center">
          <p className="text-xs text-gray-400">
            출처:{" "}
            <a
              href={recipe.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              만개의레시피
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
