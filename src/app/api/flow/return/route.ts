import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Flow redirige aquí al navegador del huésped (POST) después del pago.
// El estado real ya se procesó en /api/flow/confirm; esto solo decide a
// qué pantalla mandar al usuario.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = form.get("token")?.toString();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  if (!token) {
    return NextResponse.redirect(`${siteUrl}/reservar`);
  }

  const { data: reserva } = await supabaseAdmin
    .from("reservas")
    .select("id, estado")
    .eq("flow_token", token)
    .single();

  if (reserva?.estado === "pagada") {
    return NextResponse.redirect(`${siteUrl}/reservar/gracias?estado=pagada`);
  }
  return NextResponse.redirect(`${siteUrl}/reservar/gracias?estado=pendiente`);
}

export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  return NextResponse.redirect(`${siteUrl}/reservar`);
}
