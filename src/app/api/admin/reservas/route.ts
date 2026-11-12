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
