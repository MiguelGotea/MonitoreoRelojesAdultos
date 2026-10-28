# Monitoreo de relojes para adultos mayores

Proyecto por etapas para centralizar, de forma segura, la ubicación, el estado y los indicadores que exponen dos relojes para adultos mayores.

## Despliegue

El servicio se ejecuta aislado con PM2 en `/root/monitoreo-relojes-adultos` y escucha únicamente en `127.0.0.1:3108`. El reverse proxy y el control de acceso se incorporarán antes de publicar cualquier telemetría.

Cada `push` a `main` ejecuta [deploy.yml](.github/workflows/deploy.yml), usando los secrets `VPS_HOST`, `VPS_USER` y `SSH_PRIVATE_KEY`. En el primer despliegue el VPS clona el repositorio; por ello el repositorio debe permanecer público o el VPS debe contar con una credencial de lectura de GitHub.

La carpeta `data/`, `logs/` y el archivo `.env` se mantienen exclusivamente en el VPS y están excluidos de Git.

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

