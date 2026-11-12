// Correos de reservas (confirmación al huésped y aviso al dueño) por Brevo.
// Ningún dato de negocio va en el código: la clave, el remitente y la dirección de aviso vienen de
// variables de entorno. Si falta alguna, el correo no se envía y se deja el motivo en el registro:
// un problema de correo nunca debe impedir que una reserva pagada quede registrada.
//
//   BREVO_API_KEY          clave de la cuenta Brevo de Tiny (la pone el dueño en Vercel)
//   EMAIL_FROM             remitente verificado en Brevo (el mismo que usa la app de contactos)
//   EMAIL_FROM_NAME        nombre del remitente (opcional)
//   EMAIL_AVISO_RESERVAS   dirección que recibe el aviso de cada reserva pagada
import { WHATSAPP_URL } from "@/lib/links";

export type DatosReserva = {
  id: string;
  cabana_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  noches: number;
  precio_total: number;
  huesped_nombre: string | null;
  huesped_email: string | null;
  huesped_telefono: string | null;
  adultos?: number | null;
  ninos?: number | null;
  bebes?: number | null;
  mascotas?: number | null;
  codigo_descuento?: string | null;
};

const CABANA: Record<string, string> = {
  naciente: "Tiny House Naciente",
  poniente: "Tiny House Poniente",
};

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmtCLP = (n: number) => "$" + Math.round(Number(n)).toLocaleString("es-CL");
const fmtFecha = (f: string) => {
  const [y, m, d] = f.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

function personas(r: DatosReserva) {
  if (r.adultos === null || r.adultos === undefined) return "";
  const p = [`${r.adultos} ${r.adultos === 1 ? "adulto" : "adultos"}`];
  if (r.ninos) p.push(`${r.ninos} ${r.ninos === 1 ? "niño" : "niños"}`);
  if (r.bebes) p.push(`${r.bebes} ${r.bebes === 1 ? "bebé" : "bebés"}`);
  if (r.mascotas) p.push(`${r.mascotas} ${r.mascotas === 1 ? "mascota" : "mascotas"}`);
  return p.join(", ");
}

type Destinatario = { email: string; name?: string };

// Envía un correo transaccional. Devuelve true si Brevo lo aceptó; nunca lanza error.
async function enviar(para: Destinatario, asunto: string, html: string, texto: string, responderA?: Destinatario): Promise<boolean> {
  const clave = process.env.BREVO_API_KEY?.trim();
  const remitente = process.env.EMAIL_FROM?.trim();
  if (!clave || !remitente) {
    console.error("[correo] No se envió: faltan BREVO_API_KEY o EMAIL_FROM en las variables de entorno.");
    return false;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "api-key": clave },
      body: JSON.stringify({
        sender: { email: remitente, name: process.env.EMAIL_FROM_NAME?.trim() || "Tiny Puertecillo" },
        to: [para],
        ...(responderA ? { replyTo: responderA } : {}),
        subject: asunto,
        htmlContent: html,
        textContent: texto,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      console.error(`[correo] Brevo respondió ${res.status} al enviar "${asunto}": ${detalle.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[correo] No se pudo enviar "${asunto}": ${e instanceof Error ? e.message : "error desconocido"}`);
    return false;
  }
}

function filasHtml(filas: [string, string][]) {
  return filas
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#6b6b6b;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:600">${esc(v)}</td></tr>`)
    .join("");
}

function envoltorio(titulo: string, cuerpo: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f7f5f0;font-family:Arial,Helvetica,sans-serif;color:#1d1b16">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#964828;font-weight:700">Tiny Puertecillo</div>
<h1 style="font-size:22px;margin:8px 0 18px;color:#163428">${esc(titulo)}</h1>
<div style="background:#ffffff;border-radius:12px;padding:22px">${cuerpo}</div>
</div></body></html>`;
}

// Confirmación al huésped cuando su pago ya está confirmado.
export async function enviarConfirmacionHuesped(r: DatosReserva): Promise<boolean> {
  if (!r.huesped_email) return false;
  const nombre = (r.huesped_nombre || "").trim();
  const cabana = CABANA[r.cabana_id] || r.cabana_id;
  const filas: [string, string][] = [
    ["Cabaña", cabana],
    ["Llegada", fmtFecha(r.fecha_inicio)],
    ["Salida", fmtFecha(r.fecha_fin)],
    ["Noches", String(r.noches)],
    ["Huéspedes", personas(r)],
    ["Código de descuento", r.codigo_descuento || ""],
    ["Total pagado", fmtCLP(r.precio_total)],
    ["N.º de reserva", r.id.slice(0, 8).toUpperCase()],
  ];
  const html = envoltorio(
    "¡Reserva confirmada!",
    `<p style="margin:0 0 16px">${nombre ? `Hola ${esc(nombre.split(" ")[0])}, ` : ""}recibimos tu pago y tu reserva quedó confirmada.</p>
<table style="border-collapse:collapse;font-size:15px">${filasHtml(filas)}</table>
<p style="margin:20px 0 0;font-size:14px;color:#3a3a3a">Si tienes dudas, escríbenos por <a href="${esc(WHATSAPP_URL)}" style="color:#163428;font-weight:600">WhatsApp</a> o responde este correo.</p>`
  );
  const texto = [
    nombre ? `Hola ${nombre.split(" ")[0]}, recibimos tu pago y tu reserva quedó confirmada.` : "Recibimos tu pago y tu reserva quedó confirmada.",
    "",
    ...filas.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    "",
    `Si tienes dudas, escríbenos por WhatsApp (${WHATSAPP_URL}) o responde este correo.`,
  ].join("\n");
  const avisoA = process.env.EMAIL_AVISO_RESERVAS?.trim();
  return enviar({ email: r.huesped_email, name: nombre || undefined }, `Reserva confirmada · ${cabana} · ${r.fecha_inicio}`, html, texto, avisoA ? { email: avisoA } : undefined);
}

// Aviso al dueño: cada reserva pagada, y si hay un choque de fechas que requiere atención.
export async function enviarAvisoDueno(r: DatosReserva, conflicto: boolean): Promise<boolean> {
  const destino = process.env.EMAIL_AVISO_RESERVAS?.trim();
  if (!destino) {
    console.error("[correo] No se envió el aviso al dueño: falta EMAIL_AVISO_RESERVAS en las variables de entorno.");
    return false;
  }
  const cabana = CABANA[r.cabana_id] || r.cabana_id;
  const filas: [string, string][] = [
    ["Cabaña", cabana],
    ["Llegada", fmtFecha(r.fecha_inicio)],
    ["Salida", fmtFecha(r.fecha_fin)],
    ["Noches", String(r.noches)],
    ["Huésped", r.huesped_nombre || ""],
    ["Celular", r.huesped_telefono || ""],
    ["Correo", r.huesped_email || ""],
    ["Personas", personas(r)],
    ["Código de descuento", r.codigo_descuento || ""],
    ["Total pagado", fmtCLP(r.precio_total)],
    ["N.º de reserva", r.id],
  ];
  const alerta = conflicto
    ? `<p style="margin:0 0 16px;padding:12px;border-radius:8px;background:#fdecea;color:#8a1c12;font-weight:700">ATENCIÓN: esas fechas ya estaban ocupadas por otra reserva. Este pago hay que devolverlo o cambiarlo de fechas.</p>`
    : "";
  const html = envoltorio(conflicto ? "Pago con choque de fechas" : "Nueva reserva pagada", `${alerta}<table style="border-collapse:collapse;font-size:15px">${filasHtml(filas)}</table>`);
  const texto = [conflicto ? "ATENCIÓN: esas fechas ya estaban ocupadas por otra reserva. Hay que devolver el pago o cambiarlo de fechas." : "Nueva reserva pagada.", "", ...filas.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)].join("\n");
  return enviar({ email: destino }, `${conflicto ? "⚠ CHOQUE DE FECHAS · " : "Nueva reserva · "}${cabana} · ${r.fecha_inicio}`, html, texto);
}
