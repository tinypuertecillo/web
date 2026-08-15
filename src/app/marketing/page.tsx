'use client';

import { useState } from "react";
import ContactosMarketing from "./ContactosMarketing";
import ListaContenidos from "./ListaContenidos";
import TrazabilidadBrevo from "./TrazabilidadBrevo";
import { Users, Library, BarChart3, Compass } from "lucide-react";

export default function MarketingPage() {
  const [tabActiva, setTabActiva] = useState<"monitor" | "biblioteca" | "trazabilidad">("monitor");

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Banner Superior Editorial */}
      <div className="max-w-[98%] mx-auto px-6 pt-12 pb-6 border-b border-outline-variant/15">
        <div className="flex items-center gap-3 mb-2">
          <Compass className="h-6 w-6 text-secondary" />
          <span className="text-xs tracking-[4px] uppercase font-bold text-secondary font-sans">Sistema de Prospección</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-semibold text-primary tracking-tight">
          Curador de Marketing
        </h1>
        <p className="text-on-surface-variant/70 text-sm md:text-base max-w-2xl mt-2 font-light">
          Secuencias automatizadas de comunicación para el desarrollo sustentable de Tiny Puertecillo.
        </p>
      </div>

      <div className="max-w-[98%] mx-auto p-6">
        {/* Tab Navigation */}
        <div className="flex w-full max-w-3xl mx-auto gap-2 mb-8 bg-surface-container p-1 rounded-lg border border-outline-variant/10">
          <button
            onClick={() => setTabActiva("monitor")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
              tabActiva === "monitor"
                ? "bg-primary text-white shadow-md"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Monitor de Leads</span>
          </button>

          <button
            onClick={() => setTabActiva("biblioteca")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
              tabActiva === "biblioteca"
                ? "bg-primary text-white shadow-md"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <Library className="h-4 w-4" />
            <span>Biblioteca</span>
          </button>

          <button
            onClick={() => setTabActiva("trazabilidad")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold transition-all ${
              tabActiva === "trazabilidad"
                ? "bg-primary text-white shadow-md"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Trazabilidad Brevo</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {tabActiva === "monitor" && <ContactosMarketing />}
          {tabActiva === "biblioteca" && <ListaContenidos />}
          {tabActiva === "trazabilidad" && <TrazabilidadBrevo />}
        </div>
      </div>
    </div>
  );
}
