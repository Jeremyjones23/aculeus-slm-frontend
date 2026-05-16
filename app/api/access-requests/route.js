import { NextResponse } from "next/server";
import { saveAccessRequest } from "@/lib/aculeus-product-store.js";

export async function POST(request) {
  const body = await request.json();
  const item = await saveAccessRequest(body);
  return NextResponse.json({ ok: true, request: item });
}
