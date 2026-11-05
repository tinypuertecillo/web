import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { esFormatoCodigo, generarCodigo, hoyChile, normalizarCodigo } from "@/lib/codigos";
import { esFechaValida } from "@/lib/pricingCore";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  return isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

const SIN_TABLA = "Falta crear la tabla de códigos. Ejecuta supabase_codigos_descuento.sql en Supabase.";

function tablaNoExiste(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

// Lista los códigos (los más nuevos primero).
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("codigos_descuento").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) {
    if (tablaNoExiste(error)) return NextResponse.json({ error: SIN_TABLA, sinTabla: true }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ codigos: data ?? [], hoy: hoyChile() });
}

// Crea uno o varios códigos con el mismo porcentaje y vigencia. El código se genera solo (TINY-XXXXX)
// salvo que se escriba uno propio (solo cuando se crea uno).
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const porcentaje = Number(body.porcentaje);
  if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje >= 100) {
    return NextResponse.json({ error: "El porcentaje debe ser mayor a 0 y menor a 100" }, { status: 400 });
  }
  const validoHasta = body.validoHasta;
  if (!esFechaValida(validoHasta) || validoHasta < hoyChile()) {
    return NextResponse.json({ error: "Elige una fecha de vigencia que no haya pasado" }, { status: 400 });
  }
  const usosMax = body.usosMax === undefined || body.usosMax === "" ? 1 : Number(body.usosMax);
  if (!Number.isInteger(usosMax) || usosMax < 1 || usosMax > 1000) {
    return NextResponse.json({ error: "Los usos deben ser un número entero entre 1 y 1000" }, { status: 400 });
  }
  const cantidad = body.cantidad === undefined || body.cantidad === "" ? 1 : Number(body.cantidad);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 50) {
    return NextResponse.json({ error: "La cantidad debe ser un número entero entre 1 y 50" }, { status: 400 });
  }
  const nota = typeof body.nota === "string" && body.nota.trim() ? body.nota.trim().slice(0, 200) : null;

  const propio = normalizarCodigo(body.codigo);
  if (propio && (cantidad !== 1 || !esFormatoCodigo(propio))) {
    return NextResponse.json({ error: "Un código propio debe tener entre 4 y 24 letras, números o guiones, y se crea de a uno" }, { status: 400 });
  }

  const creados = [];
  for (let i = 0; i < cantidad; i++) {
    let fila = null;
    // Si el código generado ya existe (muy poco probable), se prueba con otro
    for (let intento = 0; intento < 6 && !fila; intento++) {
      const { data, error } = await supabaseAdmin
        .from("codigos_descuento")
        .insert({ codigo: propio || generarCodigo(), porcentaje, valido_hasta: validoHasta, usos_max: usosMax, nota })
        .select()
        .single();
      if (!error) {
        fila = data;
      } else if (tablaNoExiste(error)) {
        return NextResponse.json({ error: SIN_TABLA, sinTabla: true }, { status: 503 });
      } else if (error.code === "23505") {
        if (propio) return NextResponse.json({ error: "Ese código ya existe" }, { status: 409 });
      } else {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    if (!fila) return NextResponse.json({ error: "No se pudo generar un código nuevo. Intenta otra vez." }, { status: 500 });
    creados.push(fila);
  }
  return NextResponse.json({ codigos: creados });
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
