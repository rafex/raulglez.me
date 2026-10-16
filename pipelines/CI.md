# CI

Gates automáticos ejecutados antes de publicar artefactos.

## Backend portal

El workflow `publish_backend.yml` instala las dependencias del portal backend con Node.js 22 y
ejecuta `npm test`. Ese comando compila TypeScript y valida las reglas de seguridad del chat,
el rechazo de aliases públicos de IA, la autenticación de las rutas administrativas, la proyección
pública del CV y los límites del formulario de contacto. Si falla cualquier caso, la imagen no se
publica.
