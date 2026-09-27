'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

function GraciasContent() {
    const params = useSearchParams();
    const estado = params.get('estado');
    const pagada = estado === 'pagada';
    const rechazada = estado === 'rechazada';

  return (
        <div className="min-h-screen bg-surface text-on-surface font-sans flex flex-col">
              <SiteHeader />
              <div className="flex-1 flex items-center justify-center px-5 py-20">
                      <div className="max-w-md w-full bg-white rounded-2xl p-9 shadow-[0_20px_40px_rgba(29,27,22,0.05)] text-center flex flex-col gap-4">
                                <div className="text-xs tracking-[2px] uppercase text-secondary font-semibold">Tiny Puertecillo</div>
                        {pagada ? (
                      <>
                                    <h1 className="font-serif text-2xl text-[#001f14]">¡Reserva confirmada!</h1>
                                    <p className="text-[#3a3a3a] text-sm">
                                                    Tu pago fue procesado con éxito. Te enviaremos los detalles de tu estadía a tu correo electrónico.
                                    </p>
                      </>
                    ) : rechazada ? (
                      <>
                                    <h1 className="font-serif text-2xl text-[#001f14]">Tu pago no pudo ser procesado</h1>
                                    <p className="text-[#3a3a3a] text-sm">
                                                    El pago fue rechazado y tu reserva no quedó confirmada. No se realizó ningún cobro.
                                                    Puedes intentar nuevamente o contactarnos directamente si necesitas ayuda.
                                    </p>
                      </>
                    ) : (
                      <>
                                    <h1 className="font-serif text-2xl text-[#001f14]">Estamos confirmando tu pago</h1>
                                    <p className="text-[#3a3a3a] text-sm">
                                                    Tu solicitud fue recibida. Si el pago ya fue realizado, recibirás la confirmación por correo en unos minutos.
                                                    Si tienes dudas, contáctanos directamente.
                                    </p>
                      </>
                    )}
                                <a href="/" className="mt-3 inline-block rounded-lg py-3.5 px-6 text-[15px] font-semibold bg-[#163428] text-white hover:opacity-90 transition-opacity">
                                            Volver al inicio
                                </a>
                      </div>
              </div>
              <SiteFooter />
        </div>
      );
}

export default function GraciasPage() {
    return (
          <Suspense fallback={null}>
                <GraciasContent />
          </Suspense>
        );
}
</></></></div>
