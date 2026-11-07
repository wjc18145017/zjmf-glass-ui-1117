<?php
/**
 * PHP 内置服务器路由脚本（PHP 7.4 兼容）
 * 启动：php -S 127.0.0.1:8899 router.php
 * - /api/* 交给 api/index.php
 * - /assets/*、/uploads/* 与少量根文件按静态资源返回
 * - 其余路径回退到 index.html（前端使用 hash 路由）
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (preg_match('#^/api(/|$)#', $uri)) {
    require __DIR__ . '/api/index.php';
    return true;
}

if (preg_match('#^/(assets|uploads)/#', $uri)) {
    $file = __DIR__ . $uri;
    if (is_file($file)) {
        return false; // 交给内置服务器输出静态文件
    }
    http_response_code(404);
    echo 'Not Found';
    return true;
}

if (preg_match('#^/(favicon\.svg|version\.json)$#', $uri)) {
    $file = __DIR__ . $uri;
    if (is_file($file)) {
        return false;
    }
}

header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/index.html');
return true;
