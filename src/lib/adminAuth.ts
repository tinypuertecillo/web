import crypto from "crypto";

const COOKIE_NAME = "tp_admin_session";

function secret() {
  const clave = process.env.ADMIN_PASSWORD;
  if (!clave) {
    throw new Error("Falta la variable de entorno ADMIN_PASSWORD");
  }
  return clave;
}

function tokenFor(dayStamp: string) {
  return crypto.createHash("sha256").update(`${secret()}:${dayStamp}`).digest("hex");
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function checkAdminPassword(password: string) {
  // Se comparan los hash para que el tiempo de respuesta no dependa de cuántos caracteres coinciden
  const hash = (s: string) => crypto.createHash("sha256").update(s).digest();
  return crypto.timingSafeEqual(hash(password), hash(secret()));
}

export function makeSessionToken() {
  return tokenFor(todayStamp());
}

export function isValidSessionToken(token: string | undefined | null) {
  if (!token) return false;
  // válido durante el día actual o el anterior, para no cerrar sesión a medianoche
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const stamps = [today.toISOString().slice(0, 10), yesterday.toISOString().slice(0, 10)];
  return stamps.some((s) => tokenFor(s) === token);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
