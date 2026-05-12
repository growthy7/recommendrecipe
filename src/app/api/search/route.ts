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

  if (!ingredients.trim()) {
    return NextResponse.json({ recipes: [] });
  }

  const query = ingredients.trim().split(",").join(" ");
  const searchUrl = `${BASE_URL}/recipe/list.html?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(searchUrl, {
      headers: FETCH_HEADERS,
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "레시피를 가져오는데 실패했습니다.", recipes: [] },
        { status: 502 }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const recipes: RecipeSummary[] = [];

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

        const href =
          $(el).find("a[href*='/recipe/']").first().attr("href") ||
          $(el).find("a").first().attr("href") ||
          "";
        const idMatch = href.match(/\/recipe\/(\d+)/);
        const id = idMatch ? idMatch[1] : href.split("/").filter(Boolean).pop() || "";

        const title =
          $(el).find(".common_sp_caption_tit").text().trim() ||
          $(el).find("[class*='caption_tit']").text().trim() ||
          $(el).find("[class*='title']").text().trim() ||
          $(el).find("a").first().text().trim();

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

    return NextResponse.json(
      { recipes },
      { headers: { "Cache-Control": "s-maxage=300" } }
    );
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다.", recipes: [] },
      { status: 500 }
    );
  }
}
