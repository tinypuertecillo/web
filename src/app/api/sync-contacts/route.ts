import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase local (Tiny Puertecillo)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente Supabase externo (Ecomoving) para resolver cuentas en tiempo real
const ecoUrl = 'https://xgdmyjzyejjmwdqkufhp.supabase.co';
const ecoKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZG15anp5ZWpqbXdkcWt1ZmhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MTk0MTgsImV4cCI6MjA3OTM5NTQxOH0.WtEIZ324jxd5ymXJ6RwdXfqFc_qM6UAKJ-ONkbL2J4E';
const ecoSupabase = createClient(ecoUrl, ecoKey);

const SYNC_SECRET = process.env.SYNC_SECRET;

export async function POST(request: Request) {
    try {
        // 1. Validar autenticación
        const authHeader = request.headers.get('x-sync-secret');
        if (SYNC_SECRET && authHeader !== SYNC_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await request.json();
        const { type, record, old_record } = payload;

        console.log(`[Sync Contacts Webhook] Event Type: ${type}`);

        if (type === 'DELETE') {
            const emailToDelete = old_record?.correo;
            if (!emailToDelete) {
                return NextResponse.json({ error: 'Missing correo in old_record' }, { status: 400 });
            }

            console.log(`Deleting contact: ${emailToDelete}`);
            const { error } = await supabase
                .from('contactos')
                .delete()
                .eq('correo', emailToDelete.trim().toLowerCase());

            if (error) throw error;
            return NextResponse.json({ success: true, message: 'Contact deleted successfully' });
        }

        if (type === 'INSERT' || type === 'UPDATE') {
            const { nombre, correo, celular, estado, cuenta_id } = record;

            if (!nombre || !correo) {
                return NextResponse.json({ error: 'Missing nombre or correo in record' }, { status: 400 });
            }

            console.log(`Processing contact: ${correo} (${nombre})`);

            // Resolver empresa y ciudad de Ecomoving en tiempo real por cuenta_id
            let empresaName = null;
            let ciudadName = null;

            if (cuenta_id) {
                console.log(`Resolving company details for account ID: ${cuenta_id}`);
                const { data: acct } = await ecoSupabase
                    .from('cuentas')
                    .select('cliente, ciudad')
                    .eq('id', cuenta_id)
                    .maybeSingle();

                if (acct) {
                    empresaName = acct.cliente;
                    ciudadName = acct.ciudad;
                    console.log(`Resolved: ${empresaName} - ${ciudadName}`);
                }
            }

            // Realizar Upsert en la base de datos de Tiny Puertecillo
            const { error } = await supabase
                .from('contactos')
                .upsert({
                    nombre: nombre.trim(),
                    correo: correo.trim().toLowerCase(),
                    celular: celular || null,
                    estado: estado || 'activo',
                    etapa: 'marketing',
                    empresa: empresaName,
                    ciudad: ciudadName,
                    // Si es nuevo, inicia en Etapa 1
                    ...(type === 'INSERT' && { etapa_envio: 1 })
                }, { onConflict: 'correo' });

            if (error) throw error;
            return NextResponse.json({ success: true, message: `Contact ${type.toLowerCase()}ed and synchronized successfully` });
        }

        return NextResponse.json({ error: 'Unknown event type' }, { status: 400 });
    } catch (error: any) {
        console.error('[Sync Contacts Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
