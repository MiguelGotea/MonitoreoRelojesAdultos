# Etapa 2 — Panel web centralizado

Estado: **completada** el 2026-10-28 (America/Managua).

## Servicio desplegado

- Directorio aislado: `/root/monitoreo-relojes-adultos`.
- Proceso PM2: `monitoreo-relojes-adultos`.
- Puerto público dedicado: `3108/tcp`, autorizado en UFW.
- Acceso: `http://IP_DEL_VPS:3108/`.
- Actualización: cada cinco minutos y bajo demanda desde el panel.
- Persistencia privada: `data/store.json` en el VPS.

El servicio se despliega con cada `push` a `main` mediante GitHub Actions. El flujo de publicación local está en `.scripts/gitpush.ps1`.

## Funcionalidad entregada

- Inicio de sesión independiente para cada una de las dos cuentas del proveedor.
- Consolidación de los relojes disponibles en un único panel.
- Consulta de solo lectura mediante `Login` y `GetTracking`.
- Visualización de última actualización, estado, dirección, batería, temperatura reportada, velocidad y coordenadas cuando el proveedor las entrega.
- Actualización manual protegida y actualización periódica.
- Panel protegido con autenticación Basic propia; las credenciales del proveedor no se muestran al usuario.

## Configuración privada

El archivo `/root/monitoreo-relojes-adultos/.env` contiene el usuario y clave del panel, además de las credenciales de las dos cuentas. Tiene permisos privados y está excluido de Git. Nunca debe copiarse al repositorio, documentación, capturas ni mensajes.

## Seguridad y límites operativos

- El servicio no ejecuta comandos remotos sobre los relojes.
- La telemetría de salud es informativa y no constituye diagnóstico médico.
- El panel se publica actualmente por HTTP para replicar el patrón de la herramienta de referencia. Antes de compartirlo fuera del grupo autorizado se debe configurar un dominio, certificado TLS y HTTPS.
- El endpoint `/healthz` es público y únicamente devuelve el estado técnico del servicio; el panel y sus datos requieren autenticación.

## Trabajo futuro

La etapa 3 (aplicación para reloj) queda aplazada. Cualquier ampliación futura de salud, historial, alertas avanzadas, mapa y HTTPS deberá planificarse como una etapa independiente, sin habilitar comandos del proveedor por defecto.
