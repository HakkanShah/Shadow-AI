import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/constants";

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
