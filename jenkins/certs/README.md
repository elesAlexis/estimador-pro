# Certificados adicionales (opcional)

Copia aquí, con extensión `.crt`, la CA de un antivirus o proxy que inspeccione TLS. Sin ella,
Jenkins no puede descargar plugins ni clonar desde GitHub, y `npm ci` falla dentro de las
imágenes. Git ignora los `.crt` de esta carpeta. Después de agregar o cambiar uno, reconstruye
la imagen con `docker compose up -d --build`.

En una red sin inspección TLS, deja la carpeta como está.
