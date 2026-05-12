import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const TTL_SECONDS = 60 * 60 * 24 * 90; // 90일

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash 환경변수가 설정되지 않았습니다.");
  return new Redis({ url, token });
}

function fridgeKey(code: string) {
  return `fridge:${code.toLowerCase().trim()}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!code) return NextResponse.json({ ingredients: [] });

  try {
    const redis = getRedis();
    const ingredients = (await redis.get<string[]>(fridgeKey(code))) ?? [];
    return NextResponse.json({ ingredients });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: `DB 연결 실패: ${message}` },
      { status: 503 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!code) return NextResponse.json({ error: "코드가 없습니다." }, { status: 400 });

  try {
    const { ingredients } = await request.json();
    if (!Array.isArray(ingredients)) {
      return NextResponse.json({ error: "잘못된 형식입니다." }, { status: 400 });
    }
    const redis = getRedis();
    await redis.set(fridgeKey(code), ingredients, { ex: TTL_SECONDS });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json(
      { error: `DB 연결 실패: ${message}` },
      { status: 503 }
    );
  }
}
