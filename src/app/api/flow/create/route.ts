import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createFlowPayment } from "@/lib/flow";

export const dynamic = "force-dynamic";

const CABIN_LABEL: Record<string, string> = {
  naciente: "Tiny House Naciente",
  poniente: "Tiny House Poniente",
};

const PRICE_PER_NIGHT = 65000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cabanaId, fechaInicio, fechaFin, nombre, email, telefono } = body as {
      cabanaId: string;
      fechaInicio: string;
      fechaFin: string;
      nombre: string;
      email: string;
      telefono?: string;
    };

    if (!cabanaId || !fechaInicio || !fechaFin || !nombre || !email) {
      return NextResponse.json({ error: "Faltan datos de la reserva" }, { status: 400 });
    }

    const noches = Math.round(
      (new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (noches <= 0) {
      return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
    }

    // Verificar que las fechas no se traslapen con un bloqueo existente
    const { data: choques } = await supabaseAdmin
      .from("fechas_bloqueadas")
      .select("id")
      .eq("cabana_id", cabanaId)
      .lt("fecha_inicio", fechaFin)
      .gt("fecha_fin", fechaInicio);

    if (choques && choques.length > 0) {
      return NextResponse.json({ error: "Esas fechas ya no están disponibles" }, { status: 409 });
    }

    const precioTotal = noches * PRICE_PER_NIGHT;

    const { data: reserva, error: insertError } = await supabaseAdmin
      .from("reservas")
      .insert({
        cabana_id: cabanaId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        noches,
        precio_total: precioTotal,
        huesped_nombre: nombre,
        huesped_email: email,
        huesped_telefono: telefono || null,
        estado: "pendiente",
      })
      .select()
      .single();

    if (insertError || !reserva) {
      return NextResponse.json({ error: insertError?.message || "No se pudo crear la reserva" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    try {
      const flowRes = await createFlowPayment({
        commerceOrder: reserva.id,
        subject: `Reserva ${CABIN_LABEL[cabanaId] || cabanaId} (${noches} noches)`,
        amount: precioTotal,
        email,
        urlConfirmation: `${siteUrl}/api/flow/confirm`,
        urlReturn: `${siteUrl}/api/flow/return`,
      });

      await supabaseAdmin
        .from("reservas")
        .update({ flow_token: flowRes.token, flow_order: String(flowRes.flowOrder ?? "") })
        .eq("id", reserva.id);

      const redirectUrl = `${flowRes.url}?token=${flowRes.token}`;
      return NextResponse.json({ redirectUrl });
    } catch (flowError) {
      const message = flowError instanceof Error ? flowError.message : "Error al conectar con Flow";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
}
