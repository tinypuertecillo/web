'use client';

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Mail, Search, RefreshCcw, AlertCircle, HelpCircle } from "lucide-react";

interface TrazabilidadLog {
  id: string;
  email: string;
  fecha: string;
  estado: string;
  mensaje_id: string;
  created_at: string;
  contactos?: {
    nombre: string;
  };
}

export default function TrazabilidadBrevo() {
  const [logs, setLogs] = useState<TrazabilidadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarLogs();
  }, []);

  const cargarLogs = async () => {
    try {
      setLoading(true);
      setError("");
      
      const { data, error: dbError } = await supabase
        .from("trazabilidad_correos")
        .select(`
          id,
          email,
          fecha,
          estado,
          mensaje_id,
          created_at,
          contactos (
            nombre
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (dbError) throw dbError;
      setLogs((data as any) || []);
    } catch (err: any) {
      console.error("Error loading trazabilidad:", err);
      setError("No se pudo cargar la trazabilidad de envíos.");
    } finally {
      setLoading(false);
    }
  };

  const logsFiltrados = logs.filter((log) => {
    const coincideEmail = log.email?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideNombre = log.contactos?.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    return coincideEmail || coincideNombre;
  });

  const translateStatus = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'opened' || s === 'unique_opened' || s === 'loadedbyproxy') return 'ABIERTO';
    if (s === 'delivered') return 'ENTREGADO';
    if (s === 'request') return 'ENVIADO';
    if (s === 'hard_bounce' || s === 'soft_bounce' || s === 'invalid_email') return 'REBOTE';
    if (s === 'blocked') return 'BLOQUEADO';
    return s.toUpperCase();
  };

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('open') || s === 'abierto') return 'bg-green-50 text-green-700 border border-green-100';
    if (s === 'delivered' || s === 'entregado') return 'bg-blue-50 text-blue-700 border border-blue-100';
    if (s === 'request' || s === 'enviado') return 'bg-yellow-50 text-yellow-700 border border-yellow-100';
    return 'bg-red-50 text-red-700 border border-red-100';
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif font-semibold text-primary flex items-center gap-2">
            <Mail className="h-5 w-5 text-secondary" />
            Trazabilidad Brevo (Caja Negra)
          </h2>
          <p className="text-xs text-on-surface-variant/70 mt-1 font-light">
            Historial en tiempo real de los envíos realizados y el estado de entrega reportado por Brevo.
          </p>
        </div>
        <button
          onClick={cargarLogs}
          className="flex items-center gap-2 px-3 py-1.5 bg-surface-container hover:bg-surface-container-high rounded-md text-xs font-semibold uppercase tracking-wider text-primary border border-outline-variant/10 transition-all"
        >
          <RefreshCcw className="h-3 w-3" />
          <span>Actualizar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-50 text-red-700 flex items-center gap-2 border border-red-100">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-outline-variant/10 shadow-sm overflow-hidden p-6 space-y-6">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Filtrar por nombre de contacto o correo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center text-sm text-on-surface-variant/60">
              Cargando historial de trazabilidad...
            </div>
          ) : logsFiltrados.length === 0 ? (
            <div className="py-20 text-center text-sm text-on-surface-variant/60">
              No se han registrado envíos de marketing en este entorno aún.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10 text-xs uppercase text-on-surface-variant/60 tracking-wider">
                  <th className="py-3 px-4 font-semibold">Fecha Envío</th>
                  <th className="py-3 px-4 font-semibold">Contacto</th>
                  <th className="py-3 px-4 font-semibold">Correo Destino</th>
                  <th className="py-3 px-4 font-semibold">Estado Entrega</th>
                  <th className="py-3 px-4 font-semibold">ID Mensaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4 text-on-surface-variant">
                      {new Date(log.created_at).toLocaleString("es-CL")}
                    </td>
                    <td className="py-3 px-4 font-medium text-primary">
                      {log.contactos?.nombre || "Contacto Temporal / Prueba"}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">{log.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadgeClass(log.estado)}`}>
                        {translateStatus(log.estado)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-on-surface-variant font-mono break-all max-w-[200px]">
                      {log.mensaje_id || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
