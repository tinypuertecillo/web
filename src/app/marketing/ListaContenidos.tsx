'use client';

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
    Mail,
    Eye,
    Library,
    Loader2,
    AlertCircle,
    Send,
    Edit3,
    Check
} from "lucide-react";

interface MarketingMessage {
    id: string;
    asunto: string;
    cuerpo_html: string;
    cuerpo: string;
    nombre_envio: number;
    imagen_url?: string;
    estado?: string;
    activo?: boolean;
    created_at?: string;
}

export default function ListaContenidos() {
    const [mensajes, setMensajes] = useState<MarketingMessage[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
    const [editandoUrl, setEditandoUrl] = useState<string | null>(null);
    const [urlTemporal, setUrlTemporal] = useState("");

    useEffect(() => {
        cargarMensajes();
    }, []);

    const cargarMensajes = async () => {
        try {
            setCargando(true);
            const { data, error: dbError } = await supabase
                .from("marketing")
                .select("*")
                .order("nombre_envio", { ascending: true });

            if (dbError) throw dbError;
            setMensajes(data || []);
        } catch (err: any) {
            console.error("Error cargando mensajes:", err);
            setError("No se pudo cargar la biblioteca de contenidos.");
        } finally {
            setCargando(false);
        }
    };

    const pruebaEnvio = async (msg: MarketingMessage) => {
        if (!msg.imagen_url) {
            alert("⚠️ Debes agregar una URL de imagen primero.");
            return;
        }

        const emailDestino = prompt("Ingresa el correo para recibir la prueba:", "contacto@tinypuertecillo.cl");
        if (!emailDestino) return;

        try {
            const response = await fetch('/api/send-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId: msg.id,
                    targetEmail: emailDestino
                })
            });

            const result = await response.json();

            if (!response.ok) {
                let errorMsg = result.error || "Error al enviar";
                throw new Error(errorMsg);
            }

            alert("✅ ¡Correo de prueba enviado con éxito!");
        } catch (err: any) {
            console.error("Error envío prueba:", err);
            alert("❌ Error: " + err.message);
        }
    };

    const guardarUrl = async (id: string) => {
        try {
            const { error: dbError } = await supabase
                .from("marketing")
                .update({ imagen_url: urlTemporal })
                .eq("id", id);

            if (dbError) throw dbError;

            setMensajes(mensajes.map(m =>
                m.id === id ? { ...m, imagen_url: urlTemporal } : m
            ));
            setEditandoUrl(null);
            setUrlTemporal("");
        } catch (err: any) {
            alert("Error al guardar URL: " + err.message);
        }
    };

    return (
        <div className="space-y-8 font-sans">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-serif font-semibold text-primary flex items-center gap-2">
                        <Library className="h-5 w-5 text-secondary" />
                        Biblioteca de Secuencias
                    </h2>
                    <p className="text-xs text-on-surface-variant/70 mt-1 font-light">
                        Contenidos programados de correos secuenciales (Etapas 1-7).
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-md bg-red-50 text-red-700 flex items-center gap-2 border border-red-100">
                    <AlertCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg border border-outline-variant/10 shadow-sm overflow-hidden">
                {cargando ? (
                    <div className="py-20 text-center">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary opacity-50 mb-4" />
                        <p className="text-on-surface-variant/60 text-sm">Sincronizando biblioteca...</p>
                    </div>
                ) : mensajes.length === 0 ? (
                    <div className="py-20 text-center">
                        <Mail className="h-16 w-16 text-on-surface-variant/20 mx-auto mb-4" />
                        <p className="text-on-surface-variant/60 text-sm">La secuencia está vacía.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-outline-variant/10 text-xs uppercase text-on-surface-variant/60 tracking-wider">
                              <th className="py-3 px-4 font-semibold text-center w-20">Etapa</th>
                              <th className="py-3 px-4 font-semibold w-1/4">Asunto</th>
                              <th className="py-3 px-4 font-semibold w-2/5">Imagen (Supabase URL)</th>
                              <th className="py-3 px-4 font-semibold text-center w-24">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/5">
                            {mensajes.map((msg) => (
                              <tr key={msg.id} className="hover:bg-surface/50 transition-colors">
                                <td className="py-4 px-4 text-center font-bold text-secondary">
                                  {msg.nombre_envio}
                                </td>
                                <td className="py-4 px-4 font-medium text-primary">
                                  {msg.asunto}
                                </td>
                                <td className="py-4 px-4 text-xs">
                                  {editandoUrl === msg.id ? (
                                    <div className="flex gap-2 items-center">
                                      <input
                                        type="text"
                                        value={urlTemporal}
                                        onChange={(e) => setUrlTemporal(e.target.value)}
                                        placeholder="https://..."
                                        className="flex-1 px-3 py-1.5 bg-surface border border-outline-variant/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                                      />
                                      <button
                                        onClick={() => guardarUrl(msg.id)}
                                        className="p-1.5 bg-primary text-white rounded-md hover:bg-primary-container hover:text-primary transition-all"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-on-surface-variant break-all">
                                        {msg.imagen_url || "(Sin imagen asignada)"}
                                      </span>
                                      <button
                                        onClick={() => {
                                          setEditandoUrl(msg.id);
                                          setUrlTemporal(msg.imagen_url || "");
                                        }}
                                        className="text-secondary hover:underline font-semibold flex items-center gap-1 shrink-0"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                        <span>Editar</span>
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <div className="flex justify-center gap-2">
                                    <button
                                      onClick={() => setVistaPrevia(msg.cuerpo_html)}
                                      className="p-2 text-on-surface-variant hover:bg-surface-container rounded-md transition-all"
                                      title="Vista Previa HTML"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => pruebaEnvio(msg)}
                                      className="p-2 text-primary hover:bg-surface-container rounded-md transition-all"
                                      title="Enviar Prueba"
                                    >
                                      <Send className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Vista Previa Modal */}
            {vistaPrevia && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-outline-variant/10 shadow-2xl">
                        <div className="p-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface">
                            <h3 className="font-serif font-bold text-primary">Vista Previa de Correo</h3>
                            <button
                                onClick={() => setVistaPrevia(null)}
                                className="text-xs font-semibold uppercase tracking-wider text-secondary hover:underline"
                            >
                                Cerrar
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-surface-container-lowest">
                            <div
                                dangerouslySetInnerHTML={{ __html: vistaPrevia }}
                                className="border border-outline-variant/5 rounded-md p-4 bg-white shadow-inner"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
