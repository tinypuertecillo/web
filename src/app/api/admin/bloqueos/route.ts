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

// Cantidad de huéspedes y valor de una reserva manual. Vacío = sin dato (null); algo inválido = error.
const CAMPOS_EXTRA: { clave: string; columna: string; max: number; nombre: string }[] = [
  { clave: "adultos", columna: "adultos", max: 50, nombre: "Adultos" },
  { clave: "ninos", columna: "ninos", max: 50, nombre: "Niños" },
  { clave: "bebes", columna: "bebes", max: 50, nombre: "Bebés" },
  { clave: "mascotas", columna: "mascotas", max: 50, nombre: "Mascotas" },
  { clave: "precioTotal", columna: "precio_total", max: 100000000, nombre: "El valor" },
];
function leerExtras(body: Record<string, unknown>): { datos: Record<string, number | null>; error?: string } {
  const datos: Record<string, number | null> = {};
  for (const c of CAMPOS_EXTRA) {
    const v = body[c.clave];
    if (v === undefined) continue;
    if (v === null || v === "") {
      datos[c.columna] = null;
      continue;
    }
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > c.max) return { datos, error: `${c.nombre} no es válido. Usa un número entero desde 0.` };
    datos[c.columna] = n;
  }
  return { datos };
}
const faltaColumna = (msg: string) => /column|schema cache/i.test(msg);
const AVISO_COLUMNAS = "Falta activar los campos de huéspedes y valor en la base de datos (script supabase_reservas_manuales.sql).";

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
  const extras = leerExtras(body);
  if (extras.error) {
    return NextResponse.json({ error: extras.error }, { status: 400 });
  }
  // Los campos vacíos no se envían: así el bloqueo simple funciona aunque la base aún no tenga esas columnas
  const extrasConDato = Object.fromEntries(Object.entries(extras.datos).filter(([, v]) => v !== null));

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
      ...extrasConDato,
    })
    .select()
    .single();

  if (error) {
    console.error(`[admin/bloqueos] ${error.message}`);
    if (faltaColumna(error.message)) return NextResponse.json({ error: AVISO_COLUMNAS }, { status: 500 });
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
  const { id, huespedNombre, huespedTelefono, huespedEmail, notas, cabanaId, fechaInicio, fechaFin } = body;
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  const { data: actual, error: errActual } = await supabaseAdmin.from("fechas_bloqueadas").select("*").eq("id", id).maybeSingle();
  if (errActual) {
    console.error(`[admin/bloqueos] ${errActual.message}`);
    return NextResponse.json({ error: "No se pudo revisar la reserva" }, { status: 500 });
  }
  if (!actual) {
    return NextResponse.json({ error: "Esa reserva ya no existe" }, { status: 404 });
  }

  const cambio: Record<string, unknown> = {
    huesped_nombre: texto(huespedNombre, 120),
    huesped_telefono: texto(huespedTelefono, 40),
    huesped_email: texto(huespedEmail, 120),
    notas: texto(notas, 300),
  };

  // Huéspedes y valor: solo reservas manuales. Si la base aún no tiene las columnas, solo se rechaza si traen datos.
  if (actual.canal !== "web") {
    const extras = leerExtras(body);
    if (extras.error) {
      return NextResponse.json({ error: extras.error }, { status: 400 });
    }
    for (const [col, val] of Object.entries(extras.datos)) {
      if (col in actual) cambio[col] = val;
      else if (val !== null) return NextResponse.json({ error: AVISO_COLUMNAS }, { status: 500 });
    }
  }

  // Cabaña, fechas y canal solo se cambian en reservas manuales (Airbnb, Booking, otro); las pagadas por la web no.
  const quiereCambiarFechas = cabanaId !== undefined || fechaInicio !== undefined || fechaFin !== undefined || body.canal !== undefined;
  if (quiereCambiarFechas) {
    if (actual.canal === "web") {
      return NextResponse.json({ error: "Las fechas de una reserva pagada por la web no se cambian desde aquí." }, { status: 400 });
    }
    const cabana = cabanaId ?? actual.cabana_id;
    const ini = fechaInicio ?? actual.fecha_inicio;
    const fin = fechaFin ?? actual.fecha_fin;
    const canal = body.canal === undefined || body.canal === "" ? actual.canal : String(body.canal).toLowerCase();
    if (cabana !== "naciente" && cabana !== "poniente") {
      return NextResponse.json({ error: "Elige la cabaña" }, { status: 400 });
    }
    if (!esFechaValida(ini) || !esFechaValida(fin)) {
      return NextResponse.json({ error: "Elige la fecha de inicio y la de fin" }, { status: 400 });
    }
    if (fin <= ini) {
      return NextResponse.json({ error: "La fecha final debe ser posterior a la inicial" }, { status: 400 });
    }
    if (!CANALES_MANUALES.includes(canal)) {
      return NextResponse.json({ error: "Canal no válido" }, { status: 400 });
    }
    const { data: choques, error: errChoques } = await supabaseAdmin
      .from("fechas_bloqueadas")
      .select("fecha_inicio, fecha_fin")
      .eq("cabana_id", cabana)
      .neq("id", id)
      .lt("fecha_inicio", fin)
      .gt("fecha_fin", ini);
    if (errChoques) {
      console.error(`[admin/bloqueos] ${errChoques.message}`);
      return NextResponse.json({ error: "No se pudo revisar si esas fechas están libres. Intenta de nuevo." }, { status: 500 });
    }
    if (choques && choques.length > 0) {
      const c = choques[0];
      return NextResponse.json({ error: `Esas fechas se cruzan con otra reserva de la misma cabaña (del ${fmt(c.fecha_inicio)} al ${fmt(c.fecha_fin)}).` }, { status: 409 });
    }
    Object.assign(cambio, { cabana_id: cabana, fecha_inicio: ini, fecha_fin: fin, canal });
  }

  const { data, error } = await supabaseAdmin.from("fechas_bloqueadas").update(cambio).eq("id", id).select().single();
  if (error) {
    console.error(`[admin/bloqueos] ${error.message}`);
    return NextResponse.json({ error: "No se pudo guardar el cambio" }, { status: 500 });
  }
  return NextResponse.json({ bloqueo: data });
}
