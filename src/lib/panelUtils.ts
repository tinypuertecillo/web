// Cálculos del panel de administración (Resumen, Calendario). Son funciones puras: reciben los datos
// ya cargados y devuelven lo que se muestra. No hay valores de negocio aquí.
// Las fechas son texto AAAA-MM-DD; una noche "pertenece" a su día de llegada y la fecha de salida no se cuenta.

export type CabanaId = "naciente" | "poniente";

export type Bloqueo = {
  id: string;
  cabana_id: CabanaId;
  fecha_inicio: string;
  fecha_fin: string;
  canal: string;
  huesped_nombre: string | null;
  huesped_telefono: string | null;
  huesped_email: string | null;
  notas: string | null;
  // Solo en reservas ingresadas a mano (Airbnb, Booking u otro)
  adultos?: number | null;
  ninos?: number | null;
  bebes?: number | null;
  mascotas?: number | null;
  precio_total?: number | null;
};

export type ReservaPanel = {
  id: string;
  cabana_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  noches: number;
  precio_total: number;
  huesped_nombre: string | null;
  huesped_email: string | null;
  huesped_telefono: string | null;
  estado: string;
  created_at: string;
  adultos: number | null;
  ninos: number | null;
  bebes: number | null;
  mascotas: number | null;
  codigo_descuento: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const CABANAS: { id: CabanaId; label: string }[] = [
  { id: "naciente", label: "Naciente" },
  { id: "poniente", label: "Poniente" },
];

export const nombreCabana = (id: string) => (id === "naciente" ? "Naciente" : id === "poniente" ? "Poniente" : id);

export function msDe(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isoDeMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// Fecha de hoy en Chile (AAAA-MM-DD).
export function hoyChile(ahora: Date = new Date()): string {
  return ahora.toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
}

export function sumarDias(fecha: string, n: number): string {
  return isoDeMs(msDe(fecha) + n * DAY_MS);
}

export function diasEntre(a: string, b: string): number {
  return Math.round((msDe(b) - msDe(a)) / DAY_MS);
}

// Lunes de la semana de esa fecha.
export function lunesDe(fecha: string): string {
  const dia = new Date(msDe(fecha)).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, -((dia + 6) % 7));
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export const nombreMes = (fecha: string) => MESES[Number(fecha.slice(5, 7)) - 1];
export const diaSemanaLargo = (fecha: string) => DIAS_LARGO[new Date(msDe(fecha)).getUTCDay()];
export const diaSemanaCorto = (fecha: string) => DIAS_CORTO[new Date(msDe(fecha)).getUTCDay()];

// "2026-11-12" -> "12 de noviembre"
export function fechaLarga(fecha: string): string {
  return `${Number(fecha.slice(8, 10))} de ${nombreMes(fecha)}`;
}

// "2026-11-12" -> "jueves 12 de noviembre de 2026"
export function fechaCompleta(fecha: string): string {
  return `${diaSemanaLargo(fecha)} ${fechaLarga(fecha)} de ${fecha.slice(0, 4)}`;
}

// "2026-11-12" -> "12 nov"
export function fechaCorta(fecha: string): string {
  return `${Number(fecha.slice(8, 10))} ${nombreMes(fecha).slice(0, 3)}`;
}

// "2026-11-18" y "2026-11-21" -> "18 al 21 de noviembre" (o "28 de noviembre al 2 de diciembre")
export function rangoFechas(inicio: string, fin: string): string {
  if (inicio.slice(0, 7) === fin.slice(0, 7)) return `${Number(inicio.slice(8, 10))} al ${fechaLarga(fin)}`;
  return `${fechaLarga(inicio)} al ${fechaLarga(fin)}`;
}

// "2026-11-18" y "2026-11-21" -> "18 al 21 nov"; entre meses: "28 nov al 2 dic"
export function rangoCorto(inicio: string, fin: string): string {
  if (inicio.slice(0, 7) === fin.slice(0, 7)) return `${Number(inicio.slice(8, 10))} al ${fechaCorta(fin)}`;
  return `${fechaCorta(inicio)} al ${fechaCorta(fin)}`;
}

// "Matías Fuentes" -> "M. Fuentes"; un solo nombre queda igual; vacío -> "Sin nombre".
export function nombreCorto(nombre: string | null | undefined): string {
  const partes = (nombre ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Sin nombre";
  if (partes.length === 1) return partes[0];
  return `${partes[0][0].toUpperCase()}. ${partes[partes.length - 1]}`;
}

export const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export type CanalClase = "web" | "air" | "bok" | "oth";

export function claseCanal(canal: string): CanalClase {
  const c = canal.toLowerCase();
  return c === "web" ? "web" : c === "airbnb" ? "air" : c === "booking" ? "bok" : "oth";
}

export const etiquetaCanal = (canal: string) => {
  const c = canal.toLowerCase();
  return c === "web" ? "Web" : c === "airbnb" ? "Airbnb" : c === "booking" ? "Booking" : "Otro";
};

// Noches ocupadas (por cabaña, sin repetir) dentro de [desde, hasta) -> cantidad.
export function nochesOcupadas(bloqueos: Bloqueo[], desde: string, hastaExcl: string): number {
  const ocupadas = new Set<string>();
  for (const b of bloqueos) {
    const ini = b.fecha_inicio > desde ? b.fecha_inicio : desde;
    const fin = b.fecha_fin < hastaExcl ? b.fecha_fin : hastaExcl;
    for (let ms = msDe(ini); ms < msDe(fin); ms += DAY_MS) ocupadas.add(`${b.cabana_id}|${isoDeMs(ms)}`);
  }
  return ocupadas.size;
}

// Ocupación del mes de "hoy": noches ocupadas sobre noches posibles de las dos cabañas.
export function ocupacionMes(bloqueos: Bloqueo[], hoy: string, cantidadCabanas = CABANAS.length) {
  const inicio = `${hoy.slice(0, 7)}-01`;
  const [y, m] = hoy.split("-").map(Number);
  const dias = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const fin = sumarDias(inicio, dias);
  const ocupadas = nochesOcupadas(bloqueos, inicio, fin);
  const total = dias * cantidadCabanas;
  return { ocupadas, total, pct: total > 0 ? Math.round((ocupadas / total) * 100) : 0, mes: nombreMes(hoy) };
}

export type Movimiento = {
  fecha: string;
  tipo: "llega" | "sale";
  cabana: string;
  nombre: string;
  noches: number;
  canal: string;
};

// Llegadas y salidas de los próximos `dias` días (incluye hoy), en orden.
export function movimientos(bloqueos: Bloqueo[], hoy: string, dias: number): Movimiento[] {
  const hasta = sumarDias(hoy, dias);
  const lista: Movimiento[] = [];
  for (const b of bloqueos) {
    const base = { cabana: b.cabana_id, nombre: nombreCorto(b.huesped_nombre), noches: diasEntre(b.fecha_inicio, b.fecha_fin), canal: b.canal };
    if (b.fecha_inicio >= hoy && b.fecha_inicio < hasta) lista.push({ ...base, fecha: b.fecha_inicio, tipo: "llega" });
    if (b.fecha_fin >= hoy && b.fecha_fin < hasta) lista.push({ ...base, fecha: b.fecha_fin, tipo: "sale" });
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.tipo === b.tipo ? 0 : a.tipo === "sale" ? -1 : 1) || a.cabana.localeCompare(b.cabana));
}

export function llegadasProximas(bloqueos: Bloqueo[], hoy: string, dias: number) {
  const hasta = sumarDias(hoy, dias + 1);
  const lista = bloqueos.filter((b) => b.fecha_inicio >= hoy && b.fecha_inicio < hasta);
  return { total: lista.length, porCanal: lista.reduce<Record<string, number>>((acc, b) => ((acc[b.canal] = (acc[b.canal] || 0) + 1), acc), {}) };
}

// Reservas pagadas cuyas fechas chocan con un bloqueo que no es el suyo: hay que resolverlas a mano.
export function conflictos(reservas: ReservaPanel[], bloqueos: Bloqueo[], hoy: string): ReservaPanel[] {
  return reservas.filter(
    (r) =>
      r.estado === "pagada" &&
      r.fecha_fin >= hoy &&
      bloqueos.some(
        (b) => b.cabana_id === r.cabana_id && b.fecha_inicio < r.fecha_fin && b.fecha_fin > r.fecha_inicio && !(b.notas ?? "").includes(`orden ${r.id}`)
      )
  );
}

// ¿La reserva se creó dentro del tiempo para pagar? Se comparan instantes (las horas pueden venir con distinto huso).
export function dentroDeRetencion(creada: string, vigenteDesde: string): boolean {
  const c = new Date(creada).getTime();
  const v = new Date(vigenteDesde).getTime();
  return Number.isFinite(c) && Number.isFinite(v) && c >= v;
}

// Pagos que siguen dentro del tiempo para pagar, con los minutos que les quedan.
export function pagosEnCurso(reservas: ReservaPanel[], vigenteDesde: string, retencionMinutos: number, ahora: number = Date.now()) {
  return reservas
    .filter((r) => r.estado === "pendiente" && dentroDeRetencion(r.created_at, vigenteDesde))
    .map((r) => ({ reserva: r, minutos: Math.max(1, Math.ceil(retencionMinutos - (ahora - new Date(r.created_at).getTime()) / 60000)) }));
}

// Lo cobrado por la web en el mes de "hoy" (reservas pagadas creadas ese mes, hora de Chile).
export function cobradoWebMes(reservas: ReservaPanel[], hoy: string) {
  const mes = hoy.slice(0, 7);
  const lista = reservas.filter((r) => r.estado === "pagada" && hoyChile(new Date(r.created_at)).slice(0, 7) === mes);
  return { total: lista.reduce((acc, r) => acc + Number(r.precio_total || 0), 0), cantidad: lista.length };
}

export type BarraLinea = {
  clave: string;
  cabana: string;
  inicioCol: number; // columna desde 1 dentro de la ventana
  span: number;
  clase: CanalClase | "wait";
  titulo: string;
  detalle: string;
};

// Barras de la línea de tiempo: la ventana son `dias` días desde `desde`. Las reservas en pago se dibujan aparte.
export function barrasLinea(
  bloqueos: Bloqueo[],
  pagos: { reserva: ReservaPanel; minutos: number }[],
  desde: string,
  dias: number
): BarraLinea[] {
  const hastaExcl = sumarDias(desde, dias);
  const barras: BarraLinea[] = [];
  const agregar = (clave: string, cabana: string, ini: string, fin: string, clase: BarraLinea["clase"], titulo: string, detalle: (n: number) => string) => {
    if (fin <= desde || ini >= hastaExcl) return;
    const a = ini > desde ? ini : desde;
    const z = fin < hastaExcl ? fin : hastaExcl;
    const span = diasEntre(a, z);
    if (span <= 0) return;
    barras.push({ clave, cabana, inicioCol: diasEntre(desde, a) + 1, span, clase, titulo, detalle: detalle(diasEntre(ini, fin)) });
  };
  for (const b of bloqueos) {
    agregar(`b${b.id}`, b.cabana_id, b.fecha_inicio, b.fecha_fin, claseCanal(b.canal), b.huesped_nombre ? nombreCorto(b.huesped_nombre) : etiquetaCanal(b.canal), (n) => plural(n, "noche", "noches"));
  }
  for (const p of pagos) {
    agregar(`p${p.reserva.id}`, p.reserva.cabana_id, p.reserva.fecha_inicio, p.reserva.fecha_fin, "wait", "En pago", () => `${p.minutos} min`);
  }
  return barras;
}
