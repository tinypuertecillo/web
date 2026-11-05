import crypto from "crypto";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { registrarFallo, segundosDeBloqueo, limpiarFallos } from "@/lib/rateLimit";

// Códigos de descuento para huéspedes. El porcentaje, la vigencia y los usos se definen en /admin
// (tabla codigos_descuento); aquí no hay ningún valor de negocio.

// Sin letras ni números que se confundan (0/O, 1/I/L).
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function normalizarCodigo(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toUpperCase().replace(/\s+/g, "") : "";
}

export function esFormatoCodigo(codigo: string): boolean {
  return /^[A-Z0-9-]{4,24}$/.test(codigo);
}

export function generarCodigo(prefijo = "TINY"): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return `${prefijo}-${s}`;
}

// Fecha de hoy en Chile (AAAA-MM-DD): un código vale hasta el final de su último día, hora de Chile.
export function hoyChile(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
}

export type CodigoValido = { id: string; codigo: string; porcentaje: number; validoHasta: string };
export type ResultadoCodigo = { ok: true; codigo: CodigoValido } | { ok: false; error: string; status: number };

const ERROR_GENERICO = "El código no es válido, está vencido o ya se usó.";

function tablaNoExiste(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

// Busca el código y comprueba que esté activo, vigente y con usos disponibles.
export async function validarCodigo(raw: unknown): Promise<ResultadoCodigo> {
  const codigo = normalizarCodigo(raw);
  if (!esFormatoCodigo(codigo)) return { ok: false, error: ERROR_GENERICO, status: 400 };

  const { data, error } = await supabaseAdmin.from("codigos_descuento").select("*").eq("codigo", codigo).maybeSingle();
  if (error) {
    if (tablaNoExiste(error)) return { ok: false, error: "Los códigos de descuento no están disponibles por ahora.", status: 503 };
    return { ok: false, error: "No pudimos revisar el código. Intenta nuevamente.", status: 500 };
  }
  if (!data || !data.activo || data.valido_hasta < hoyChile() || data.usos >= data.usos_max) {
    return { ok: false, error: ERROR_GENERICO, status: 400 };
  }
  return { ok: true, codigo: { id: data.id, codigo: data.codigo, porcentaje: Number(data.porcentaje), validoHasta: data.valido_hasta } };
}

function claveIp(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "desconocida";
  return `codigo:${ip}`;
}

// Igual que validarCodigo, pero frena a quien prueba muchos códigos seguidos (fuerza bruta).
export async function validarCodigoConLimite(req: NextRequest, raw: unknown): Promise<ResultadoCodigo> {
  const clave = claveIp(req);
  if (segundosDeBloqueo(clave) > 0) {
    return { ok: false, error: "Demasiados intentos con códigos. Espera unos minutos e intenta de nuevo.", status: 429 };
  }
  const res = await validarCodigo(raw);
  if (res.ok) limpiarFallos(clave);
  else if (res.status === 400) registrarFallo(clave);
  return res;
}

// Suma un uso al código cuando el pago se confirma. Devuelve false si ya no le quedaban usos.
export async function usarCodigo(codigo: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("usar_codigo_descuento", { p_codigo: codigo });
  if (error) {
    console.error(`[codigos] No se pudo registrar el uso del código ${codigo}: ${error.message}`);
    return false;
  }
  return data === true;
}
