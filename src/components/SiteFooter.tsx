import React from 'react';
import { InstagramIcon, WhatsAppIcon } from './icons';

const AIRBNB_URL = 'https://www.airbnb.cl/rooms/1702295511791817167';
const WHATSAPP_URL = 'https://wa.me/56979587293?text=' + encodeURIComponent('Hola, quiero consultar por una Tiny en Puertecillo');
const INSTAGRAM_URL = 'https://www.instagram.com/tinypuertecillo.cl/';

export default function SiteFooter() {
  return (
    <footer className="relative w-full pt-20 pb-24 px-8 bg-[#f3ede4] dark:bg-[#163428] overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, #964828, #163428, #964828)' }}
      />
      <div className="relative grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-14 md:gap-10 max-w-7xl mx-auto w-full items-start text-center md:text-left">
        <div className="flex flex-col items-center md:items-start gap-6">
          <img
            src="/logo/logo_negro_clean.png"
            alt="Tiny Puertecillo Logo"
            className="h-28 w-auto object-contain dark:invert -ml-1"
            width={4000}
            height={2769}
            loading="lazy"
            decoding="async"
          />
          <p className="text-[#1d1b16] dark:text-[#f9f3ea] font-body text-[15px] opacity-70 max-w-xs leading-relaxed">
            Experiencias arquitectónicas en el borde costero chileno, entre el bosque y el mar.
          </p>
          <div className="hidden md:flex items-center gap-1 rounded-full border border-[#163428]/15 dark:border-[#fff9ef]/20 bg-white/40 dark:bg-white/5 p-1">
            <a
              href={AIRBNB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary-container text-on-primary px-5 py-2 rounded-full font-label font-semibold tracking-wide text-xs hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Airbnb
            </a>
          </div>
        </div>
        <div className="flex flex-col items-center md:items-start gap-4">
          <p className="font-label text-xs uppercase tracking-widest text-[#964828] font-bold">Navegación</p>
          <div className="flex flex-col items-center md:items-start gap-3">
            <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-75 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all font-label text-sm" href="/">Inicio</a>
            <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-75 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all font-label text-sm" href="/#lienzo">Las Tiny</a>
            <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-75 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all font-label text-sm" href="/reservar">Reservar</a>
            <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-75 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all font-label text-sm" href="/#contacto">Contacto</a>
          </div>
        </div>
        <div className="flex flex-col items-center md:items-start gap-4">
          <p className="font-label text-xs uppercase tracking-widest text-[#964828] font-bold">Legal &amp; Social</p>
          <div className="flex flex-col items-center md:items-start gap-3">
            <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-75 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all font-label text-sm" href="/">Privacidad</a>
            <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-75 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all font-label text-sm" href="/">Términos</a>
            <a className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-75 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all font-label text-sm" href="/">Sustentabilidad</a>
          </div>
          <div className="flex flex-col items-center md:items-start gap-3 pt-1">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-75 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all font-label text-sm inline-flex items-center gap-2">
              <InstagramIcon className="w-4 h-4" />
              Instagram
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-[#1d1b16] dark:text-[#f9f3ea] opacity-75 hover:opacity-100 hover:text-[#964828] dark:hover:text-[#fff9ef] transition-all font-label text-sm inline-flex items-center gap-2">
              <WhatsAppIcon className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
      <div className="relative flex md:hidden justify-center mt-10">
        <div className="flex items-center gap-1 rounded-full border border-[#163428]/15 dark:border-[#fff9ef]/20 bg-white/40 dark:bg-white/5 p-1">
          <a href={AIRBNB_URL} target="_blank" rel="noopener noreferrer" className="bg-primary-container text-on-primary px-5 py-2 rounded-full font-label font-semibold tracking-wide text-xs">Airbnb</a>
        </div>
      </div>
      <div className="relative max-w-7xl mx-auto w-full mt-14 pt-6 border-t border-[#1d1b16]/10 dark:border-[#f9f3ea]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs font-label tracking-widest text-[#1d1b16] dark:text-[#f9f3ea] opacity-50 uppercase">
          © 2026 Tiny Puertecillo SpA
        </p>
        <p className="text-xs font-label tracking-widest text-[#1d1b16] dark:text-[#f9f3ea] opacity-50 uppercase">
          Architectural Retreats · Puertecillo, Chile
        </p>
                <a href="/admin" className="text-xs font-label tracking-widest text-[#1d1b16] dark:text-[#f9f3ea] opacity-30 hover:opacity-70 transition-opacity uppercase">Admin</a>
      </div>
    </footer>
      );
}
