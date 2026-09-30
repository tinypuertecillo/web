import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { esFechaValida } from "@/lib/pricing";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  return isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

function parseBody(body: Record<string, unknown>) {
  const { fechaInicio, fechaFin, nombre } = body;
  const precioNoche = Number(body.precioNoche);
  if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin) || fechaFin < fechaInicio) {
    return { error: "Fechas inválidas (la fecha final no puede ser anterior a la inicial)" };
  }
  if (!Number.isInteger(precioNoche) || precioNoche <= 0) {
    return { error: "El precio debe ser un número entero mayor a 0" };
  }
  return {
    row: {
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      precio_noche: precioNoche,
      nombre: typeof nombre === "string" && nombre.trim() ? nombre.trim() : null,
    },
  };
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin.from("tarifas_fecha").select("*").order("fecha_inicio", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tarifas: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const parsed = parseBody(await req.json().catch(() => ({})));
  if (!parsed.row) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.from("tarifas_fecha").insert(parsed.row).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tarifa: data });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body.id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }
  const parsed = parseBody(body);
  if (!parsed.row) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.from("tarifas_fecha").update(parsed.row).eq("id", body.id).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tarifa: data });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("tarifas_fecha").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
