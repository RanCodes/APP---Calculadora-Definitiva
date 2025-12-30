# Backups de la app

Los archivos XLSX generados desde la funcionalidad de respaldo pueden guardarse aquí cuando corras el contenedor con docker-compose. El volumen mapea esta carpeta al directorio `/usr/share/nginx/html/backups` dentro del contenedor para que:

- Tengas los respaldos persistidos fuera del navegador/contendedor.
- Puedas servirlos o descargarlos desde `http://localhost:8080/backups/` si mantienes el volumen montado.

Coloca en esta carpeta los archivos que quieras compartir o versionar como respaldo base.
