<?php
/**
 * 令牌鉴权（Bearer Token）
 */
function bearer_token()
{
    $header = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('getallheaders')) {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $header = $headers['Authorization'];
        }
    }
    if ($header && preg_match('/Bearer\s+(.+)/i', $header, $m)) {
        return trim($m[1]);
    }
    if (isset($_GET['token'])) {
        return $_GET['token'];
    }
    return '';
}

function current_token_record()
{
    static $record = false;
    if ($record !== false) {
        return $record;
    }
    $token = bearer_token();
    if ($token === '') {
        $record = null;
        return $record;
    }
    $tokens = Store::read('tokens');
    $record = null;
    foreach ($tokens as $row) {
        if (isset($row['token']) && hash_equals($row['token'], $token)) {
            $record = $row;
            break;
        }
    }
    return $record;
}

function current_user()
{
    static $user = false;
    if ($user !== false) {
        return $user;
    }
    $record = current_token_record();
    if (!$record) {
        $user = null;
        return $user;
    }
    $users = Store::read('users');
    $found = find_row($users, $record['userId']);
    if (!$found || $found['status'] !== 'active') {
        $user = null;
        return $user;
    }
    $user = $found;
    return $user;
}

function require_login()
{
    $user = current_user();
    if (!$user) {
        respond_error(401, '登录状态已失效，请重新登录', 401);
    }
    return $user;
}

function require_admin()
{
    $user = require_login();
    if ($user['role'] !== 'admin') {
        respond_error(403, '当前账户无权限访问该资源', 403);
    }
    return $user;
}

function issue_token($userId)
{
    $token = bin2hex(random_bytes(24));
    Store::update('tokens', function (&$data) use ($userId, $token) {
        $data[] = array(
            'id' => next_id($data),
            'token' => $token,
            'userId' => (int)$userId,
            'createdAt' => now(),
            'lastActive' => now(),
            'ip' => client_ip(),
            'ua' => user_agent_short(),
        );
    });
    return $token;
}

function revoke_token($token)
{
    Store::update('tokens', function (&$data) use ($token) {
        $data = array_values(array_filter($data, function ($row) use ($token) {
            return !isset($row['token']) || $row['token'] !== $token;
        }));
    });
}

function touch_token()
{
    $record = current_token_record();
    if (!$record) {
        return;
    }
    Store::update('tokens', function (&$data) use ($record) {
        foreach ($data as &$row) {
            if ($row['id'] === $record['id']) {
                $row['lastActive'] = now();
            }
        }
    });
}
