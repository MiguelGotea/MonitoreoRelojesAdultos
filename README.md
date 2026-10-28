# Monitoreo de relojes para adultos mayores

Proyecto por etapas para centralizar, de forma segura, la ubicación, el estado y los indicadores que exponen dos relojes para adultos mayores.

## Despliegue

El servicio se ejecuta aislado con PM2 en `/root/monitoreo-relojes-adultos` y publica el puerto dedicado `3108`, igual que el proyecto de referencia `Presupuestos_Ferreterias`. Incluye un panel privado, actualización manual protegida y un ciclo de sincronización de solo lectura. El acceso externo se realiza en `http://IP_DEL_VPS:3108/`; el contenido requiere las credenciales propias definidas en `/root/monitoreo-relojes-adultos/.env`.

Cada `push` a `main` ejecuta [deploy.yml](.github/workflows/deploy.yml), usando los secrets `VPS_HOST`, `VPS_USER` y `SSH_PRIVATE_KEY`. En el primer despliegue el VPS clona el repositorio; por ello el repositorio debe permanecer público o el VPS debe contar con una credencial de lectura de GitHub.

La carpeta `data/`, `logs/` y el archivo `.env` se mantienen exclusivamente en el VPS y están excluidos de Git. El panel rechaza todo acceso hasta que su usuario y contraseña propios estén configurados.

El primer deploy crea `/root/monitoreo-relojes-adultos/.env` con permisos privados si aún no existe. Completa ahí `DASHBOARD_USER`, `DASHBOARD_PASSWORD` y las dos parejas `IGPS_*_ACCOUNT` / `IGPS_*_PASSWORD`; después reinicia el proceso con `pm2 restart monitoreo-relojes-adultos`. Nunca copies ese archivo al repositorio.

## Publicar cambios

Desde la raíz del proyecto, usa `\.scripts\gitpush.ps1 "mensaje del cambio"`. El script sincroniza `main`, resuelve el flujo de conflicto igual que `Herramientas_Personales` y hace el `push` que activa el despliegue. Si detecta valores que parecen secretos en `.env.example`, excluye solo ese archivo del commit y continúa; el archivo `.env` real ya está ignorado por Git.

## Etapas

1. **Validación de acceso y datos** — documentar el proveedor, la autenticación, las solicitudes de la aplicación y los datos realmente disponibles.
2. **Servicio web propio** — integrar ambos relojes en un panel web alojado en un VPS, con histórico e indicadores.
3. **Aplicación para reloj** — diseñar una experiencia de seguimiento resumida para watchOS/Wear OS según el dispositivo de destino.

## Estado de la etapa 1

Se creó el inventario inicial en [docs/FASE_1.md](docs/FASE_1.md). Aún no hay integración ni credenciales guardadas en este repositorio.

## Seguridad

- Las credenciales, teléfonos, IMEI, enlaces con tokens, cookies y ubicaciones precisas no se deben incluir en el código, documentación versionada ni capturas compartidas.
- Al implementar la etapa 2 se usarán variables de entorno y un gestor de secretos del VPS.
- El acceso al panel propio deberá requerir autenticación y HTTPS.

