import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { RETENCION_MINUTOS } from "@/lib/retencion";

export const dynamic = "force-dynamic";

// Lista las reservas hechas en el sitio (las más nuevas primero), con su estado de pago. Solo lectura.
export async function GET(req: NextRequest) {
  if (!isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("reservas")
    .select("id, cabana_id, fecha_inicio, fecha_fin, noches, precio_total, huesped_nombre, huesped_email, huesped_telefono, estado, created_at, adultos, ninos, bebes, mascotas, codigo_descuento")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error(`[admin/reservas] ${error.message}`);
    return NextResponse.json({ error: "No se pudieron cargar las reservas" }, { status: 500 });
  }
  // Una reserva pendiente deja de retener fechas (y Flow deja de aceptar el pago) pasado este tiempo
  const limite = new Date(Date.now() - RETENCION_MINUTOS * 60 * 1000).toISOString();
  return NextResponse.json({ reservas: data ?? [], pendienteVigenteDesde: limite, retencionMinutos: RETENCION_MINUTOS });
}

// Elimina una reserva (pensado para limpiar las de prueba). Una que se está pagando ahora no se puede borrar,
// y una pagada solo se borra si se confirma; en ese caso también se liberan sus fechas.
export async function DELETE(req: NextRequest) {
  if (!isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }

  const { data: r, error: errR } = await supabaseAdmin
    .from("reservas")
    .select("id, cabana_id, fecha_inicio, fecha_fin, estado, created_at")
    .eq("id", id)
    .maybeSingle();
  if (errR) {
    console.error(`[admin/reservas] ${errR.message}`);
    return NextResponse.json({ error: "No se pudo revisar la reserva" }, { status: 500 });
  }
  if (!r) {
    return NextResponse.json({ error: "Esa reserva ya no existe" }, { status: 404 });
  }

  const limite = Date.now() - RETENCION_MINUTOS * 60 * 1000;
  if (r.estado === "pendiente" && new Date(r.created_at).getTime() >= limite) {
    return NextResponse.json({ error: "Esta reserva se está pagando ahora. Espera unos minutos y vuelve a intentar." }, { status: 409 });
  }
  if (r.estado === "pagada" && req.nextUrl.searchParams.get("confirmarPagada") !== "1") {
    return NextResponse.json({ error: "Esta reserva está pagada. Confirma que quieres eliminarla." }, { status: 409 });
  }

  // Una reserva pagada tiene su bloqueo de fechas (canal web): se libera junto con ella
  if (r.estado === "pagada") {
    const { error: errB } = await supabaseAdmin
      .from("fechas_bloqueadas")
      .delete()
      .eq("cabana_id", r.cabana_id)
      .eq("fecha_inicio", r.fecha_inicio)
      .eq("fecha_fin", r.fecha_fin)
      .eq("canal", "web");
    if (errB) {
      console.error(`[admin/reservas] ${errB.message}`);
      return NextResponse.json({ error: "No se pudieron liberar las fechas. No se eliminó la reserva." }, { status: 500 });
    }
  }

  const { error } = await supabaseAdmin.from("reservas").delete().eq("id", id);
  if (error) {
    console.error(`[admin/reservas] ${error.message}`);
    return NextResponse.json({ error: "No se pudo eliminar la reserva. Intenta de nuevo." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Corrige los datos de contacto de una reserva hecha en la web (las fechas y el pago no se tocan).
export async function PATCH(req: NextRequest) {
  if (!isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { id, huespedNombre, huespedTelefono, huespedEmail } = body;
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }
  const t = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const datos = { huesped_nombre: t(huespedNombre, 120), huesped_telefono: t(huespedTelefono, 40), huesped_email: t(huespedEmail, 120) };

  const { data, error } = await supabaseAdmin
    .from("reservas")
    .update(datos)
    .eq("id", id)
    .select("id, cabana_id, fecha_inicio, fecha_fin, estado")
    .single();
  if (error) {
    console.error(`[admin/reservas] ${error.message}`);
    return NextResponse.json({ error: "No se pudo guardar el cambio" }, { status: 500 });
  }
  // Si está pagada, el bloqueo de fechas de la web guarda una copia de los datos del huésped: se mantiene igual
  if (data.estado === "pagada") {
    await supabaseAdmin
      .from("fechas_bloqueadas")
      .update(datos)
      .eq("cabana_id", data.cabana_id)
      .eq("fecha_inicio", data.fecha_inicio)
      .eq("fecha_fin", data.fecha_fin)
      .eq("canal", "web");
  }
  return NextResponse.json({ ok: true });
}
