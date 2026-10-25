import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getFlowStatus } from "@/lib/flow";

export const dynamic = "force-dynamic";

// Webhook server-to-server que Flow llama (urlConfirmation) para confirmar
// el resultado real del pago. Aquí es donde se marca la reserva como pagada
// y se crea el bloqueo de fechas correspondiente.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const token = form.get("token")?.toString();
    if (!token) {
      return new NextResponse("Falta token", { status: 400 });
    }

    const status = await getFlowStatus(token);
    const commerceOrder = status.commerceOrder as string;
    const flowStatus = status.status as number; // 1 pendiente, 2 pagada, 3 rechazada, 4 anulada

    const { data: reserva } = await supabaseAdmin
      .from("reservas")
      .select("*")
      .eq("id", commerceOrder)
      .single();

    if (!reserva) {
      return new NextResponse("Reserva no encontrada", { status: 404 });
    }

    if (flowStatus === 2) {
      // Flow reintenta el aviso: si la reserva ya está pagada no se repite nada
      if (reserva.estado === "pagada") {
        return new NextResponse("OK", { status: 200 });
      }

      // El monto cobrado debe coincidir con el precio calculado al crear la reserva
      const montoFlow = Number(status.amount);
      if (Number.isFinite(montoFlow) && Math.round(montoFlow) !== Math.round(Number(reserva.precio_total))) {
        console.error(`[flow/confirm] Monto distinto en la orden ${commerceOrder}: Flow ${montoFlow}, reserva ${reserva.precio_total}`);
        return new NextResponse("Monto no coincide", { status: 409 });
      }

      await supabaseAdmin.from("reservas").update({ estado: "pagada" }).eq("id", commerceOrder);

      // Si las fechas ya están bloqueadas por otra reserva (dos pagos a la vez), no se duplica el bloqueo:
      // el pago queda registrado y se avisa en el registro para resolverlo a mano (devolución o cambio de fechas).
      const { data: choques } = await supabaseAdmin
        .from("fechas_bloqueadas")
        .select("id, notas")
        .eq("cabana_id", reserva.cabana_id)
        .lt("fecha_inicio", reserva.fecha_fin)
        .gt("fecha_fin", reserva.fecha_inicio);

      if (choques && choques.length > 0) {
        const esMismaOrden = choques.some((c) => String(c.notas ?? "").includes(`orden ${commerceOrder}`));
        if (!esMismaOrden) {
          console.error(`[flow/confirm] CONFLICTO DE FECHAS: la orden ${commerceOrder} se pagó pero esas fechas ya estaban bloqueadas. Requiere revisión manual.`);
        }
      } else {
        await supabaseAdmin.from("fechas_bloqueadas").insert({
          cabana_id: reserva.cabana_id,
          fecha_inicio: reserva.fecha_inicio,
          fecha_fin: reserva.fecha_fin,
          canal: "web",
          huesped_nombre: reserva.huesped_nombre,
          huesped_telefono: reserva.huesped_telefono,
          huesped_email: reserva.huesped_email,
          notas: `Reserva pagada vía Flow (orden ${commerceOrder})`,
        });
      }
    } else if (flowStatus === 3 || flowStatus === 4) {
      // Un aviso de rechazo tardío no debe pisar una reserva ya pagada
      if (reserva.estado !== "pagada") {
        await supabaseAdmin.from("reservas").update({ estado: "rechazada" }).eq("id", commerceOrder);
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch {
    return new NextResponse("Error procesando confirmación", { status: 500 });
  }
}
