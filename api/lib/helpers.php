<?php
/**
 * 通用响应、请求解析与工具函数
 */

function respond($data = null, $status = 200, $message = 'ok')
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(
        array('code' => 0, 'message' => $message, 'data' => $data),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

function respond_error($code, $message, $status = 400, $data = null)
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(
        array('code' => $code, 'message' => $message, 'data' => $data),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

function body()
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        $cache = array();
        return $cache;
    }
    $json = json_decode($raw, true);
    $cache = is_array($json) ? $json : array();
    return $cache;
}

function input($key, $default = null)
{
    $b = body();
    return array_key_exists($key, $b) ? $b[$key] : $default;
}

function query($key, $default = null)
{
    return isset($_GET[$key]) ? $_GET[$key] : $default;
}

function now()
{
    return date('Y-m-d H:i:s');
}

function today()
{
    return date('Y-m-d');
}

function next_id($list)
{
    $max = 0;
    foreach ($list as $row) {
        if (isset($row['id']) && is_numeric($row['id'])) {
            $max = max($max, (int)$row['id']);
        }
    }
    return $max + 1;
}

function find_row($list, $id)
{
    foreach ($list as $row) {
        if (isset($row['id']) && (string)$row['id'] === (string)$id) {
            return $row;
        }
    }
    return null;
}

function find_index($list, $id)
{
    foreach ($list as $i => $row) {
        if (isset($row['id']) && (string)$row['id'] === (string)$id) {
            return $i;
        }
    }
    return -1;
}

function str_starts_with_php74($haystack, $needle)
{
    return $needle === '' || strpos($haystack, $needle) === 0;
}

function is_hex_color($value)
{
    return is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value);
}

function clamp_num($value, $min, $max, $default)
{
    if (!is_numeric($value)) {
        return $default;
    }
    $v = (float)$value;
    if ($v < $min) {
        return $min;
    }
    if ($v > $max) {
        return $max;
    }
    return $v;
}

function pick($arr, $key, $default = '')
{
    return (is_array($arr) && array_key_exists($key, $arr)) ? $arr[$key] : $default;
}

function public_user($user)
{
    if (!$user) {
        return null;
    }
    $copy = $user;
    unset($copy['password_hash']);
    return $copy;
}

function log_action($user, $action, $detail, $level = 'info')
{
    Store::update('logs', function (&$data) use ($user, $action, $detail, $level) {
        $data[] = array(
            'id' => next_id($data),
            'userId' => $user ? (int)$user['id'] : 0,
            'userName' => $user ? $user['name'] : '访客',
            'action' => $action,
            'detail' => $detail,
            'ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1',
            'level' => $level,
            'at' => now(),
        );
    });
}

function push_notification($userId, $type, $title, $content, $link = '')
{
    Store::update('notifications', function (&$data) use ($userId, $type, $title, $content, $link) {
        $data[] = array(
            'id' => next_id($data),
            'userId' => (int)$userId,
            'type' => $type,
            'title' => $title,
            'content' => $content,
            'read' => false,
            'at' => now(),
            'link' => $link,
        );
    });
}

function settings()
{
    return Store::read('settings');
}

function term_factor($months)
{
    $settings = settings();
    $terms = isset($settings['commerce']['terms']) ? $settings['commerce']['terms'] : array();
    foreach ($terms as $term) {
        if ((int)$term['months'] === (int)$months) {
            return (float)$term['factor'];
        }
    }
    return (float)$months;
}

function product_price($product, $plan, $months)
{
    $factor = term_factor($months);
    return round(((float)$plan['price']) * $factor, 2);
}

function generate_order_no($id)
{
    return 'ZJ' . date('Ymd') . str_pad((string)$id, 4, '0', STR_PAD_LEFT);
}

function random_ip()
{
    $prefixes = array('47.100', '47.101', '120.26', '203.0.113', '198.51.100');
    $prefix = $prefixes[array_rand($prefixes)];
    return $prefix . '.' . mt_rand(2, 254);
}

function client_ip()
{
    return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '127.0.0.1';
}

function user_agent_short()
{
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : 'Unknown';
    if (stripos($ua, 'Windows') !== false) {
        $os = 'Windows';
    } elseif (stripos($ua, 'Mac') !== false) {
        $os = 'macOS';
    } elseif (stripos($ua, 'Android') !== false) {
        $os = 'Android';
    } elseif (stripos($ua, 'iPhone') !== false || stripos($ua, 'iPad') !== false) {
        $os = 'iOS';
    } else {
        $os = 'Linux';
    }
    if (stripos($ua, 'Edg') !== false) {
        $browser = 'Edge';
    } elseif (stripos($ua, 'Chrome') !== false) {
        $browser = 'Chrome';
    } elseif (stripos($ua, 'Firefox') !== false) {
        $browser = 'Firefox';
    } elseif (stripos($ua, 'Safari') !== false) {
        $browser = 'Safari';
    } else {
        $browser = 'Browser';
    }
    return $os . ' / ' . $browser;
}

function mask_key($key)
{
    if (strlen($key) < 14) {
        return '****';
    }
    return substr($key, 0, 12) . '****' . substr($key, -4);
}
