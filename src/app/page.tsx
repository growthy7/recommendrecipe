"use client";

import { useState, Suspense } from "react";
import SearchTab from "@/components/SearchTab";
import FridgeTab from "@/components/FridgeTab";
import FavoritesTab from "@/components/FavoritesTab";

type Tab = "search" | "fridge" | "favorites";

const TABS: { id: Tab; emoji: string; label: string }[] = [
  { id: "search", emoji: "🔍", label: "검색" },
  { id: "fridge", emoji: "🧊", label: "내 냉장고" },
  { id: "favorites", emoji: "❤️", label: "즐겨찾기" },
];

const HEADER: Record<Tab, { emoji: string; title: string; sub: string }> = {
  search: { emoji: "🥕", title: "재료로 검색", sub: "냉장고 재료로 레시피를 찾아보세요" },
  fridge: { emoji: "🧊", title: "내 냉장고", sub: "재료를 저장하고 한 번에 검색해요" },
  favorites: { emoji: "❤️", title: "즐겨찾기", sub: "저장해둔 레시피를 다시 봐요" },
};

export default function Home() {
  const [tab, setTab] = useState<Tab>("search");
  const h = HEADER[tab];

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20">
      <header className="bg-primary px-4 pt-12 pb-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{h.emoji}</span>
          <h1 className="text-xl font-bold">{h.title}</h1>
        </div>
        <p className="text-white/80 text-sm">{h.sub}</p>
      </header>

      <main>
        {tab === "search" && (
          <Suspense
            fallback={
              <div className="flex justify-center py-20">
                <div className="text-4xl animate-spin">🍳</div>
              </div>
            }
          >
            <SearchTab />
          </Suspense>
        )}
        {tab === "fridge" && <FridgeTab />}
        {tab === "favorites" && <FavoritesTab />}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex z-40">
        {TABS.map(({ id, emoji, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
              tab === id ? "text-primary" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <span className="text-xl">{emoji}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
