'use client';

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Search, Plus, Loader2, AlertCircle } from "lucide-react";

export default function ContactosMarketing() {
  const [contactos, setContactos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  
  // Inline edit state for Empresa
  const [editingEmpresaId, setEditingEmpresaId] = useState<string | null>(null);
  const [empresaTemp, setEmpresaTemp] = useState("");
  const [guardandoInline, setGuardandoInline] = useState(false);

  // Formulario de agregar contacto
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoCorreo, setNuevoCorreo] = useState("");
  const [nuevoCelular, setNuevoCelular] = useState("");
  const [nuevaEmpresa, setNuevaEmpresa] = useState("");
  const [nuevaCiudad, setNuevaCiudad] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      let todosLosContactos: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hayMas = true;

      while (hayMas) {
        const { data, error } = await supabase
          .from("contactos")
          .select("*")
          .ilike("estado", "activo")
          .range(from, from + batchSize - 1);

        if (error) {
          console.error("Error loading contacts:", error);
          throw error;
        }

        if (data && data.length > 0) {
          todosLosContactos = [...todosLosContactos, ...data];
          from += batchSize;
          if (data.length < batchSize) {
            hayMas = false;
          }
        } else {
          hayMas = false;
        }
      }

      setContactos(todosLosContactos || []);
    } catch (error) {
      console.error("Error al cargar:", error);
    } finally {
      setCargando(false);
    }
  };

  const agregarContacto = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm("");
    
    if (!nuevoNombre.trim() || !nuevoCorreo.trim()) {
      setErrorForm("Nombre y Correo son campos requeridos.");
      return;
    }

    try {
      setGuardando(true);
      const { error } = await supabase
        .from("contactos")
        .insert([
          {
            nombre: nuevoNombre.trim(),
            correo: nuevoCorreo.trim().toLowerCase(),
            celular: nuevoCelular.trim() || null,
            empresa: nuevaEmpresa.trim() || null,
            ciudad: nuevaCiudad.trim() || null,
            estado: 'activo',
            etapa: 'marketing',
            etapa_envio: 1
          }
        ]);

      if (error) {
        if (error.code === '23505') {
          throw new Error("El correo ingresado ya existe en la base de datos.");
        }
        throw error;
      }

      // Limpiar y refrescar
      setNuevoNombre("");
      setNuevoCorreo("");
      setNuevoCelular("");
      setNuevaEmpresa("");
      setNuevaCiudad("");
      setMostrarFormulario(false);
      await cargarDatos();
    } catch (err: any) {
      setErrorForm(err.message || "Error al guardar el contacto.");
    } finally {
      setGuardando(false);
    }
  };

  const saveEmpresa = async (id: string) => {
    try {
      setGuardandoInline(true);
      const val = empresaTemp.trim() || null;
      const { error } = await supabase
        .from("contactos")
        .update({ empresa: val })
        .eq("id", id);

      if (error) throw error;

      // Update state local
      setContactos(contactos.map(c => c.id === id ? { ...c, empresa: val } : c));
      setEditingEmpresaId(null);
    } catch (error) {
      console.error("Error updating empresa:", error);
      alert("No se pudo actualizar la empresa.");
    } finally {
      setGuardandoInline(false);
    }
  };

  const obtenerEtapa = (contacto: any): number => {
    return parseInt(contacto.etapa_envio || "1");
  };

  const contactosFiltrados = contactos.filter((contacto) => {
    return (
      contacto.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      contacto.correo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      contacto.empresa?.toLowerCase().includes(busqueda.toLowerCase()) ||
      contacto.ciudad?.toLowerCase().includes(busqueda.toLowerCase())
    );
  });

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return "-";
    const fechaAjustada = fecha.length === 10 ? `${fecha}T12:00:00` : fecha;
    return new Date(fechaAjustada).toLocaleDateString("es-CL");
  };

  return (
    <div className="space-y-8 font-sans w-full">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 border border-outline-variant/10 shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">Leads Activos</p>
          <p className="text-4xl font-serif font-semibold text-primary mt-2">
            {contactos.length}
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-outline-variant/10 shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">En Secuencia</p>
          <p className="text-4xl font-serif font-semibold text-secondary mt-2">
            {contactos.filter((c) => {
              const etapa = parseInt(c.etapa_envio || "0");
              return etapa > 0 && etapa < 100;
            }).length}
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-outline-variant/10 shadow-sm">
          <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider">Completados</p>
          <p className="text-4xl font-serif font-semibold text-primary mt-2">
            {contactos.filter((c) => parseInt(c.etapa_envio || "0") >= 100).length}
          </p>
        </div>
      </div>

      {/* Formulario Agregar Contacto */}
      {mostrarFormulario && (
        <div className="bg-white rounded-lg border border-outline-variant/15 p-6 shadow-md max-w-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <h3 className="text-lg font-serif font-semibold text-primary mb-4">Agregar Nuevo Contacto</h3>
          {errorForm && (
            <div className="p-3 mb-4 rounded bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-100">
              <AlertCircle className="h-4 w-4" />
              {errorForm}
            </div>
          )}
          <form onSubmit={agregarContacto} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant/70 uppercase mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full px-3 py-2 bg-surface border border-outline-variant/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant/70 uppercase mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={nuevoCorreo}
                  onChange={(e) => setNuevoCorreo(e.target.value)}
                  placeholder="juan@correo.com"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant/70 uppercase mb-1">Celular / Teléfono</label>
                <input
                  type="text"
                  value={nuevoCelular}
                  onChange={(e) => setNuevoCelular(e.target.value)}
                  placeholder="+56912345678"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant/70 uppercase mb-1">Empresa o Institución</label>
                <input
                  type="text"
                  value={nuevaEmpresa}
                  onChange={(e) => setNuevaEmpresa(e.target.value)}
                  placeholder="Ej. Municipalidad de Puertecillo"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant/70 uppercase mb-1">Ciudad</label>
                <input
                  type="text"
                  value={nuevaCiudad}
                  onChange={(e) => setNuevaCiudad(e.target.value)}
                  placeholder="Ej. Litueche"
                  className="w-full px-3 py-2 bg-surface border border-outline-variant/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setMostrarFormulario(false)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-md text-xs font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-4 py-2 bg-primary text-white rounded-md text-xs font-bold uppercase tracking-wider hover:bg-primary/90 flex items-center gap-2"
              >
                {guardando ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Guardar Contacto</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros e Historial */}
      <div className="bg-white rounded-lg border border-outline-variant/10 shadow-sm overflow-hidden p-6 space-y-6 w-full">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-on-surface-variant/50" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo, empresa o ciudad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant/20 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          </div>

          {!mostrarFormulario && (
            <button
              onClick={() => setMostrarFormulario(true)}
              className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded-md text-xs font-bold uppercase tracking-wider hover:bg-primary/95 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar Contacto</span>
            </button>
          )}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto w-full">
          {cargando ? (
            <div className="py-20 text-center text-sm text-on-surface-variant/60">
              Cargando base de contactos...
            </div>
          ) : contactosFiltrados.length === 0 ? (
            <div className="py-20 text-center text-sm text-on-surface-variant/60">
              No se encontraron contactos en la base de datos.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-outline-variant/10 text-xs uppercase text-on-surface-variant/60 tracking-wider">
                  <th className="py-3 px-4 font-semibold w-[24%]">Contacto / Empresa</th>
                  <th className="py-3 px-4 font-semibold w-[18%]">Correo</th>
                  <th className="py-3 px-4 font-semibold w-[12%]">Ciudad</th>
                  <th className="py-3 px-4 font-semibold text-center w-[8%]">Etapa</th>
                  <th className="py-3 px-4 font-semibold w-[13%]">Último Envío</th>
                  <th className="py-3 px-4 font-semibold w-[13%]">Próximo Envío</th>
                  <th className="py-3 px-4 font-semibold w-[12%]">Estado Brevo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {contactosFiltrados.map((contacto) => {
                  const etapa = obtenerEtapa(contacto);
                  return (
                    <tr key={contacto.id} className="hover:bg-surface/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-primary">
                        <div className="font-semibold">{contacto.nombre}</div>
                        {/* Campo Empresa Editable */}
                        {editingEmpresaId === contacto.id ? (
                          <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={empresaTemp}
                              onChange={(e) => setFormValue(e.target.value)}
                              className="px-2 py-1 text-xs bg-surface border border-outline-variant/30 rounded focus:outline-none focus:ring-1 focus:ring-primary w-48 font-normal"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEmpresa(contacto.id);
                                if (e.key === 'Escape') setEditingEmpresaId(null);
                              }}
                            />
                            <button 
                              onClick={() => saveEmpresa(contacto.id)}
                              disabled={guardandoInline}
                              className="p-1 text-green-600 hover:bg-green-50 rounded text-xs font-bold"
                            >
                              ✓
                            </button>
                            <button 
                              onClick={() => setEditingEmpresaId(null)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded text-xs font-bold"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => {
                              setEditingEmpresaId(contacto.id);
                              setEmpresaTemp(contacto.empresa || "");
                            }}
                            className="text-[11px] text-secondary font-normal hover:underline cursor-pointer mt-0.5"
                            title="Haz clic para editar la empresa"
                          >
                            {contacto.empresa || "+ Asignar Empresa"}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">{contacto.correo}</td>
                      <td className="py-3 px-4 text-on-surface-variant">{contacto.ciudad || "-"}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          etapa >= 100 ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                        }`}>
                          {etapa >= 100 ? "Completado" : `Etapa ${etapa}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant">{formatearFecha(contacto.ultimo_envio)}</td>
                      <td className="py-3 px-4 text-on-surface-variant">{formatearFecha(contacto.proximo_envio)}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs uppercase font-semibold text-on-surface-variant/70">
                          {contacto.ultimo_estado_brevo || "Pendiente"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // Helper local function to bypass TS scope inside render loop
  function setFormValue(val: string) {
    setEmpresaTemp(val);
  }
}
