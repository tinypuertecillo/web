import crypto from "crypto";

const COOKIE_NAME = "tp_admin_session";

function secret() {
  return process.env.ADMIN_PASSWORD || "tinypuertecillo-admin-2026";
}

function tokenFor(dayStamp: string) {
  return crypto.createHash("sha256").update(`${secret()}:${dayStamp}`).digest("hex");
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function checkAdminPassword(password: string) {
  return password === secret();
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
