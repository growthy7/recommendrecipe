export interface RecipeSummary {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
  url: string;
  author?: string;
  likes?: string;
}

export interface RecipeDetail {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  servings?: string;
  cookTime?: string;
  difficulty?: string;
  ingredients: IngredientGroup[];
  steps: CookingStep[];
}

export interface IngredientGroup {
  name: string;
  items: string[];
}

export interface CookingStep {
  step: number;
  description: string;
  image?: string;
}

export interface IngredientCategory {
  name: string;
  emoji: string;
  items: string[];
}

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  {
    name: "채소",
    emoji: "🥦",
    items: ["당근", "감자", "양파", "브로콜리", "시금치", "애호박", "버섯", "파프리카", "토마토", "오이", "파", "마늘"],
  },
  {
    name: "고기/달걀",
    emoji: "🥚",
    items: ["달걀", "닭고기", "돼지고기", "소고기", "두부", "콩나물"],
  },
  {
    name: "해산물",
    emoji: "🦐",
    items: ["새우", "연어", "참치캔", "게맛살", "멸치", "조개"],
  },
  {
    name: "유제품",
    emoji: "🧀",
    items: ["우유", "치즈", "버터", "요거트"],
  },
  {
    name: "곡류/면",
    emoji: "🍚",
    items: ["쌀", "파스타", "국수", "감자"],
  },
];
