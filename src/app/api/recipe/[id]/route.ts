import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { RecipeDetail, IngredientGroup, CookingStep } from "@/lib/types";

export const maxDuration = 30;

const BASE_URL = "https://www.10000recipe.com";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://www.10000recipe.com/",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "잘못된 레시피 ID입니다." }, { status: 400 });
  }

  const recipeUrl = `${BASE_URL}/recipe/${id}`;

  try {
    const res = await fetch(recipeUrl, { headers: FETCH_HEADERS });
    if (!res.ok) {
      return NextResponse.json(
        { error: "레시피를 가져오는데 실패했습니다." },
        { status: 502 }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const title =
      $(".view2_summary_title").text().trim() ||
      $("h3.view_summary_title").text().trim() ||
      $(".view_title_h3").text().trim() ||
      $("h3").first().text().trim();

    const thumbnail =
      $(".view_pic img").attr("src") ||
      $(".view2_pic img").attr("src") ||
      $(".main_pic img").attr("src") ||
      "";

    const infoItems = $(".view2_summary_info1, .view2_summary_info2, .view2_summary_info3");
    const servings = infoItems.eq(0).text().trim();
    const cookTime = infoItems.eq(1).text().trim();
    const difficulty = infoItems.eq(2).text().trim();

    // Parse ingredients
    const ingredients: IngredientGroup[] = [];
    const defaultGroup: IngredientGroup = { name: "재료", items: [] };

    $("#divConfirmedMaterialArea .cont_ingre2").each((_i, section) => {
      const groupName = $(section).find("b").text().trim();
      const items: string[] = [];
      $(section)
        .find(".ingre_list_name")
        .each((_j, item) => {
          const name = $(item).text().trim();
          const amount = $(item).next(".ingre_list_ea").text().trim();
          if (name) items.push(amount ? `${name} ${amount}` : name);
        });
      if (items.length > 0) {
        ingredients.push({ name: groupName || "재료", items });
      }
    });

    // Fallback ingredient parsing
    if (ingredients.length === 0) {
      $(".ingre_list_name").each((_i, el) => {
        const name = $(el).text().trim();
        const amount = $(el).next(".ingre_list_ea").text().trim();
        if (name) defaultGroup.items.push(amount ? `${name} ${amount}` : name);
      });
      if (defaultGroup.items.length > 0) ingredients.push(defaultGroup);
    }

    // Parse cooking steps
    const steps: CookingStep[] = [];
    $("#stepDiv .view_step_cont").each((i, el) => {
      const description = $(el).find(".view_step_desc").text().trim() ||
        $(el).find("p").text().trim();
      const image =
        $(el).find("img.step_view_thumbs_big").attr("src") ||
        $(el).find("img").attr("src");
      if (description) {
        steps.push({
          step: i + 1,
          description,
          image: image && image.startsWith("http") ? image : undefined,
        });
      }
    });

    // Fallback step parsing
    if (steps.length === 0) {
      $(".step_list_l").each((i, el) => {
        const description = $(el).find(".step_list_l_text").text().trim() ||
          $(el).text().trim();
        const image = $(el).find("img").attr("src");
        if (description) {
          steps.push({
            step: i + 1,
            description,
            image: image && image.startsWith("http") ? image : undefined,
          });
        }
      });
    }

    const recipe: RecipeDetail = {
      id,
      title,
      url: recipeUrl,
      thumbnail: thumbnail.startsWith("http")
        ? thumbnail
        : thumbnail ? `${BASE_URL}${thumbnail}` : "",
      servings,
      cookTime,
      difficulty,
      ingredients,
      steps,
    };

    return NextResponse.json(
      { recipe },
      { headers: { "Cache-Control": "s-maxage=3600" } }
    );
  } catch (err) {
    console.error("Recipe fetch error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
