import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { getConfigPrecios } from "@/lib/pricing";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  return isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { descuentoPct, precioFinSemana } = await getConfigPrecios();
  return NextResponse.json({ descuentoPct, precioFinSemana });
}

// Guarda el % de descuento y el precio de fin de semana (vie y sáb; null = sin tarifa especial).
export async function PUT(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  // Los campos omitidos conservan su valor actual (cada formulario del admin guarda solo el suyo).
  const actual = await getConfigPrecios();
  const descuentoPct = body.descuentoPct === undefined ? actual.descuentoPct : Number(body.descuentoPct ?? 0);
  const finSemanaRaw = body.precioFinSemana === undefined ? actual.precioFinSemana : body.precioFinSemana;
  const precioFinSemana = finSemanaRaw === null || finSemanaRaw === "" ? null : Number(finSemanaRaw);

  if (!Number.isFinite(descuentoPct) || descuentoPct < 0 || descuentoPct >= 100) {
    return NextResponse.json({ error: "El descuento debe estar entre 0 y 99,99" }, { status: 400 });
  }
  if (precioFinSemana !== null && (!Number.isInteger(precioFinSemana) || precioFinSemana <= 0)) {
    return NextResponse.json({ error: "El precio de fin de semana debe ser un entero mayor a 0" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("ajustes_precios").upsert({
    id: 1,
    descuento_pct: descuentoPct,
    precio_fin_semana: precioFinSemana,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ descuentoPct, precioFinSemana });
}
