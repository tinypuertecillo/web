import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { esFechaValida } from "@/lib/pricingCore";

export const dynamic = "force-dynamic";

// Canales que se pueden bloquear a mano. "web" lo crea solo el pago de Flow.
const CANALES_MANUALES = ["airbnb", "booking", "otro"];

function checkAuth(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return isValidSessionToken(token);
}

const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const fmt = (f: string) => f.split("-").reverse().join("-");

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("fechas_bloqueadas")
    .select("*")
    .order("fecha_inicio", { ascending: true });

  if (error) {
    console.error(`[admin/bloqueos] ${error.message}`);
    return NextResponse.json({ error: "No se pudieron cargar las fechas bloqueadas" }, { status: 500 });
  }
  return NextResponse.json({ bloqueos: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { cabanaId, fechaInicio, fechaFin, huespedNombre, huespedTelefono, huespedEmail, notas } = body;
  const canal = body.canal === undefined || body.canal === "" ? "airbnb" : String(body.canal).toLowerCase();

  if (cabanaId !== "naciente" && cabanaId !== "poniente") {
    return NextResponse.json({ error: "Elige la cabaña" }, { status: 400 });
  }
  if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin)) {
    return NextResponse.json({ error: "Elige la fecha de inicio y la de fin" }, { status: 400 });
  }
  if (fechaFin <= fechaInicio) {
    return NextResponse.json({ error: "La fecha final debe ser posterior a la inicial" }, { status: 400 });
  }
  if (!CANALES_MANUALES.includes(canal)) {
    return NextResponse.json({ error: "Canal no válido" }, { status: 400 });
  }

  // No se bloquea encima de otra reserva o bloqueo de la misma cabaña
  const { data: choques, error: errChoques } = await supabaseAdmin
    .from("fechas_bloqueadas")
    .select("fecha_inicio, fecha_fin, canal")
    .eq("cabana_id", cabanaId)
    .lt("fecha_inicio", fechaFin)
    .gt("fecha_fin", fechaInicio);
  if (errChoques) {
    console.error(`[admin/bloqueos] ${errChoques.message}`);
    return NextResponse.json({ error: "No se pudo revisar si esas fechas están libres. Intenta de nuevo." }, { status: 500 });
  }
  if (choques && choques.length > 0) {
    const c = choques[0];
    return NextResponse.json(
      { error: `Esas fechas se cruzan con otra reserva de la misma cabaña (del ${fmt(c.fecha_inicio)} al ${fmt(c.fecha_fin)}). Revisa la lista de fechas bloqueadas.` },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("fechas_bloqueadas")
    .insert({
      cabana_id: cabanaId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      canal,
      huesped_nombre: texto(huespedNombre, 120),
      huesped_telefono: texto(huespedTelefono, 40),
      huesped_email: texto(huespedEmail, 120),
      notas: texto(notas, 300),
    })
    .select()
    .single();

  if (error) {
    console.error(`[admin/bloqueos] ${error.message}`);
    return NextResponse.json({ error: "No se pudo bloquear la fecha. Intenta de nuevo." }, { status: 500 });
  }
  return NextResponse.json({ bloqueo: data });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  // Un bloqueo de la web es una reserva ya pagada: solo se borra si se confirma expresamente
  const { data: fila, error: errFila } = await supabaseAdmin.from("fechas_bloqueadas").select("id, canal").eq("id", id).maybeSingle();
  if (errFila) {
    console.error(`[admin/bloqueos] ${errFila.message}`);
    return NextResponse.json({ error: "No se pudo revisar el bloqueo" }, { status: 500 });
  }
  if (!fila) {
    return NextResponse.json({ error: "Ese bloqueo ya no existe" }, { status: 404 });
  }
  if (fila.canal === "web" && req.nextUrl.searchParams.get("confirmarWeb") !== "1") {
    return NextResponse.json({ error: "Este bloqueo es una reserva pagada por la web. Confirma que quieres liberar esas fechas." }, { status: 409 });
  }

  const { error } = await supabaseAdmin.from("fechas_bloqueadas").delete().eq("id", id);
  if (error) {
    console.error(`[admin/bloqueos] ${error.message}`);
    return NextResponse.json({ error: "No se pudo desbloquear. Intenta de nuevo." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { id, huespedNombre, huespedTelefono, huespedEmail, notas } = body;
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("fechas_bloqueadas")
    .update({
      huesped_nombre: texto(huespedNombre, 120),
      huesped_telefono: texto(huespedTelefono, 40),
      huesped_email: texto(huespedEmail, 120),
      notas: texto(notas, 300),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error(`[admin/bloqueos] ${error.message}`);
    return NextResponse.json({ error: "No se pudo guardar el cambio" }, { status: 500 });
  }
  return NextResponse.json({ bloqueo: data });
}
