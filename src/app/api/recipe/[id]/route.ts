import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { RecipeDetail, IngredientGroup, CookingStep } from "@/lib/types";

export const maxDuration = 30;

const BASE_URL = "https://www.10000recipe.com";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://www.google.com/",
  "Upgrade-Insecure-Requests": "1",
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

    // Title
    const title =
      $("h3.view2_summary_title").text().trim() ||
      $(".view2_summary_title").text().trim() ||
      $(".view_title_h3").text().trim() ||
      $("h3").first().text().trim();

    // Thumbnail
    const thumbnail =
      $(".thum_area img").attr("src") ||
      $(".view2_pic img").attr("src") ||
      $(".view_pic img").attr("src") ||
      $("img[class*='main']").first().attr("src") ||
      "";

    // Meta info (servings, time, difficulty)
    const servings =
      $(".view2_summary_info1 dd").text().trim() ||
      $(".view2_summary_info1").text().trim();
    const cookTime =
      $(".view2_summary_info2 dd").text().trim() ||
      $(".view2_summary_info2").text().trim();
    const difficulty =
      $(".view2_summary_info3 dd").text().trim() ||
      $(".view2_summary_info3").text().trim();

    // ── Ingredients ──────────────────────────────────────────────
    const ingredients: IngredientGroup[] = [];

    // Strategy 1: confirmed material area with groups
    $("#divConfirmedMaterialArea .cont_ingre2").each((_i, section) => {
      const groupName = $(section).find("b").first().text().trim();
      const items: string[] = [];
      $(section).find("li").each((_j, li) => {
        const name =
          $(li).find(".ingre_list_name").text().trim() ||
          $(li).find("a").first().text().trim();
        const amount =
          $(li).find(".ingre_list_ea").text().trim() ||
          $(li).find("span").text().trim();
        if (name) items.push(amount ? `${name} ${amount}` : name);
      });
      if (items.length > 0) ingredients.push({ name: groupName || "재료", items });
    });

    // Strategy 2: flat list inside confirmed material area
    if (ingredients.length === 0) {
      const items: string[] = [];
      $("#divConfirmedMaterialArea li").each((_i, li) => {
        const name =
          $(li).find(".ingre_list_name").text().trim() ||
          $(li).find("a").first().text().trim();
        const amount =
          $(li).find(".ingre_list_ea").text().trim() ||
          $(li).find("span").text().trim();
        if (name) items.push(amount ? `${name} ${amount}` : name);
      });
      if (items.length > 0) ingredients.push({ name: "재료", items });
    }

    // Strategy 3: anywhere on page
    if (ingredients.length === 0) {
      const items: string[] = [];
      $(".ingre_list_name").each((_i, el) => {
        const name = $(el).text().trim();
        const amount = $(el).next(".ingre_list_ea").text().trim();
        if (name) items.push(amount ? `${name} ${amount}` : name);
      });
      if (items.length > 0) ingredients.push({ name: "재료", items });
    }

    // ── Steps ─────────────────────────────────────────────────────
    const steps: CookingStep[] = [];

    // Strategy 1: standard step container
    $("#stepDiv .view_step_cont").each((i, el) => {
      const description =
        $(el).find(".view_step_desc").text().trim() ||
        $(el).find(".step_list_l_text").text().trim() ||
        $(el).find("p").first().text().trim();
      const imgSrc =
        $(el).find("img.step_view_thumbs_big").attr("src") ||
        $(el).find("img").first().attr("src");
      if (description) {
        steps.push({
          step: i + 1,
          description,
          image: imgSrc && imgSrc.startsWith("http") ? imgSrc : undefined,
        });
      }
    });

    // Strategy 2: step_list items
    if (steps.length === 0) {
      $(".step_list_l").each((i, el) => {
        const description =
          $(el).find(".view_step_desc").text().trim() ||
          $(el).text().trim();
        const imgSrc = $(el).siblings(".step_list_r").find("img").attr("src");
        if (description) {
          steps.push({
            step: i + 1,
            description,
            image: imgSrc && imgSrc.startsWith("http") ? imgSrc : undefined,
          });
        }
      });
    }

    // Strategy 3: any element with step class
    if (steps.length === 0) {
      $("[class*='step_cont'], [class*='step_desc']").each((i, el) => {
        const description = $(el).text().trim();
        if (description && description.length > 5) {
          steps.push({ step: i + 1, description });
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
