# Guía de Despliegue para Hosting (React + Laravel)

Esta guía detalla los pasos para desplegar tu proyecto (Frontend en React y Backend en Laravel) en un entorno de producción, como un hosting compartido (ej. cPanel) o un VPS.

## 1. Preparar el entorno de Producción (Local)

Antes de subir los archivos, debes compilar el frontend y asegurar que el backend esté listo.

### Compilar el Frontend (React)
1. Abre tu terminal y ve a la carpeta del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias (si no lo has hecho):
   ```bash
   npm install
   ```
3. Compila el proyecto para producción:
   ```bash
   npm run build
   ```
   *Esto generará una carpeta llamada `dist` dentro de `frontend/`.*

### Preparar el Backend (Laravel)
No necesitas compilar nada en local para el backend, pero debes asegurarte de subir los archivos correctos y configurar la base de datos más adelante.

## 2. Estructura de Archivos en el Hosting

En un hosting compartido típico (con cPanel), la carpeta pública a la que accede la gente se llama `public_html`. Tu proyecto tiene una estructura unificada, por lo que la forma más limpia de subirlo es:

1. Sube **todo el contenido** de tu proyecto al nivel superior o al `public_html` dependiendo de cómo esté configurado tu dominio principal.
2. Si tienes un hosting compartido y quieres que el dominio principal cargue tu sistema:

### Opción A: Despliegue en Carpeta Raíz (Recomendado)

Sube la estructura de tal forma que los archivos queden así en tu hosting:
- `/public_html/backend/` (Aquí va todo el contenido de tu carpeta backend)
- `/public_html/.htaccess` (El archivo .htaccess que tienes en la raíz de tu proyecto)
- `/public_html/index.php` (El archivo index.php que tienes en la raíz de tu proyecto)

**Importante:** Copia los archivos generados del Frontend:
- Copia **todo el contenido** de la carpeta `frontend/dist/` directamente dentro de `/public_html/`.

De esta forma, al entrar a tu dominio, por defecto se leerá el `index.html` generado por React, y tu API o backend en Laravel funcionará gracias al archivo `index.php` y las reglas del `.htaccess`.

## 3. Configuración del Backend (Laravel) en el Hosting

Una vez subidos los archivos, necesitas configurar tu Laravel:

1. **Archivo `.env`:**
   En la carpeta `backend/`, copia el archivo `.env.example` y renómbralo a `.env` (o edita el `.env` existente). Configura las siguientes variables:
   ```env
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://tudominio.com

   # Configuración de tu base de datos en el hosting
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=nombre_de_tu_base_de_datos
   DB_USERNAME=usuario_de_tu_bd
   DB_PASSWORD=contraseña_de_tu_bd
   ```

2. **Instalar Dependencias de PHP (Composer):**
   Si tienes acceso SSH a tu hosting, entra a la carpeta `backend/` y ejecuta:
   ```bash
   composer install --optimize-autoloader --no-dev
   php artisan key:generate
   ```
   *Nota: Si no tienes SSH en tu hosting, deberás subir la carpeta `vendor/` que generaste en tu entorno local (aunque no es la práctica más recomendada para repositorios, en hosting compartido suele ser necesario si no hay SSH).*

3. **Base de Datos:**
   Si tienes acceso por SSH, corre las migraciones:
   ```bash
   php artisan migrate
   ```
   Si no, exporta tu base de datos local usando phpMyAdmin o similar (archivo `.sql`) e impórtalo en la base de datos de tu hosting mediante su propio phpMyAdmin.

4. **Permisos de Carpetas:**
   Asegúrate de que las carpetas `storage` y `bootstrap/cache` de tu backend tengan permisos de escritura (normalmente permisos 755 o 775):
   ```bash
   chmod -R 775 backend/storage backend/bootstrap/cache
   ```

5. **Optimización (Opcional pero recomendado):**
   Si tienes acceso SSH, ejecuta en la carpeta `backend/`:
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

## 4. Solución de Problemas Comunes

- **El servidor muestra los archivos antiguos en PHP:**
  Revisa tu `.htaccess`. Puede que el servidor siga apuntando a un archivo `index.php` del sistema antiguo. Limpia la caché de tu navegador y verifica que no haya otro archivo `index.php` (o código antiguo) sobreescribiendo tu nueva estructura. Asegúrate de que el `index.html` de React esté en la raíz y configurado como el archivo principal a cargar.
- **Error 500 del servidor:**
  Esto suele ser un error en el `.env` de Laravel (credenciales de BD incorrectas) o permisos denegados en la carpeta `storage`. Revisa el log de errores de Laravel ubicado en `backend/storage/logs/laravel.log`.
- **Las rutas de la API de Laravel no se encuentran (Error 404):**
  Asegúrate de que el archivo `.htaccess` esté configurado correctamente para redirigir el tráfico hacia el `index.php` si no se encuentra un archivo o directorio físico.
- **Rutas de React dan 404 al recargar la página:**
  Como estás usando React Router, asegúrate de que tu `.htaccess` principal redirija todas las peticiones no encontradas al `index.html` antes que al `index.php` de Laravel para las rutas del frontend, o asegúrate de que Laravel sirva la vista principal en cualquier ruta no definida de la API.

## Resumen de Estructura Final en el Hosting (`public_html/`)
```text
/public_html
  /assets/            <-- Viene de frontend/dist/assets
  /backend/           <-- Tu código Laravel
  .htaccess           <-- Archivo modificado para manejar React y Laravel
  index.html          <-- Viene de frontend/dist/ (React)
  index.php           <-- Tu archivo index.php principal de Laravel
  ...                 <-- Otros archivos de la build de React
```
