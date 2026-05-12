import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { RecipeSummary } from "@/lib/types";

export const maxDuration = 30;

const BASE_URL = "https://www.10000recipe.com";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: "https://www.10000recipe.com/",
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
    const res = await fetch(searchUrl, { headers: FETCH_HEADERS });
    if (!res.ok) {
      return NextResponse.json(
        { error: "레시피를 가져오는데 실패했습니다." },
        { status: 502 }
      );
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const recipes: RecipeSummary[] = [];

    $(".common_sp_list_li").each((i, el) => {
      if (i >= 12) return false;

      const anchor = $(el).find("a.common_sp_link");
      const href = anchor.attr("href") || "";
      const id = href.split("/").filter(Boolean).pop() || "";
      const title = $(el).find(".common_sp_caption_tit").text().trim();
      const thumbnail =
        $(el).find("img.common_sp_img").attr("src") ||
        $(el).find("img").attr("src") ||
        "";
      const description = $(el).find(".common_sp_caption_desc").text().trim();
      const author = $(el).find(".common_sp_caption_writer").text().trim();
      const likes = $(el).find(".common_sp_caption_like").text().trim();

      if (!id || !title) return;

      recipes.push({
        id,
        title,
        thumbnail: thumbnail.startsWith("http")
          ? thumbnail
          : `${BASE_URL}${thumbnail}`,
        description,
        author,
        likes,
        url: `${BASE_URL}/recipe/${id}`,
      });
    });

    return NextResponse.json({ recipes }, { headers: { "Cache-Control": "s-maxage=300" } });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
