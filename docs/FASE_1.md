# Etapa 1 — Validación de acceso y datos

Estado: **completada** el 2026-10-28 (America/Managua).

## Alcance y seguridad de la validación

Las verificaciones se realizaron con autorización del titular, usando AnyTracking `5.2.99` en Android. Fueron únicamente consultas de lectura: no se enviaron comandos, no se modificaron ajustes de los relojes y no se guardaron credenciales, identificadores, tokens, coordenadas ni respuestas de producción en el repositorio.

## Hallazgos confirmados

- Los dos accesos familiares funcionan de forma independiente y cada uno muestra su reloj asociado.
- La aplicación y el portal consultan la plataforma del proveedor; no se observó comunicación directa entre el navegador y el reloj.
- El APK utiliza el servicio SOAP/ASMX `openapiv3.asmx` del proveedor. El inicio de sesión de estas cuentas utiliza `LoginType=1`.
- `Login` devuelve el dispositivo asociado y una clave de contexto temporal por dispositivo. Esa clave es necesaria para consultar `GetTracking`.
- La consulta `GetTracking` devolvió, de forma validada, estado, fecha/hora de posición, latitud, longitud, velocidad, rumbo, estado GPS/movimiento y temperatura reportada.
- Se observaron además operaciones de lectura para estado, alertas, historial, presión/frecuencia, oxígeno y temperatura: `GetDeviceStatus`, `GetDeviceSetInfo`, `GetNewWarn`, `GetDevicesHistory`, `GetJiankang`, `GetXueyang` y `GetTemperature`.

La aplicación expone módulos de localización, recorridos, alertas y salud. Los datos de salud deben tratarse como telemetría de consumo; no son un diagnóstico médico ni se confirmó aún la disponibilidad de históricos para ambos dispositivos.

## Resultado de la etapa

Se confirmó que es viable centralizar ambos relojes mediante un conector independiente por cuenta, obteniendo una sesión nueva en cada ciclo y usando solo operaciones de lectura. La implementación inicial de la etapa 2 usa `Login` y `GetTracking`; no usa ni habilita métodos de comando remoto como `SendCommandByAPP`.

## Límites conocidos

- El servicio del proveedor utiliza HTTP en el contrato identificado. Las credenciales se mantienen únicamente en el VPS y el conector debe limitarse a consultas de lectura.
- El proveedor puede cambiar su contrato, disponibilidad o frecuencia de datos sin aviso.
- La ampliación a históricos y mediciones de salud requerirá validar los campos, unidades y fechas devueltos antes de mostrarlos como indicadores.

La aplicación para reloj y cualquier función que pueda controlar el dispositivo quedan fuera del alcance actual y se consideran trabajo futuro.
