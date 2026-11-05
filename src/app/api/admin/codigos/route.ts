import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { generarCodigo, hoyChile, normalizarCelular } from "@/lib/codigos";
import { esFechaValida } from "@/lib/pricingCore";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  return isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

const SIN_TABLA = "Falta crear la tabla de códigos. Ejecuta supabase_codigos_descuento.sql en Supabase.";
const SIN_CELULAR = "Falta agregar el celular a los códigos. Ejecuta supabase_codigos_celular.sql en Supabase.";

function tablaNoExiste(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

// Columna celular que todavía no existe (Postgres 42703 o PostgREST PGRST204)
function faltaColumnaCelular(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" || error?.code === "PGRST204" || (!!error?.message && error.message.includes("celular"));
}

// Lista los códigos pedidos (los más nuevos primero).
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("codigos_descuento").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) {
    if (tablaNoExiste(error)) return NextResponse.json({ error: SIN_TABLA, sinTabla: true }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ codigos: data ?? [], hoy: hoyChile() });
}

// Genera el código de una persona: formato fijo TINY-XXXXX, un solo uso, asociado a su celular.
// Si ese celular ya tiene un código vigente sin usar, no se crea otro: se devuelve el que ya tiene.
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const celular = normalizarCelular(body.celular);
  if (!celular) {
    return NextResponse.json({ error: "Escribe un celular chileno válido (9 dígitos, que parta con 9)" }, { status: 400 });
  }
  const porcentaje = Number(body.porcentaje);
  if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje >= 100) {
    return NextResponse.json({ error: "El porcentaje debe ser mayor a 0 y menor a 100" }, { status: 400 });
  }
  const validoHasta = body.validoHasta;
  if (!esFechaValida(validoHasta) || validoHasta < hoyChile()) {
    return NextResponse.json({ error: "Elige una fecha de vigencia que no haya pasado" }, { status: 400 });
  }
  const nota = typeof body.nota === "string" && body.nota.trim() ? body.nota.trim().slice(0, 200) : null;

  // ¿Ya tiene un código vigente sin usar?
  const { data: previos, error: errPrevios } = await supabaseAdmin
    .from("codigos_descuento")
    .select("*")
    .eq("celular", celular)
    .eq("activo", true)
    .gte("valido_hasta", hoyChile())
    .order("created_at", { ascending: false });
  if (errPrevios) {
    if (tablaNoExiste(errPrevios)) return NextResponse.json({ error: SIN_TABLA, sinTabla: true }, { status: 503 });
    if (faltaColumnaCelular(errPrevios)) return NextResponse.json({ error: SIN_CELULAR, sinTabla: true }, { status: 503 });
    return NextResponse.json({ error: errPrevios.message }, { status: 500 });
  }
  const vigente = (previos ?? []).find((p) => p.usos < p.usos_max);
  if (vigente) {
    return NextResponse.json({ error: "Este celular ya tiene un código vigente sin usar.", existente: vigente }, { status: 409 });
  }

  // Si el código generado ya existe (muy poco probable), se prueba con otro
  for (let intento = 0; intento < 6; intento++) {
    const { data, error } = await supabaseAdmin
      .from("codigos_descuento")
      .insert({ codigo: generarCodigo(), porcentaje, valido_hasta: validoHasta, usos_max: 1, nota, celular })
      .select()
      .single();
    if (!error) return NextResponse.json({ codigo: data });
    if (tablaNoExiste(error)) return NextResponse.json({ error: SIN_TABLA, sinTabla: true }, { status: 503 });
    if (faltaColumnaCelular(error)) return NextResponse.json({ error: SIN_CELULAR, sinTabla: true }, { status: 503 });
    if (error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ error: "No se pudo generar un código nuevo. Intenta otra vez." }, { status: 500 });
}

// Activa o desactiva un código (no se borran: queda el registro de usos).
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, activo } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || typeof activo !== "boolean") {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.from("codigos_descuento").update({ activo }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ codigo: data });
}
