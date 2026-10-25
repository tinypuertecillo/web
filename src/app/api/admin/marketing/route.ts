import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Lecturas y escrituras de la página /marketing. Van por el servidor con la sesión de admin:
// las tablas de prospección ya no se tocan desde el navegador con la llave pública.

function checkAuth(req: NextRequest) {
  return isValidSessionToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

const NO_AUTORIZADO = () => NextResponse.json({ error: "No autorizado" }, { status: 401 });
const ID_VALIDO = /^[0-9a-fA-F-]{8,64}$/;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(valor: unknown, max: number) {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio.slice(0, max) : null;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NO_AUTORIZADO();
  const recurso = req.nextUrl.searchParams.get("recurso");

  if (recurso === "contactos") {
    const todos: unknown[] = [];
    const lote = 1000;
    for (let desde = 0; ; desde += lote) {
      const { data, error } = await supabaseAdmin
        .from("contactos")
        .select("*")
        .ilike("estado", "activo")
        .range(desde, desde + lote - 1);
      if (error) return NextResponse.json({ error: "No se pudieron leer los contactos" }, { status: 500 });
      todos.push(...(data ?? []));
      if (!data || data.length < lote) break;
    }
    return NextResponse.json({ contactos: todos });
  }

  if (recurso === "mensajes") {
    const { data, error } = await supabaseAdmin
      .from("marketing")
      .select("*")
      .order("nombre_envio", { ascending: true });
    if (error) return NextResponse.json({ error: "No se pudo leer la biblioteca" }, { status: 500 });
    return NextResponse.json({ mensajes: data ?? [] });
  }

  if (recurso === "trazabilidad") {
    const { data, error } = await supabaseAdmin
      .from("trazabilidad_correos")
      .select("id, email, fecha, estado, mensaje_id, created_at, contactos ( nombre )")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return NextResponse.json({ error: "No se pudo leer la trazabilidad" }, { status: 500 });
    return NextResponse.json({ logs: data ?? [] });
  }

  return NextResponse.json({ error: "Recurso no válido" }, { status: 400 });
}

// Agrega un contacto nuevo a la secuencia de marketing.
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NO_AUTORIZADO();
  const body = await req.json().catch(() => ({}));

  const nombre = texto(body.nombre, 200);
  const correo = texto(body.correo, 254)?.toLowerCase() ?? null;
  if (!nombre || !correo) {
    return NextResponse.json({ error: "Nombre y Correo son campos requeridos." }, { status: 400 });
  }
  if (!CORREO_VALIDO.test(correo)) {
    return NextResponse.json({ error: "El correo no tiene un formato válido." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("contactos").insert([
    {
      nombre,
      correo,
      celular: texto(body.celular, 50),
      empresa: texto(body.empresa, 200),
      ciudad: texto(body.ciudad, 100),
      estado: "activo",
      etapa: "marketing",
      etapa_envio: 1,
    },
  ]);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "El correo ingresado ya existe en la base de datos." }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al guardar el contacto." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Edita la empresa de un contacto o la imagen de un mensaje.
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return NO_AUTORIZADO();
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" && ID_VALIDO.test(body.id) ? body.id : null;
  if (!id) return NextResponse.json({ error: "Id no válido" }, { status: 400 });

  if (body.recurso === "contactos") {
    const { error } = await supabaseAdmin
      .from("contactos")
      .update({ empresa: texto(body.empresa, 200) })
      .eq("id", id);
    if (error) return NextResponse.json({ error: "No se pudo actualizar la empresa." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.recurso === "mensajes") {
    const url = texto(body.imagen_url, 1000);
    if (url && !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: "La URL de la imagen debe empezar con http:// o https://" }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from("marketing").update({ imagen_url: url ?? "" }).eq("id", id);
    if (error) return NextResponse.json({ error: "No se pudo guardar la URL." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Recurso no válido" }, { status: 400 });
}
