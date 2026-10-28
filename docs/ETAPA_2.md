# Etapa 2 — Servicio privado en VPS

## Implementado

- Proceso PM2 aislado en `/root/monitoreo-relojes-adultos`.
- Panel HTTP interno en `127.0.0.1:3108` con autenticación Basic propia.
- Sincronización manual y automática cada cinco minutos.
- Persistencia local en `data/store.json`, con permisos de propietario.
- Conectores independientes por cuenta para que ambos relojes se unifiquen en una misma vista.
- Solo operaciones SOAP de lectura: `Login` y `GetTracking`.

## Contrato validado

AnyTracking 5.2.99 utiliza SOAP 1.1 contra `openapiv3.asmx`. El acceso de usuario emplea `LoginType=1`. Un inicio de sesión válido devuelve la lista de dispositivos y una clave de contexto por dispositivo; esa clave es necesaria para que `GetTracking` entregue la posición actual. La integración obtiene la clave en memoria para cada ciclo y no la almacena en Git ni en el panel.

`GetTracking` confirmó campos de estado, hora de posición, latitud, longitud, velocidad, rumbo, estado de movimiento/GPS y temperatura. La normalización conserva únicamente los campos que el panel pueda presentar sin modificar el reloj.

## Operación segura

1. Mantener el proceso escuchando solo en `127.0.0.1`.
2. Publicarlo únicamente mediante un reverse proxy HTTPS con autenticación adicional, si se requiere acceso externo.
3. No habilitar `SendCommandByAPP` ni ningún método que modifique el reloj.
4. Tratar temperatura y cualquier valor de salud como telemetría de consumo, no como diagnóstico.
