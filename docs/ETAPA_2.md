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

## Ampliación: mapa, recorrido y telemetría

- El mapa utiliza Leaflet con teselas de OpenStreetMap; no requiere una clave de Google ni incorpora una clave de mapas en el repositorio.
- Cada página abierta empieza un recorrido propio. El navegador añade un punto solamente si la coordenada cambia y dibuja la línea correspondiente por reloj. El botón **Borrar líneas** elimina ese recorrido local y el siguiente punto inicia uno nuevo.
- El servicio continúa consultando al proveedor como máximo cada cinco minutos (`REFRESH_SECONDS=300` por defecto), una frecuencia prudente para seguimiento de consumo. El navegador lee el último estado cada 30 segundos, sin crear nuevas consultas al reloj.
- Cuando el proveedor no entrega una dirección útil, el servicio hace geocodificación inversa con Nominatim/OpenStreetMap y conserva en memoria el resultado para esas coordenadas. Se limita a una solicitud por segundo. La función se puede apagar con `GEOCODING_ENABLED=false`.
- El texto de estado y batería se separan: si el proveedor entrega un estado compuesto como `2-Batería:79% GSM:Fine`, el campo Batería muestra `79%` y Estado conserva el texto original.
- La pestaña Salud presenta la temperatura ya confirmada por `GetTracking`. Aunque se identificaron métodos del proveedor para presión/frecuencia, oxígeno y temperatura, sus parámetros, campos, unidades y fechas de respuesta no quedaron validados en la etapa 1. Por seguridad de interpretación, todavía no se realizan esas llamadas ni se presentan resultados como datos de salud.

## Configuración privada

El archivo `/root/monitoreo-relojes-adultos/.env` contiene el usuario y clave del panel, además de las credenciales de las dos cuentas. Tiene permisos privados y está excluido de Git. Nunca debe copiarse al repositorio, documentación, capturas ni mensajes.

## Seguridad y límites operativos

- El servicio no ejecuta comandos remotos sobre los relojes.
- La telemetría de salud es informativa y no constituye diagnóstico médico.
- La geocodificación comparte la coordenada actual con Nominatim cuando está activada. No se persiste el recorrido de la página en el servidor; se descarta al cerrar o recargar la pestaña.
- El panel se publica actualmente por HTTP para replicar el patrón de la herramienta de referencia. Antes de compartirlo fuera del grupo autorizado se debe configurar un dominio, certificado TLS y HTTPS.
- El endpoint `/healthz` es público y únicamente devuelve el estado técnico del servicio; el panel y sus datos requieren autenticación.

## Trabajo futuro

La etapa 3 (aplicación para reloj) queda aplazada. Cualquier ampliación futura de salud, historial, alertas avanzadas, mapa y HTTPS deberá planificarse como una etapa independiente, sin habilitar comandos del proveedor por defecto.
