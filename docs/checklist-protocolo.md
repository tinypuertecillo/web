# Checklist del protocolo de pruebas: Tiny Puertecillo

Actualizado: 2026-10-25. Protocolo completo: `_cerebro/recursos-compartidos/protocolo-pruebas.md`.

## Hecho
- [x] Protocolo general escrito en Cerebro y enlazado (INDICE y CLAUDE.md)
- [x] Línea base de seguridad de Tiny (hallazgos en la ficha)

## URGENTE: datos abiertos en Supabase
- [x] Mover la página `/marketing` a `/api/admin/marketing` protegida (hecho en local 2026-10-25, sin commit; probado: sin sesión 401, validaciones 400; lectura probada en local con la llave nueva: contactos 1107, mensajes 8, trazabilidad 100; sin sesión 401)
- [x] Mario: actualizar `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (hecho 2026-10-25, llave `sb_secret_` nueva, funciona)
- [x] Mario revisó `/marketing` en local; commit `94431bb` y push a la rama `proteger-datos-marketing` (2026-10-25)
- [x] PR #11 mergeado y publicado en producción (commit `06dc7b2`, 2026-10-25); sin sesión todo da 401 como se espera
- [x] Mario probó en producción: con sesión de admin `/marketing` mostró los 1107 contactos; en ventana privada, sin sesión, no muestra nada (la protección funciona)
- [x] Decisión de Mario: eliminar la página `/marketing` (hecho en local en la rama `eliminar-pagina-marketing`; PR #12 mergeado y publicado, commit `b26b67b`; rutas borradas dan 404 y el sitio sigue bien)
- [x] SQL `supabase_cerrar_acceso_publico.sql` ejecutado por Mario (2026-10-25); prueba con la llave pública: 9 tablas dan 401; la llave de servicio sigue leyendo todo
- [ ] Después del SQL: Mario abre `app.tinypuertecillo.cl` y confirma que los contactos cargan (la app usa solo la llave de servicio en su servidor)
- [ ] Decidir respaldos: exportación manual periódica o plan Pro (Mario)

## Corregir hallazgos de Tiny (en local, sin commit hasta que Mario revise)
- [x] Quitar la contraseña de admin por defecto del código (hecho en local; `ADMIN_PASSWORD` sí existe en Vercel, así que es seguro publicarlo)
- [x] Proteger `/api/send-test` con la sesión de admin (hecho en local; la página /marketing la usa, por eso no se borra). Nota: el sitio no tiene `BREVO_API_KEY` en Vercel, así que esa ruta hoy no envía nada en producción
- [ ] `/api/sync-contacts`: exigir `SYNC_SECRET` y sacar la clave de Ecomoving del código
- [x] Pago Flow: no duplicar bloqueos, revisar monto y fechas (hecho en local, rama `mejorar-pago-login-cabeceras`; **probar con Flow sandbox**)
- [x] Límite de intentos en el login de admin (hecho en local; 5 fallos por IP en 15 min)
- [x] Avisar si falta la llave de servicio (hecho en local; Vercel sí tiene `SUPABASE_SERVICE_ROLE_KEY`)
- [x] Cabeceras de seguridad (hecho en local; falta una CSP con `script-src`, que se prueba aparte)

## Pendiente de Mario
- [ ] Llaves de Flow sandbox en `.env.local` (`FLOW_API_KEY`, `FLOW_SECRET_KEY`)
- [ ] `ADMIN_PASSWORD` en Vercel ya existe; cambiarla solo si alguna vez se compartió
- [ ] Confirmar que producción usa `FLOW_API_URL` real (la variable existe en Vercel; Mario mira el valor en el panel, yo no lo leo)
- [x] `send-test`: se protegió con sesión de admin (la página /marketing la usa)
- [ ] Cuentas de UptimeRobot y Sentry, y correo de avisos

## Habilitar autonomía (Mario, una vez; detalle en `protocolo-autonomia.md`)
- [ ] Iniciar sesión en Supabase, Vercel, Flow sandbox y Cloudflare en la ventana de Claude in Chrome
- [ ] Reconectar el conector de Supabase con la cuenta de Tiny (o usar la sesión de Chrome)
- [ ] `npx wrangler login` (Cloudflare) y `vercel login` (cuenta de Tiny)

## Niveles del protocolo
- [x] Revisar permisos (RLS) de la base de Supabase de Tiny (hecho 2026-10-25, ver arriba)
- [ ] Nivel 1: GitHub Actions, gitleaks, Dependabot
- [ ] Nivel 2: Playwright (pago, doble reserva, datos hostiles)
- [ ] Nivel 3: revisión semanal (ZAP, Lighthouse, cabeceras)
- [ ] Nivel 5: UptimeRobot y Sentry
- [ ] Nivel 4: lista antes de entregar, anotada en la ficha

## Sincronización con Ecomoving (decidir)
- [ ] Mario: confirmar si el trigger `sync_contacts_to_tiny_puertecillo` sigue activo en la base de Ecomoving (solo mirar)
- [ ] Borrar `/api/sync-contacts`, sacar la llave de Ecomoving del código y quitar `SYNC_SECRET` de Vercel (si la carga fue única)
- [ ] Revisar si la base de Ecomoving responde a la llave pública (misma prueba de solo conteo)

## Revisión de secretos en GitHub
- [x] Tiny (2026-10-25): sin `.env` en el historial; 1 llave pública de Ecomoving en el código (ver arriba); sin llaves secretas
- [ ] Replicar en cada proyecto al abordarlo (CargaBoxApp, CargaBoxSitio, ecomoving-site, EcomovingApp, ProduccionApp, PubliboxApp, FurgonApp, ProspeccionApp, landings y sitios)

## Después
- [ ] Replicar el protocolo en ProduccionApp, FurgonApp, ProspeccionApp, sitios y landings
