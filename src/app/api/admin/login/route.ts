import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, makeSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { limpiarFallos, registrarFallo, segundosDeBloqueo } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";

  const espera = segundosDeBloqueo(ip);
  if (espera > 0) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(espera) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!checkAdminPassword(password)) {
    registrarFallo(ip);
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  limpiarFallos(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, makeSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 día
  });
  return res;
}
