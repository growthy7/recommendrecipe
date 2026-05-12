import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const KEY_PREFIX = "fridge:";
const TTL_SECONDS = 60 * 60 * 24 * 90; // 90일

function fridgeKey(code: string) {
  return `${KEY_PREFIX}${code.toLowerCase().trim()}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!code) return NextResponse.json({ ingredients: [] });

  try {
    const ingredients = (await kv.get<string[]>(fridgeKey(code))) ?? [];
    return NextResponse.json({ ingredients });
  } catch {
    return NextResponse.json(
      { error: "KV 연결 실패. Vercel KV가 설정되지 않았습니다." },
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
    await kv.set(fridgeKey(code), ingredients, { ex: TTL_SECONDS });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "KV 연결 실패. Vercel KV가 설정되지 않았습니다." },
      { status: 503 }
    );
  }
}
