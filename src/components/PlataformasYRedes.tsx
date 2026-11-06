import React from 'react';
import { InstagramIcon, TikTokIcon, FacebookIcon } from './icons';
import { AIRBNB_URL, BOOKING_URL, INSTAGRAM_URL, TIKTOK_URL, FACEBOOK_URL } from '@/lib/links';

const EXT = { target: '_blank', rel: 'noopener noreferrer' } as const;

export const PlatformLogos = ({ size = 'md' }: { size?: 'sm' | 'md' }) => {
  const card =
    size === 'sm'
      ? 'h-10 px-4 rounded-full'
      : 'h-14 px-7 rounded-2xl';
  const img = size === 'sm' ? 'h-5' : 'h-8';
  return (
    <>
      <a href={AIRBNB_URL} {...EXT} aria-label="Reservar en Airbnb" className={`${card} bg-white border border-black/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all inline-flex items-center justify-center`}>
        <img src="/logo/airbnb.svg" alt="Airbnb" className={`${img} w-auto`} loading="lazy" decoding="async" />
      </a>
      <a href={BOOKING_URL} {...EXT} aria-label="Reservar en Booking.com" className={`${card} bg-white border border-black/10 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all inline-flex items-center justify-center`}>
        <img src="/logo/booking.svg" alt="Booking.com" className={`${size === 'sm' ? 'h-4' : 'h-6'} w-auto`} loading="lazy" decoding="async" />
      </a>
    </>
  );
};

export const SocialLogos = ({ size = 'md' }: { size?: 'sm' | 'md' }) => {
  const box = size === 'sm' ? 'w-10 h-10' : 'w-16 h-16';
  const ico = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8';
  const base = `${box} rounded-full text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all inline-flex items-center justify-center`;
  return (
    <>
      <a href={INSTAGRAM_URL} {...EXT} aria-label="Instagram de Tiny Puertecillo" className={base} style={{ background: 'linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)' }}>
        <InstagramIcon className={ico} />
      </a>
      <a href={TIKTOK_URL} {...EXT} aria-label="TikTok de Tiny Puertecillo" className={`${base} bg-black`}>
        <TikTokIcon className={ico} />
      </a>
      <a href={FACEBOOK_URL} {...EXT} aria-label="Facebook de Tiny Puertecillo" className={`${base} bg-[#1877F2]`}>
        <FacebookIcon className={ico} />
      </a>
    </>
  );
};

export default function PlataformasYRedes() {
  return (
    <div className="mt-8 w-full flex flex-col items-center gap-7 pointer-events-auto">
      <div className="flex flex-col items-center gap-3">
        <p className="font-label text-xs uppercase tracking-widest font-bold opacity-60">También nos encuentras en</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <PlatformLogos />
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="font-label text-xs uppercase tracking-widest font-bold opacity-60">Síguenos</p>
        <div className="flex items-center justify-center gap-4">
          <SocialLogos />
        </div>
      </div>
    </div>
  );
}
