import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    const rawKey = process.env.BREVO_API_KEY || "";
    const BREVO_KEY_CLEAN = rawKey.trim().replace(/^['"]|['"]$/g, '');

    if (!BREVO_KEY_CLEAN) {
        return NextResponse.json({ error: "Config Error: BREVO_API_KEY is MISSING." }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { messageId, targetEmail } = body;

        if (!messageId || !targetEmail) {
            return NextResponse.json({ error: 'Missing messageId or targetEmail' }, { status: 400 });
        }

        // 1. Fetch Message
        let { data: messageData, error: msgError } = await supabase
            .from('marketing')
            .select('*')
            .eq('id', messageId)
            .single();

        if (msgError || !messageData) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        let imageUrl = messageData.imagen_url;
        let finalHtml = messageData.cuerpo_html || '';

        const isValidUrl = (url: string) => {
            try { return Boolean(new URL(url)); } catch (e) { return false; }
        };

        if (!imageUrl || !isValidUrl(imageUrl)) {
            return NextResponse.json({
                error: "Error Crítico de Imagen",
                details: "No se encontró una URL válida para la imagen. El envío fue cancelado para evitar correos rotos."
            }, { status: 400 });
        }

        finalHtml = finalHtml
            .replace(/IMAGE_PLACEHOLDER/g, imageUrl)
            .replace(/\{\{IMG_URL\}\}/g, imageUrl);

        const signatureHtml = `
            <br>
            <div style="text-align: center;">
                <small style="color:#999;">[Email de Prueba enviado desde el Panel de Control - Tiny Puertecillo]</small>
            </div>
        `;
        finalHtml += signatureHtml;

        // 4. Send via Brevo
        const emailPayload = {
            sender: { name: "Tiny Puertecillo", email: "contacto@tinypuertecillo.cl" },
            to: [{ email: targetEmail }],
            subject: `[TEST] ${messageData.asunto}`,
            htmlContent: finalHtml,
            textContent: messageData.cuerpo || "Vista de prueba HTML"
        };

        await axios.post('https://api.brevo.com/v3/smtp/email', emailPayload, {
            headers: {
                'api-key': BREVO_KEY_CLEAN,
                'Content-Type': 'application/json',
                'accept': 'application/json'
            }
        });

        return NextResponse.json({ success: true, message: "Test email sent successfully" });

    } catch (err: any) {
        console.error('Test Email Error:', err);
        if (axios.isAxiosError(err)) {
            const status = err.response?.status;
            const data = err.response?.data;
            return NextResponse.json({
                error: "Upstream Error from Brevo (Send Step)",
                details: data
            }, { status: status || 500 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
