import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { getPrecioNoche } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const CABANAS = ["naciente", "poniente"] as const;

function checkAuth(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return isValidSessionToken(token);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const precioNoche = await getPrecioNoche();
  return NextResponse.json({ precioNoche });
}

// Actualiza el precio base por noche de ambas cabañas a la vez (siempre iguales).
export async function PUT(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const precioNoche = Number(body.precioNoche);

  if (!Number.isInteger(precioNoche) || precioNoche <= 0) {
    return NextResponse.json({ error: "El precio debe ser un número entero mayor a 0" }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("precios_cabana")
    .upsert(CABANAS.map((cabana_id) => ({ cabana_id, precio_noche: precioNoche, updated_at: updatedAt })));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ precioNoche });
}
