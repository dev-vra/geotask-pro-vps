import { clearAuthCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logout realizado" });
  response.headers.set("Set-Cookie", clearAuthCookie());
  return response;
}
