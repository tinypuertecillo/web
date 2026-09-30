import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { getCapacidades } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const CABANAS = ["naciente", "poniente"] as const;

function checkAuth(req: NextRequest) {
  return isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ capacidad: await getCapacidades() });
}

// Guarda el máximo de huéspedes (adultos + niños; los bebés no cuentan) y de mascotas por cabaña.
export async function PUT(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const capacidad = body.capacidad ?? {};

  for (const cabana of CABANAS) {
    const maxHuespedes = Number(capacidad[cabana]?.maxHuespedes);
    const maxMascotas = Number(capacidad[cabana]?.maxMascotas);
    if (!Number.isInteger(maxHuespedes) || maxHuespedes < 1 || maxHuespedes > 50) {
      return NextResponse.json({ error: `Máximo de huéspedes inválido en ${cabana}` }, { status: 400 });
    }
    if (!Number.isInteger(maxMascotas) || maxMascotas < 0 || maxMascotas > 50) {
      return NextResponse.json({ error: `Máximo de mascotas inválido en ${cabana}` }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from("precios_cabana")
      .update({ max_huespedes: maxHuespedes, max_mascotas: maxMascotas })
      .eq("cabana_id", cabana);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ capacidad: await getCapacidades() });
}
