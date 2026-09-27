import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return isValidSessionToken(token);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin
    .from("fechas_bloqueadas")
    .select("*")
    .order("fecha_inicio", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ bloqueos: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const { cabanaId, fechaInicio, fechaFin, huespedNombre, huespedTelefono, huespedEmail, notas } = body;

  if (!cabanaId || !fechaInicio || !fechaFin) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("fechas_bloqueadas")
    .insert({
      cabana_id: cabanaId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      canal: "airbnb",
      huesped_nombre: huespedNombre || null,
      huesped_telefono: huespedTelefono || null,
      huesped_email: huespedEmail || null,
      notas: notas || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const { error } = await supabaseAdmin.from("fechas_bloqueadas").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const { id, huespedNombre, huespedTelefono, huespedEmail, notas } = body;
  if (!id) {
    return NextResponse.json({ error: "Falta id" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("fechas_bloqueadas")
    .update({
      huesped_nombre: huespedNombre ?? null,
      huesped_telefono: huespedTelefono ?? null,
      huesped_email: huespedEmail ?? null,
      notas: notas ?? null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ bloqueo: data });
}
