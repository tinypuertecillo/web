'use client';

import React from 'react';
import HuespedesAdmin from './HuespedesAdmin';

// Ajustes: por ahora solo la capacidad por cabaña. Aquí irán los ajustes que no son precios.
export default function AjustesAdmin() {
  return (
    <div style={{ maxWidth: 960 }}>
      <HuespedesAdmin precioBase={null} parte="capacidad" />
    </div>
  );
}
