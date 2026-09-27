'use client';

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const AIRBNB_URL = 'https://www.airbnb.cl/rooms/1702295511791817167';

export default function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 w-full z-50 bg-[#fff9ef]/85 dark:bg-[#1d1b16]/85 backdrop-blur-xl border-b border-outline-variant/10">
      <div className="flex justify-between items-center max-w-7xl mx-auto px-5 md:px-8 py-2 md:py-3 w-full">
        <a className="hover:opacity-80 transition-all duration-300 block shrink-0 -my-1" href="/">
          <img src="/logo/logo_negro.png" alt="Tiny Puertecillo" width={4000} height={2769} className="h-14 md:h-20 w-auto block dark:hidden" />
          <img src="/logo/logo_blanco.png" alt="Tiny Puertecillo" width={4000} height={2769} className="h-14 md:h-20 w-auto hidden dark:block" />
        </a>
        <div className="hidden md:flex items-center space-x-10">
          <a className="text-[#1d1b16]/70 dark:text-[#f3ede4]/70 hover:text-[#163428] dark:hover:text-[#fff9ef] transition-colors font-label text-sm tracking-wide pb-1 border-b-2 border-transparent hover:border-[#964828]/50" href="/">Inicio</a>
          <a className="text-[#1d1b16]/70 dark:text-[#f3ede4]/70 hover:text-[#163428] dark:hover:text-[#fff9ef] transition-colors font-label text-sm tracking-wide pb-1 border-b-2 border-transparent hover:border-[#964828]/50" href="/#lienzo">Las Tiny</a>
          <a className="text-[#163428] dark:text-[#fff9ef] border-b-2 border-[#964828] pb-1 font-label text-sm tracking-wide" href="/reservar">Reservar</a>
          <a className="text-[#1d1b16]/70 dark:text-[#f3ede4]/70 hover:text-[#163428] dark:hover:text-[#fff9ef] transition-colors font-label text-sm tracking-wide pb-1 border-b-2 border-transparent hover:border-[#964828]/50" href="/#contacto">Contacto</a>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 rounded-full border border-[#163428]/15 dark:border-[#fff9ef]/20 bg-white/50 dark:bg-white/5 p-1">
            <a
              href={AIRBNB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary-container text-on-primary px-5 lg:px-6 py-2.5 rounded-full font-label font-semibold tracking-wide text-sm hover:opacity-90 active:scale-[0.97] transition-all inline-block whitespace-nowrap shadow-sm"
            >
              Airbnb
            </a>
          </div>
          <button
            className="md:hidden p-2 text-[#1d1b16] dark:text-[#f9f3ea]"
            aria-label="Abrir menú"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden overflow-hidden bg-[#fff9ef] dark:bg-[#1d1b16] border-t border-outline-variant/10">
          <div className="flex flex-col px-5 py-5 gap-5">
            <div className="flex flex-col gap-2.5">
              <a
                href={AIRBNB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary-container text-on-primary text-center px-6 py-3.5 rounded-full font-label font-semibold tracking-wide text-sm shadow-sm"
              >
                Reservar en Airbnb
              </a>
            </div>
            <div className="flex flex-col gap-4 border-t border-outline-variant/10 pt-4">
              <a onClick={() => setMobileMenuOpen(false)} className="text-[#1d1b16]/80 dark:text-[#f3ede4]/80 font-label text-base tracking-wide" href="/">Inicio</a>
              <a onClick={() => setMobileMenuOpen(false)} className="text-[#1d1b16]/80 dark:text-[#f3ede4]/80 font-label text-base tracking-wide" href="/#lienzo">Las Tiny</a>
              <a onClick={() => setMobileMenuOpen(false)} className="text-[#163428] dark:text-[#fff9ef] font-label text-base tracking-wide" href="/reservar">Reservar</a>
              <a onClick={() => setMobileMenuOpen(false)} className="text-[#1d1b16]/80 dark:text-[#f3ede4]/80 font-label text-base tracking-wide" href="/#contacto">Contacto</a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
