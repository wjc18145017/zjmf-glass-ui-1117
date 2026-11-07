<?php
/**
 * API 入口：PHP 7.4 兼容
 */

date_default_timezone_set('Asia/Shanghai');
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

require __DIR__ . '/lib/store.php';
require __DIR__ . '/lib/helpers.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/router.php';
require __DIR__ . '/lib/services.php';

set_exception_handler(function ($e) {
    error_log('[ZJMF] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    respond_error(500, '服务端异常，请稍后重试', 500);
});

$router = new Router();
require __DIR__ . '/routes/public.php';
require __DIR__ . '/routes/auth.php';
require __DIR__ . '/routes/commerce.php';
require __DIR__ . '/routes/account.php';
require __DIR__ . '/routes/admin.php';

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = preg_replace('#^/api#', '', $path);
if ($path === '' || $path === false) {
    $path = '/';
}
$router->dispatch(isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET', $path);
