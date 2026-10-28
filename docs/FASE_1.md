# Etapa 1 — Disponibilidad externa y alcance de datos

Fecha de verificación: 2026-10-28 (America/Managua)

## Validación desde el teléfono Android

Se conectó por ADB un teléfono Android 13 con AnyTracking `5.2.99` (`com.fw.gps.anytracking`). Las pruebas se limitaron a navegación y consultas de lectura. No se modificó la configuración del reloj, no se enviaron comandos remotos y no se almacenaron credenciales, tokens, coordenadas ni respuestas completas.

Flujos comprobados en una sesión autenticada:

| Flujo | Evidencia funcional | Operaciones observadas |
| --- | --- | --- |
| Panel principal | Menús de localización en tiempo real, recorridos, salud, llamadas, alertas y ajustes | Actualización de estado/alertas en segundo plano |
| Localización en tiempo real | Abre `DeviceTracking` y muestra un mapa | `GetTracking`, `GetDeviceStatus`, `GetDeviceSetInfo`, `GetAddressByLatlng`, `GetNewWarn` |
| Historial de hoy | Abre `DeviceHistoryView` con mapa, progreso y velocidad | `GetDevicesHistory`, `GetDeviceStatus`, `GetNewWarn` |
| Salud | Abre `Healthy` con los módulos de salud disponibles | Conexión autenticada con `www.igps123.com`; no se ejecutó una medición ni una consulta individual |
| Presión/frecuencia | Abre `DataSheet` con gráfico semanal de sistólica, diastólica y pulsaciones | `GetJiankang`, `GetDeviceStatus`, `GetDeviceSetInfo`, `GetDevicesHistory`, `GetNewWarn` |
| Oxígeno en sangre | Abre `BloodOxygen` con histórico semanal | `GetXueyang`, `GetJiankang`, `GetDeviceStatus`, `GetDeviceSetInfo`, `GetDevicesHistory`, `GetNewWarn` |
| Temperatura de la piel | Abre `MeasuingBodyTemperature` con histórico semanal | `GetTemperature`, `GetXueyang`, `GetJiankang`, `GetDeviceStatus`, `GetDeviceSetInfo`, `GetDevicesHistory`, `GetNewWarn` |

La instrumentación de la app revela mensajes `*Response` y `*Result` para esas operaciones, compatibles con un servicio SOAP/ASMX. La app realiza consultas autenticadas contra la infraestructura de `igps123.com`; también contacta servicios auxiliares del proveedor y servicios de mapas. La captura de log no expone las rutas completas ni el cuerpo de SOAP, por lo que no se deben inferir parámetros, tokens o formato final sin una captura de red autorizada.

La hoja de presión/frecuencia abrió directamente datos históricos de siete días con las series sistólica, diastólica y pulsaciones. Para la semana visualizada no había mediciones. Abrir esta vista no mostró controles de inicio de medición y no se ejecutó ninguna acción sobre el reloj. `GetJiankang` ("salud" en chino) es la primera operación autenticada confirmada para el histórico de salud.

Oxígeno y temperatura también se presentan como históricos semanales y se abrieron sin iniciar una medición. Sus operaciones específicas confirmadas son `GetXueyang` (oxígeno) y `GetTemperature` (temperatura). La pantalla de oxígeno muestra la unidad `mmHg`, que no es la unidad habitual para saturación periférica; la interfaz contiene traducciones/unidades inconsistentes. Esto es una razón adicional para guardar unidad literal de origen y no derivar conclusiones médicas en el panel propio.

### Datos de salud visibles como capacidades de este reloj

La pantalla autenticada **Salud** muestra específicamente:

- alarma de medicinas;
- control de pasos;
- oxígeno en sangre;
- presión arterial y frecuencia cardíaca;
- temperatura de la piel.

Que los módulos estén visibles no demuestra todavía que haya histórico descargable ni que los valores sean clínicamente válidos. El futuro panel los deberá presentar como telemetría de un dispositivo de consumo, con fecha/hora de origen y sin interpretación diagnóstica.

## Hallazgos verificados

- El enlace de seguimiento proporcionado está alojado en `igps123.com` y responde mediante HTTPS.
- Sin una sesión autenticada, `Tracking.aspx` redirige al inicio de sesión. Por tanto, el identificador y el parámetro del enlace no habilitan acceso autónomo a la ubicación.
- El inicio de sesión es un formulario ASP.NET tradicional: `POST` con `ASP.NET_SessionId`, `__VIEWSTATE` y `__EVENTVALIDATION`; no aparece una API JSON pública desde la página de inicio.
- La página ofrece dos modalidades: **cuenta** y **ID/placa de dispositivo**.
- Una captura suministrada por el titular confirma que, al menos para una de las cuentas, el modo **Cuenta** inicia sesión correctamente y redirige a `Monitor.aspx?rt=1`.
- La reproducción de ese inicio de sesión mediante una petición HTTP de bajo nivel fue rechazada, aun imitando el formulario. El portal depende de información adicional del navegador o de una validación de sesión que no conviene adivinar. No se hicieron más intentos automatizados.
- El HTML público referencia el APK `AnyTracking` del proveedor `iotsafe.net`. Es una pista útil para investigar el tráfico de la aplicación, pero no confirma aún qué API consume la versión instalada en los teléfonos.
- El APK público fue inspeccionado estáticamente (sin ejecutarlo). Contiene la URL `http://app.igps123.com/openapiv3.asmx`, indicio de un servicio ASP.NET ASMX/SOAP. La documentación WSDL no fue entregada públicamente por el servidor durante la comprobación; esto no prueba que el servicio no funcione para clientes autenticados.
- El APK contiene operaciones con nombres compatibles con lectura de datos: `GetDeviceList`, `GetDeviceDetail`, `GetDeviceStatus`, `GetDevicesHistory`, `GetMonitorByUserID`, `GetTemperature`, `GetCommandList`, `GetGeofence` y `GetWifiGeofence`. También contiene `SendCommandByAPP`; queda fuera del alcance de la primera integración porque puede modificar el reloj.
- Las clases de la aplicación incluyen `BloodOxygen`, `HeartRateAndBloodPressure`, `MeasuingBodyTemperature`, `Monitoring`, `DeviceHistory`, `AlarmSet`, `PhoneBook` y `VoiceComm`.

## Evidencia visual del panel autenticado

La captura del panel autenticado confirma que la plataforma web expone, para al menos un reloj:

- mapa con última posición;
- actualización periódica automática;
- conteos de dispositivos en línea y fuera de línea;
- lista de dispositivos asociados a la cuenta;
- estado y tiempo desde la última posición;
- reproducción/consulta de recorrido;
- estadísticas;
- menú adicional de acciones y detalles del dispositivo.

La captura contiene ubicación precisa e identificadores del dispositivo. Esos valores no se transcriben ni se guardan en el proyecto.

## Interpretación

La arquitectura observada coincide con la hipótesis inicial: el navegador y la app consultan un servidor del proveedor y el servidor entrega la información que ha recibido de cada reloj. No se ha observado comunicación directa navegador → reloj.

Hay evidencia estática de que el producto AnyTracking contempla ubicación, historial, estado, geocercas, alarmas, oxígeno en sangre, frecuencia cardíaca/presión y temperatura corporal. Sin una sesión válida no es posible confirmar qué campos devuelve cada una de estas dos cuentas ni la calidad/frecuencia de cada medición. Los nombres descubiertos describen capacidades potenciales de la app y **no prueban** que ambos relojes tengan cada sensor habilitado.

La validación dinámica ya confirmó las capacidades de ubicación, estado, alertas e historial de **una** cuenta/reloj, y confirmó los módulos de salud visibles para ese mismo reloj. Falta repetir las mismas pruebas de lectura con la segunda cuenta para saber si sus capacidades son equivalentes.

Actualización: la segunda cuenta inició sesión correctamente en AnyTracking y su vista `DeviceTracking` también cargó un mapa y marcador. Se confirmaron para ella `GetTracking`, `GetDeviceStatus`, `GetDeviceSetInfo`, `GetAddressByLatlng` y `GetNewWarn`. Por tanto, ambos relojes cuentan con ubicación en tiempo real y el mismo conjunto base de consultas de estado/alertas. La sesión de la app fue restaurada a la cuenta que estaba abierta antes de las pruebas.

El endpoint encontrado en el APK usa `HTTP`, no `HTTPS`. No se deberá replicar tráfico con credenciales ni operar una integración productiva sobre HTTP; la captura de red debe determinar si la app vigente usa otro host HTTPS o un mecanismo adicional de protección.

## Bloqueador actual

El acceso web está confirmado manualmente, pero su secuencia no es replicable todavía con una petición HTTP aislada. Antes de construir una integración se necesita capturar una sesión funcional de la aplicación o confirmar con el vendedor:

1. la plataforma web exacta asociada a esos relojes;
2. el tipo de usuario de cada acceso (cuenta, ID de dispositivo, administrador o app exclusiva);
3. si existe API oficial, documentación o acceso de desarrollador;
4. los identificadores del dispositivo (IMEI/ID) y, si aplica, su contraseña de dispositivo.

## Prueba recomendada en el teléfono

Con autorización del titular y **sin compartir capturas con ubicaciones o tokens**, usar un proxy de depuración local (por ejemplo, mitmproxy/Charles) en la red Wi‑Fi controlada:

1. Abrir la aplicación y autenticar una sola cuenta.
2. Registrar la solicitud de inicio de sesión y las peticiones de: lista de dispositivos, ubicación actual, historial, batería/estado, alertas y mediciones de salud.
3. Para cada solicitud, anotar dominio, ruta, método, parámetros, formato de respuesta, caducidad de token y frecuencia de actualización. Enmascarar valores sensibles.
   - Priorizar las acciones equivalentes a: inicio de sesión, `GetDeviceList`, `GetDeviceDetail`, `GetDeviceStatus`, `GetDevicesHistory`, `GetMonitorByUserID` y `GetTemperature`.
4. Repetir con la segunda cuenta.
5. Comparar si ambas usan el mismo dominio y contrato de datos.

No enviar comandos al reloj durante esa captura. La primera meta es únicamente lectura e inventario.

## Criterio para pasar a etapa 2

Avanzar cuando se pueda demostrar, por una API oficial o por tráfico autorizado de la app, que se pueden leer de forma estable al menos:

- identificador pseudonimizado del reloj;
- última posición y fecha/hora de actualización;
- estado de conectividad/batería, si se expone;
- eventos o indicadores de salud disponibles y su unidad/frecuencia;
- límites de consulta, autenticación y renovación de sesión.

La solución propia deberá hacer solo operaciones de lectura hasta que se evalúe explícitamente el riesgo de los comandos remotos.

## Arquitectura recomendada para la etapa 2

No se debe intentar combinar las dos cuentas dentro del portal del proveedor. El servicio propio tendrá un **conector aislado por cuenta**: cada conector mantendrá su propia sesión/token, hará consultas de solo lectura y entregará datos normalizados a una base de datos propia. El panel web consultará únicamente esa base y así mostrará ambos relojes en un mismo mapa.

Modelo mínimo:

- `devices`: alias familiar, cuenta fuente y capacidades confirmadas;
- `location_snapshots`: fecha/hora de origen, latitud/longitud, precisión/tipo de ubicación y estado de actualización;
- `device_status`: conectividad, batería y señal, solo si el proveedor los expone;
- `health_measurements`: tipo, valor, unidad, fecha/hora de origen y calidad de dato;
- `events`: SOS, geocerca, desconexión u otras alarmas confirmadas.

Indicadores iniciales útiles: última actualización, reloj sin reporte, ubicación reciente, tendencia de mediciones disponibles y alertas. Los valores de salud se presentarán como telemetría del reloj, no como diagnóstico médico.

## Siguiente validación recomendada

1. Repetir historial y salud con la segunda cuenta si se quiere confirmar que sus sensores/capacidades coinciden con los del primer reloj.
2. Capturar mediante proxy HTTPS autorizado el inicio de sesión y cada consulta SOAP, enmascarando todo secreto y ubicación. Con eso se define el adaptador reproducible del VPS.
3. Evaluar por separado cualquier acción que ordene una medición. Una orden de medición no debe ejecutarse automáticamente desde el futuro panel.
