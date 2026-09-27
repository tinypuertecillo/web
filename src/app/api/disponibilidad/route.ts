import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Endpoint público de solo lectura: entrega únicamente los rangos de fechas
// ocupadas por cabaña, sin ningún dato del huésped (nombre, teléfono, email).
// Usa la service role key en el servidor para no depender de una policy RLS
// pública sobre la tabla fechas_bloqueadas (que sí contiene datos de huéspedes).
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("fechas_bloqueadas")
    .select("cabana_id, fecha_inicio, fecha_fin")
    .order("fecha_inicio", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bloqueos: data ?? [] });
}
