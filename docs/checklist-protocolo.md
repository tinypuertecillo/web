# Checklist del protocolo de pruebas: Tiny Puertecillo

Actualizado: 2026-10-25 (noche). Protocolo completo: `_cerebro/recursos-compartidos/protocolo-pruebas.md`. Autonomía y qué debe habilitar Mario: `protocolo-autonomia.md`.

## Pendiente de Mario (en orden de importancia)
- [ ] Confirmar que `ADMIN_PASSWORD` de Vercel **no** es `tinypuertecillo-admin-2026`. El repo del sitio es público y esa clave está en su historial; si es la misma, cambiarla hoy por una larga y redesplegar
- [ ] Decidir si el repo `tinypuertecillo/web` pasa a privado (recomendado; Vercel sigue publicando igual)
- [ ] Quitar `SYNC_SECRET` de las variables de Vercel del sitio y de su `.env.local` (ya no se usa)
- [ ] Guardar la frase `BACKUP_PASSPHRASE` en un gestor de claves (sin ella los respaldos no se abren)
- [ ] Mirar en el panel de Vercel que `FLOW_API_URL` apunte a Flow real y no al sandbox (la variable existe; yo no leo su valor)
- [ ] Cuentas gratis de UptimeRobot y Sentry, y el correo donde quiere los avisos
- [ ] Habilitar autonomía (una vez): iniciar sesión en Supabase, Vercel, Flow sandbox y Cloudflare en la ventana de Claude in Chrome; `vercel login`; `npx wrangler login`
- [ ] Confirmar con Airbnb que los descuentos (17 % y 20 %) estén alineados antes de publicarlos en correos o redes

## Pendiente de Claude
- [ ] Probar una restauración real del respaldo en una base de pruebas vacía (necesita un proyecto Supabase gratis aparte; lo guía Claude)
- [ ] `flow/create`: si Flow rechaza crear el pago, queda una reserva `pendiente` huérfana (borrarla o marcarla `rechazada`)
- [ ] CSP completa con `script-src` (requiere nonces; se prueba aparte)
- [ ] Nivel 1: GitHub Actions en el sitio, gitleaks, Dependabot
- [ ] Nivel 2: Playwright (pago con Flow sandbox, doble reserva, datos hostiles). El pago ya se probó a mano el 2026-10-25
- [ ] Nivel 3: revisión semanal automática (ZAP, Lighthouse, cabeceras)
- [ ] Nivel 5: UptimeRobot y Sentry (depende de las cuentas de Mario)
- [ ] Nivel 4: lista antes de entregar, anotada en la ficha
- [ ] Observar el primer pago real en Vercel (buscar `CONFLICTO DE FECHAS` o `Monto distinto` en los registros)
- [ ] Replicar el protocolo en las demás apps, sitios y landings (ProduccionApp, FurgonApp, ProspeccionApp, CargaBox, Ecomoving): empezar siempre con la revisión de secretos en GitHub y la visibilidad del repo

## Hecho (2026-10-25)
**Datos abiertos en Supabase (cerrado)**
- [x] Línea base de seguridad de Tiny
- [x] `/marketing` protegido (PR #11, `06dc7b2`) y luego eliminado del sitio (PR #12, `b26b67b`); la app real es `app.tinypuertecillo.cl`
- [x] SQL `supabase_cerrar_acceso_publico.sql` ejecutado por Mario: con la llave pública las 9 tablas dan 401; la llave de servicio sigue leyendo todo
- [x] Mario confirmó que `app.tinypuertecillo.cl` sigue cargando los contactos
- [x] Llave de servicio de `.env.local` renovada (`sb_secret_`)

**Código del sitio**
- [x] Contraseña de admin por defecto eliminada; la llave de servicio ya no cae a la pública
- [x] `/api/send-test` y `/api/cron` eliminados junto con `/marketing`
- [x] Pago Flow: sin bloqueos duplicados, con revisión de monto y de fechas (PR #13, `38120c1`). Probado con Flow sandbox: aviso repetido, monto distinto y conflicto OK. No probado: rechazo tardío
- [x] Login de admin: máximo 5 fallos por IP en 15 min
- [x] Cabeceras de seguridad (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, CSP mínima)
- [x] Llaves de Flow sandbox en `.env.local`, verificadas

**Ecomoving**
- [x] Decisión de Mario: eliminar toda relación Tiny–Ecomoving
- [x] Mario ejecutó en la base de Ecomoving el `DROP TRIGGER` y `DROP FUNCTION` del aviso a Tiny
- [x] `/api/sync-contacts` y `supabase_webhook_trigger.sql` eliminados del sitio (PR #14, `4b45cc1`)

**Respaldos**
- [x] Decisión de Mario: respaldos periódicos gratis, sin plan Pro
- [x] Repo privado `tinypuertecillo/respaldos-bd`: respaldo semanal cifrado (lunes 07:00 UTC, 90 días)
- [x] Secretos puestos por Mario y primer respaldo real exitoso: 14 tablas, artefacto `respaldo-2026-10-25`
- [x] Recordatorio mensual (día 1, 10:00) que revisa que los respaldos sigan corriendo

**Protocolo y autonomía**
- [x] Protocolo de pruebas, protocolo de autonomía y skill `revision-proyecto` en Cerebro
- [x] Revisión de secretos en GitHub (sin `.env` en el historial; 1 llave pública de Ecomoving, ya eliminada del código)
- [x] Descuentos vigentes confirmados por Mario: 17 % por 2 noches y 20 % por 3 o más

## Resumen
Hechos: 21 · Pendientes de Mario: 8 · Pendientes de Claude: 10
