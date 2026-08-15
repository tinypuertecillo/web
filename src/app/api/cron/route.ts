import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Configuración de la base de datos Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const CRON_SECRET = process.env.CRON_SECRET!;

const BREVO_DAILY_LIMIT = 300;
const DELAY_BETWEEN_EMAILS_MS = 100;

function parsearFecha(fechaStr: string | null): Date | null {
    if (!fechaStr) return null;
    return new Date(fechaStr);
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getFechaChile(): string {
    const options: any = { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" };
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    const parts = formatter.formatToParts(new Date());
    
    const yearStr = parts.find(p => p.type === "year")?.value!;
    const monthStr = parts.find(p => p.type === "month")?.value!;
    const dayStr = parts.find(p => p.type === "day")?.value!;
    return `${yearStr}-${monthStr}-${dayStr}`;
}

function esDiaLaboral(): { esLaboral: boolean; mensaje: string; fecha: string } {
    const fechaChile = getFechaChile();
    const nativeDateChile = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));
    const dw = nativeDateChile.getDay();
    
    // 0 = Domingo, 6 = Sábado
    if (dw === 0 || dw === 6) {
        return {
            esLaboral: false,
            mensaje: 'Fin de semana. Envíos suspendidos.',
            fecha: fechaChile
        };
    }

    return { esLaboral: true, mensaje: 'Día laboral', fecha: fechaChile };
}

function sumarDiasHabiles(fecha: Date, diasASumar: number): Date {
    const nuevaFecha = new Date(fecha.getTime());
    let diasContados = 0;
    while (diasContados < diasASumar) {
        nuevaFecha.setDate(nuevaFecha.getDate() + 1);
        const ds = nuevaFecha.getDay();
        if (ds !== 0 && ds !== 6) {
            diasContados++;
        }
    }
    return nuevaFecha;
}

async function ejecutarMarketing(maxEmails: number): Promise<{
    processed: number;
    sent: number;
    errors: string[];
}> {
    const report = { processed: 0, sent: 0, errors: [] as string[] };

    if (maxEmails <= 0) return report;

    try {
        const today = getFechaChile(); 

        const { data: contacts, error: contactError } = await supabase
            .from('contactos')
            .select('*')
            .eq('etapa', 'marketing')
            .ilike('estado', 'activo')
            .or(`proximo_envio.lte.${today},proximo_envio.is.null`)
            .order('proximo_envio', { ascending: true, nullsFirst: true })
            .limit(maxEmails);

        if (contactError) throw contactError;
        if (!contacts || contacts.length === 0) return report;

        console.log(`📋 Marketing: ${contacts.length} contactos en cola.`);

        // Procesar en chunks de 5 para velocidad
        const CHUNK_SIZE = 5;
        for (let i = 0; i < contacts.length; i += CHUNK_SIZE) {
            const chunk = contacts.slice(i, i + CHUNK_SIZE);
            
            await Promise.all(chunk.map(async (contact) => {
                try {
                    report.processed++;
                    let etapaActual = parseInt(contact.etapa_envio) || 1;

                    let { data: messageData } = await supabase
                        .from('marketing')
                        .select('*')
                        .eq('nombre_envio', etapaActual)
                        .eq('activo', true)
                        .maybeSingle();

                    if (!messageData) {
                        console.log(`  ⏸️ Pausado: Sin contenido etapa ${etapaActual} (${contact.correo})`);
                        return;
                    }

                    let finalHtml = messageData.cuerpo_html || '';
                    if (messageData.imagen_url) {
                        finalHtml = finalHtml.replace('IMAGE_PLACEHOLDER', messageData.imagen_url);
                    }

                    const brevoRes = await axios.post('https://api.brevo.com/v3/smtp/email', {
                        sender: { name: "Tiny Puertecillo", email: "contacto@tinypuertecillo.cl" },
                        to: [{ email: contact.correo }],
                        subject: messageData.asunto,
                        htmlContent: finalHtml,
                        textContent: messageData.cuerpo || "Ver correo en formato HTML"
                    }, {
                        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' }
                    });

                    const messageId = brevoRes.data?.messageId;

                    // Registro de trazabilidad
                    await supabase.from('trazabilidad_correos').insert({
                        contacto_id: contact.id, 
                        email: contact.correo,
                        fecha: getFechaChile(),
                        estado: 'request', 
                        mensaje_id: messageId
                    });

                    const nextDate = sumarDiasHabiles(new Date(), 3);
                    await supabase.from('contactos').update({
                        ultimo_envio: new Date().toISOString(),
                        proximo_envio: nextDate.toISOString().split('T')[0],
                        etapa_envio: etapaActual + 1
                    }).eq('id', contact.id);

                    report.sent++;
                } catch (err: any) {
                    report.errors.push(`Marketing ${contact.correo}: ${err.message}`);
                }
            }));
            
            await sleep(DELAY_BETWEEN_EMAILS_MS);
        }
    } catch (err: any) {
        report.errors.push(`Error global marketing: ${err.message}`);
    }

    return report;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const authHeader = request.headers.get('authorization');
        const token = authHeader ? authHeader.replace('Bearer ', '') : searchParams.get('secret');

        if (token !== CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const diaLaboral = esDiaLaboral();
        if (!diaLaboral.esLaboral) {
            return NextResponse.json({
                message: diaLaboral.mensaje,
                fecha: diaLaboral.fecha,
                marketing: { sent: 0 }
            });
        }

        console.log(`✅ Día laboral (${diaLaboral.fecha}). Iniciando envíos...`);

        const marketingResult = await ejecutarMarketing(BREVO_DAILY_LIMIT);
        console.log(`📬 Marketing: ${marketingResult.sent} enviados`);

        return NextResponse.json({
            fecha: diaLaboral.fecha,
            totalEnviados: marketingResult.sent,
            marketing: {
                processed: marketingResult.processed,
                sent: marketingResult.sent,
                errors: marketingResult.errors
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
