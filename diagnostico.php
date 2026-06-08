<?php
/**
 * SCRIPT DE DIAGNÓSTICO - BORRAR DESPUÉS DE USAR
 * Sube este archivo a public_html/ y abre: https://bazareducando.com/diagnostico.php
 */

// ⚠️ Clave de seguridad — cambia esto si quieres más seguridad
define('SECRET', 'bazar2026');
if (!isset($_GET['key']) || $_GET['key'] !== SECRET) {
    die('<h2 style="color:red;font-family:sans-serif">Acceso denegado. Usa: diagnostico.php?key=bazar2026</h2>');
}

// Configuración de BD (debe coincidir con tu .env)
$DB_HOST     = '127.0.0.1';
$DB_DATABASE = 'bazaredu_utiles_db';
$DB_USERNAME = 'bazaredu_fac2';
$DB_PASSWORD = 'BazarAdmin2026';

// ── Estilos ──────────────────────────────────────────────────────────────────
echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Diagnóstico del Sistema</title>
<style>
  body { font-family: monospace; background: #1a1a2e; color: #eee; padding: 20px; }
  h1   { color: #e94560; }
  h2   { color: #0f3460; background:#16213e; padding:8px; border-radius:5px; }
  .ok  { color: #4ecca3; }
  .err { color: #e94560; }
  .warn{ color: #ffd460; }
  .box { background:#16213e; padding:15px; border-radius:8px; margin:10px 0; }
  table{ width:100%; border-collapse:collapse; }
  td,th{ padding:8px; border:1px solid #333; text-align:left; }
  th   { background:#0f3460; }
  code { background:#0f3460; padding:2px 6px; border-radius:3px; }
</style></head><body>';

echo '<h1>🔍 Diagnóstico — bazareducando.com</h1>';
echo '<p style="color:#888">Generado: ' . date('Y-m-d H:i:s') . '</p>';

// ── 1. PHP ───────────────────────────────────────────────────────────────────
echo '<h2>1. PHP</h2><div class="box">';
$phpVersion = phpversion();
$phpOk = version_compare($phpVersion, '8.1', '>=');
echo '<p>Versión PHP: <b class="' . ($phpOk ? 'ok' : 'err') . '">' . $phpVersion . '</b>';
echo $phpOk ? ' ✅' : ' ❌ (necesitas PHP 8.1+)';
echo '</p>';

$extensions = ['pdo', 'pdo_mysql', 'mbstring', 'openssl', 'tokenizer', 'xml', 'ctype', 'json', 'fileinfo'];
echo '<p>Extensiones requeridas:</p><table><tr><th>Extensión</th><th>Estado</th></tr>';
foreach ($extensions as $ext) {
    $loaded = extension_loaded($ext);
    echo '<tr><td><code>' . $ext . '</code></td><td class="' . ($loaded ? 'ok' : 'err') . '">' . ($loaded ? '✅ Cargada' : '❌ FALTA') . '</td></tr>';
}
echo '</table></div>';

// ── 2. Base de Datos ─────────────────────────────────────────────────────────
echo '<h2>2. Base de Datos</h2><div class="box">';
try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_DATABASE};charset=utf8mb4",
        $DB_USERNAME,
        $DB_PASSWORD,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo '<p class="ok">✅ Conexión exitosa a <code>' . $DB_DATABASE . '</code></p>';

    // Verificar tablas críticas
    $tablas = ['usuarios', 'ventas', 'productos', 'personal_access_tokens', 'categorias', 'caja'];
    echo '<table><tr><th>Tabla</th><th>Estado</th><th>Registros</th></tr>';
    foreach ($tablas as $tabla) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) as c FROM `{$tabla}`");
            $count = $stmt->fetchColumn();
            echo '<tr><td><code>' . $tabla . '</code></td><td class="ok">✅ Existe</td><td>' . $count . '</td></tr>';
        } catch (Exception $e) {
            echo '<tr><td><code>' . $tabla . '</code></td><td class="err">❌ NO EXISTE</td><td>-</td></tr>';
        }
    }
    echo '</table>';

    // Verificar usuario teylor
    echo '<br><p>Usuarios en la BD:</p>';
    echo '<table><tr><th>ID</th><th>Usuario</th><th>Rol</th><th>Password (primeros 20 chars)</th></tr>';
    $stmt = $pdo->query("SELECT id, usuario, rol, password FROM usuarios LIMIT 10");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($rows)) {
        echo '<tr><td colspan="4" class="err">❌ No hay usuarios en la tabla</td></tr>';
    } else {
        foreach ($rows as $row) {
            echo '<tr><td>' . $row['id'] . '</td><td><b>' . htmlspecialchars($row['usuario']) . '</b></td><td>' . htmlspecialchars($row['rol']) . '</td><td><code>' . substr($row['password'], 0, 20) . '...</code></td></tr>';
        }
    }
    echo '</table>';

} catch (PDOException $e) {
    echo '<p class="err">❌ ERROR de conexión a la BD:</p>';
    echo '<p class="err"><b>' . htmlspecialchars($e->getMessage()) . '</b></p>';
    echo '<p class="warn">⚠️ Verifica DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD en el .env</p>';
}
echo '</div>';

// ── 3. Archivos y Directorios ─────────────────────────────────────────────────
echo '<h2>3. Archivos y Directorios</h2><div class="box">';
$base = __DIR__;
$checks = [
    'index.php'                                => 'Entrada Laravel',
    'index.html'                               => 'React compilado',
    '.htaccess'                                => 'Reglas Apache',
    'backend/.env'                             => 'Configuración Laravel',
    'backend/vendor/autoload.php'              => 'Composer/vendor',
    'backend/storage/logs'                     => 'Logs',
    'backend/storage/framework/sessions'       => 'Sesiones (file driver)',
    'backend/storage/framework/cache'          => 'Caché',
    'backend/storage/framework/views'          => 'Vistas compiladas',
    'backend/bootstrap/cache'                  => 'Bootstrap cache',
];
echo '<table><tr><th>Ruta</th><th>Descripción</th><th>Existe</th><th>Escritura</th></tr>';
foreach ($checks as $path => $desc) {
    $fullPath = $base . '/' . $path;
    $exists   = file_exists($fullPath);
    $writable = $exists && is_writable($fullPath);
    $isDir    = is_dir($fullPath);
    echo '<tr>';
    echo '<td><code>' . $path . '</code></td>';
    echo '<td>' . $desc . '</td>';
    echo '<td class="' . ($exists ? 'ok' : 'err') . '">' . ($exists ? '✅' : '❌ NO EXISTE') . '</td>';
    if ($isDir) {
        echo '<td class="' . ($writable ? 'ok' : 'err') . '">' . ($writable ? '✅ Escribible' : '❌ Sin permiso') . '</td>';
    } else {
        echo '<td>—</td>';
    }
    echo '</tr>';
}
echo '</table></div>';

// ── 4. Variables del .env (sin mostrar passwords completos) ──────────────────
echo '<h2>4. Valores del .env detectados</h2><div class="box">';
$envPath = $base . '/backend/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $show  = ['APP_ENV', 'APP_DEBUG', 'APP_URL', 'DB_HOST', 'DB_DATABASE', 'DB_USERNAME',
              'SESSION_DRIVER', 'CACHE_STORE', 'QUEUE_CONNECTION', 'LOG_LEVEL'];
    echo '<table><tr><th>Variable</th><th>Valor</th><th>Estado</th></tr>';
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
        [$key, $val] = explode('=', $line, 2);
        $key = trim($key);
        if (!in_array($key, $show)) continue;

        // Validaciones
        $estado = '';
        if ($key === 'APP_ENV' && $val !== 'production') $estado = '<span class="err">⚠️ Debería ser production</span>';
        if ($key === 'APP_DEBUG' && $val !== 'false') $estado = '<span class="err">⚠️ Debería ser false</span>';
        if ($key === 'SESSION_DRIVER' && $val === 'database') $estado = '<span class="err">❌ Cambia a file</span>';
        if ($key === 'SESSION_DRIVER' && $val === 'file') $estado = '<span class="ok">✅</span>';
        if ($key === 'CACHE_STORE' && $val === 'database') $estado = '<span class="warn">⚠️ Cambia a file</span>';
        if ($key === 'QUEUE_CONNECTION' && $val === 'database') $estado = '<span class="warn">⚠️ Cambia a sync</span>';

        // Ocultar password parcialmente
        $displayVal = (strpos(strtolower($key), 'password') !== false || strpos(strtolower($key), 'key') !== false)
            ? substr($val, 0, 8) . '***'
            : $val;

        echo '<tr><td><code>' . htmlspecialchars($key) . '</code></td><td><code>' . htmlspecialchars($displayVal) . '</code></td><td>' . ($estado ?: '<span class="ok">✅</span>') . '</td></tr>';
    }
    echo '</table>';
} else {
    echo '<p class="err">❌ No se encontró el archivo backend/.env</p>';
}
echo '</div>';

// ── 5. Test de Password Hash ──────────────────────────────────────────────────
echo '<h2>5. Test de Contraseña</h2><div class="box">';
echo '<p>Ingresa la contraseña que usas para verificar si el hash coincide:</p>';
if (isset($_POST['test_pass']) && isset($_POST['test_user'])) {
    try {
        if (!isset($pdo)) {
            $pdo = new PDO("mysql:host={$DB_HOST};dbname={$DB_DATABASE};charset=utf8mb4", $DB_USERNAME, $DB_PASSWORD);
        }
        $stmt = $pdo->prepare("SELECT password FROM usuarios WHERE usuario = ?");
        $stmt->execute([$_POST['test_user']]);
        $row = $stmt->fetch();
        if ($row) {
            $match = password_verify($_POST['test_pass'], $row['password']);
            if ($match) {
                echo '<p class="ok">✅ La contraseña es CORRECTA para el usuario <b>' . htmlspecialchars($_POST['test_user']) . '</b></p>';
            } else {
                echo '<p class="err">❌ La contraseña NO coincide con el hash en la BD.</p>';
                echo '<p class="warn">⚠️ Esto significa que la BD importada tiene una contraseña diferente. Necesitas resetearla.</p>';
            }
        } else {
            echo '<p class="err">❌ El usuario <b>' . htmlspecialchars($_POST['test_user']) . '</b> NO existe en la BD.</p>';
        }
    } catch (Exception $e) {
        echo '<p class="err">Error: ' . htmlspecialchars($e->getMessage()) . '</p>';
    }
}
echo '<form method="POST" action="?key=bazar2026">
  <p>Usuario: <input type="text" name="test_user" value="teylor" style="background:#0f3460;color:#eee;border:1px solid #333;padding:5px;border-radius:4px">
  &nbsp; Contraseña: <input type="password" name="test_pass" placeholder="tu contraseña" style="background:#0f3460;color:#eee;border:1px solid #333;padding:5px;border-radius:4px">
  &nbsp; <button type="submit" style="background:#e94560;color:#fff;border:none;padding:6px 14px;border-radius:4px;cursor:pointer">Verificar</button></p>
</form>';
echo '</div>';

echo '<br><p class="warn" style="text-align:center">⚠️ <b>IMPORTANTE: Borra este archivo del hosting cuando termines el diagnóstico.</b></p>';
echo '</body></html>';
