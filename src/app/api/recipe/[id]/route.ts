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

// 레이지 로딩 대응: src → data-src → data-original → data-lazy-src 순서로 시도
// base64 placeholder 및 빈 값은 제외하고 절대 URL로 변환
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveImg($imgs: cheerio.Cheerio<any>): string | undefined {
  let result = "";
  $imgs.each((_, el) => {
    const attrs = el.attribs ?? {};
    const raw =
      attrs["src"] || attrs["data-src"] || attrs["data-original"] ||
      attrs["data-lazy-src"] || attrs["data-img-src"] || "";

    if (!raw || raw.startsWith("data:")) return; // placeholder 건너뜀

    if (raw.startsWith("//")) { result = `https:${raw}`; return false; }
    if (!raw.startsWith("http")) { result = `${BASE_URL}${raw}`; return false; }
    result = raw;
    return false;
  });
  return result || undefined;
}

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

    // ── 제목 ──────────────────────────────────────────────────────
    const title =
      $("h3.view2_summary_title").text().trim() ||
      $(".view2_summary_title").text().trim() ||
      $(".view_title_h3").text().trim() ||
      $("h3").first().text().trim();

    // ── 대표 이미지 (레이지 로딩 포함) ────────────────────────────
    const thumbnail =
      resolveImg($(".thum_area img")) ||
      resolveImg($(".view2_pic img")) ||
      resolveImg($(".view_pic img")) ||
      resolveImg($("img[class*='main_img']")) ||
      "";

    // ── 메타 정보 ─────────────────────────────────────────────────
    const servings =
      $(".view2_summary_info1 dd").text().trim() ||
      $(".view2_summary_info1").text().trim();
    const cookTime =
      $(".view2_summary_info2 dd").text().trim() ||
      $(".view2_summary_info2").text().trim();
    const difficulty =
      $(".view2_summary_info3 dd").text().trim() ||
      $(".view2_summary_info3").text().trim();

    // ── 재료 ──────────────────────────────────────────────────────
    const ingredients: IngredientGroup[] = [];

    // Strategy 1: 그룹별 재료 영역
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

    // Strategy 2: 그룹 없이 단일 목록
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

    // Strategy 3: 페이지 전체에서 재료 클래스 검색
    if (ingredients.length === 0) {
      const items: string[] = [];
      $(".ingre_list_name").each((_i, el) => {
        const name = $(el).text().trim();
        const amount = $(el).next(".ingre_list_ea").text().trim();
        if (name) items.push(amount ? `${name} ${amount}` : name);
      });
      if (items.length > 0) ingredients.push({ name: "재료", items });
    }

    // ── 조리 순서 (단계별 이미지 포함) ────────────────────────────
    const steps: CookingStep[] = [];

    // Strategy 1: 표준 step 컨테이너
    $("#stepDiv .view_step_cont").each((i, el) => {
      const description =
        $(el).find(".view_step_desc").text().trim() ||
        $(el).find(".step_list_l_text").text().trim() ||
        $(el).find("p").first().text().trim();

      // step_list_r 안의 이미지 (레이지 로딩 포함)
      const image =
        resolveImg($(el).find(".step_list_r img")) ||
        resolveImg($(el).find("img.step_view_thumbs_big")) ||
        resolveImg($(el).find("img"));

      if (description) {
        steps.push({ step: i + 1, description, image });
      }
    });

    // Strategy 2: step_list_l 기반
    if (steps.length === 0) {
      $(".step_list_l").each((i, el) => {
        const description =
          $(el).find(".view_step_desc").text().trim() ||
          $(el).text().trim();
        const image = resolveImg($(el).siblings(".step_list_r").find("img"));
        if (description) {
          steps.push({ step: i + 1, description, image });
        }
      });
    }

    // Strategy 3: step 관련 클래스 최후 시도
    if (steps.length === 0) {
      $("[class*='step_cont']").each((i, el) => {
        const description = $(el).find("[class*='step_desc']").text().trim() ||
          $(el).text().trim();
        const image = resolveImg($(el).find("img"));
        if (description && description.length > 5) {
          steps.push({ step: i + 1, description, image });
        }
      });
    }

    const recipe: RecipeDetail = {
      id,
      title,
      url: recipeUrl,
      thumbnail,
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
