import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { RecipeSummary } from "@/lib/types";

export const maxDuration = 30;

const BASE_URL = "https://www.10000recipe.com";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  Referer: "https://www.google.com/",
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "Upgrade-Insecure-Requests": "1",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ingredients = searchParams.get("ingredients") || "";
  const debug = searchParams.get("debug") === "1";

  if (!ingredients.trim()) {
    return NextResponse.json({ recipes: [] });
  }

  const query = ingredients.trim().split(",").join(" ");
  const searchUrl = `${BASE_URL}/recipe/list.html?q=${encodeURIComponent(query)}`;

  let html = "";
  let statusCode = 0;

  try {
    const res = await fetch(searchUrl, {
      headers: FETCH_HEADERS,
      redirect: "follow",
    });

    statusCode = res.status;

    if (!res.ok) {
      return NextResponse.json({
        error: `만개의레시피 접근 실패 (HTTP ${statusCode})`,
        recipes: [],
        debug: debug ? { statusCode, url: searchUrl } : undefined,
      });
    }

    html = await res.text();
  } catch (err) {
    return NextResponse.json({
      error: "네트워크 오류가 발생했습니다.",
      recipes: [],
      debug: debug ? { err: String(err) } : undefined,
    });
  }

  const $ = cheerio.load(html);
  const recipes: RecipeSummary[] = [];

  // 현재 페이지에서 어떤 클래스가 있는지 파악
  const listSelectors = [
    ".common_sp_list_li",
    ".recipe_list li",
    ".cont_box li",
    "[class*='recipe_list'] li",
    "[class*='sp_list'] li",
  ];

  let usedSelector = "";
  for (const sel of listSelectors) {
    if ($(sel).length > 0) {
      usedSelector = sel;
      break;
    }
  }

  if (usedSelector) {
    $(usedSelector).each((i, el) => {
      if (i >= 12) return false;

      // 링크/ID 추출: 다양한 패턴 시도
      const href =
        $(el).find("a[href*='/recipe/']").first().attr("href") ||
        $(el).find("a").first().attr("href") ||
        "";
      const idMatch = href.match(/\/recipe\/(\d+)/);
      const id = idMatch ? idMatch[1] : href.split("/").filter(Boolean).pop() || "";

      // 제목 추출
      const title =
        $(el).find(".common_sp_caption_tit").text().trim() ||
        $(el).find("[class*='caption_tit']").text().trim() ||
        $(el).find("[class*='title']").text().trim() ||
        $(el).find("a").first().text().trim();

      // 썸네일
      const thumbnail =
        $(el).find("img").attr("src") ||
        $(el).find("img").attr("data-src") ||
        "";

      const description =
        $(el).find(".common_sp_caption_desc").text().trim() ||
        $(el).find("[class*='desc']").text().trim();
      const author =
        $(el).find(".common_sp_caption_writer").text().trim() ||
        $(el).find("[class*='writer']").text().trim();

      if (!id || !title) return;

      recipes.push({
        id,
        title,
        thumbnail: thumbnail.startsWith("http")
          ? thumbnail
          : thumbnail ? `${BASE_URL}${thumbnail}` : "",
        description,
        author,
        url: `${BASE_URL}/recipe/${id}`,
      });
    });
  }

  if (debug) {
    // 디버그 모드: 파싱 정보 함께 반환
    const allClasses: string[] = [];
    $("[class]").each((_, el) => {
      const cls = $(el).attr("class") || "";
      cls.split(/\s+/).forEach((c) => {
        if (c && !allClasses.includes(c)) allClasses.push(c);
      });
    });

    return NextResponse.json({
      recipes,
      debug: {
        statusCode,
        htmlSize: html.length,
        url: searchUrl,
        usedSelector,
        selectorCounts: Object.fromEntries(
          listSelectors.map((s) => [s, $(s).length])
        ),
        sampleHtml: html.slice(0, 2000),
        classesFound: allClasses.filter((c) =>
          c.toLowerCase().includes("recipe") ||
          c.toLowerCase().includes("list") ||
          c.toLowerCase().includes("sp_")
        ).slice(0, 50),
      },
    });
  }

  return NextResponse.json(
    { recipes },
    { headers: { "Cache-Control": "s-maxage=300" } }
  );
}
