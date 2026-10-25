// Límite de intentos fallidos en memoria. En Vercel cada instancia lleva su propia cuenta,
// así que frena la fuerza bruta sencilla pero no es un límite global exacto.

type Registro = { intentos: number; desde: number };

const registros = new Map<string, Registro>();

const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;

function vigente(clave: string, ahora: number) {
  const r = registros.get(clave);
  if (!r) return null;
  if (ahora - r.desde > VENTANA_MS) {
    registros.delete(clave);
    return null;
  }
  return r;
}

// Segundos que faltan para poder reintentar; 0 si no está bloqueado.
export function segundosDeBloqueo(clave: string, ahora = Date.now()) {
  const r = vigente(clave, ahora);
  if (!r || r.intentos < MAX_INTENTOS) return 0;
  return Math.ceil((r.desde + VENTANA_MS - ahora) / 1000);
}

export function registrarFallo(clave: string, ahora = Date.now()) {
  const r = vigente(clave, ahora);
  if (r) r.intentos += 1;
  else registros.set(clave, { intentos: 1, desde: ahora });
}

export function limpiarFallos(clave: string) {
  registros.delete(clave);
}
