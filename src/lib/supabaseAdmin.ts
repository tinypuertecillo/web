import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Faltan variables de entorno de Supabase (service role)");
}

// Cliente server-side con la service role key: se usa SOLO en rutas de API
// (nunca en el navegador) porque evita RLS. Sirve para leer/escribir datos
// que no deben quedar expuestos con la anon key, como los datos de huéspedes.
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});
