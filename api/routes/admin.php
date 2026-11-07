<?php
/**
 * 后台管理接口（仅 role = admin）
 */

$router->get('/admin/stats', function () {
    require_admin();
    respond(admin_stats());
});

$router->get('/admin/users', function () {
    require_admin();
    $keyword = trim((string)query('q', ''));
    $status = query('status', '');
    $role = query('role', '');
    $items = array();
    foreach (Store::read('users') as $user) {
        if ($status !== '' && $status !== 'all' && $user['status'] !== $status) {
            continue;
        }
        if ($role !== '' && $role !== 'all' && $user['role'] !== $role) {
            continue;
        }
        if ($keyword !== '') {
            $haystack = $user['username'] . ' ' . $user['name'] . ' ' . $user['email'] . ' ' . $user['phone'];
            if (mb_stripos($haystack, $keyword) === false) {
                continue;
            }
        }
        $user['serverCount'] = 0;
        foreach (Store::read('servers') as $server) {
            if ((int)$server['userId'] === (int)$user['id']) {
                $user['serverCount']++;
            }
        }
        $items[] = public_user($user);
    }
    respond(array('items' => $items, 'total' => count($items)));
});

$router->post('/admin/users', function () {
    $admin = require_admin();
    $username = trim((string)input('username', ''));
    $email = trim((string)input('email', ''));
    $password = (string)input('password', 'demo123456');
    $name = trim((string)input('name', ''));
    $role = (string)input('role', 'user');
    if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
        respond_error(400, '用户名需为 3-20 位字母、数字或下划线', 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond_error(400, '请输入有效的邮箱地址', 400);
    }
    if (strlen($password) < 6) {
        respond_error(400, '初始密码至少 6 位', 400);
    }
    if (!in_array($role, array('user', 'admin'), true)) {
        $role = 'user';
    }
    $created = null;
    Store::update('users', function (&$data) use ($username, $email, $password, $name, $role, &$created) {
        foreach ($data as $user) {
            if (strcasecmp($user['username'], $username) === 0 || strcasecmp($user['email'], $email) === 0) {
                respond_error(409, '用户名或邮箱已存在', 409);
            }
        }
        $created = array(
            'id' => next_id($data),
            'username' => $username,
            'email' => $email,
            'name' => $name !== '' ? $name : $username,
            'role' => $role,
            'status' => 'active',
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'phone' => '',
            'credits' => 0,
            'avatar' => '',
            'createdAt' => now(),
            'realname' => array('status' => 'unverified', 'name' => '', 'idno' => '', 'at' => '', 'note' => ''),
            'security' => array('twofa' => false, 'lastPasswordChange' => now()),
        );
        $data[] = $created;
    });
    log_action($admin, 'user.create', '创建用户 ' . $username);
    respond(public_user($created), 201);
});

$router->put('/admin/users/{id}', function ($params) {
    $admin = require_admin();
    $target = find_row(Store::read('users'), $params['id']);
    if (!$target) {
        respond_error(404, '用户不存在', 404);
    }
    if ((int)$target['id'] === (int)$admin['id'] && (string)input('status', $target['status']) === 'disabled') {
        respond_error(400, '不能禁用当前登录的管理员账户', 400);
    }
    $updated = null;
    Store::update('users', function (&$data) use ($params, $target, &$updated, $admin) {
        foreach ($data as &$row) {
            if ((string)$row['id'] !== (string)$params['id']) {
                continue;
            }
            $name = input('name', null);
            if ($name !== null && trim((string)$name) !== '') {
                $row['name'] = trim((string)$name);
            }
            $email = input('email', null);
            if ($email !== null && trim((string)$email) !== '') {
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    respond_error(400, '邮箱格式不正确', 400);
                }
                $row['email'] = trim((string)$email);
            }
            $phone = input('phone', null);
            if ($phone !== null) {
                $row['phone'] = trim((string)$phone);
            }
            $status = input('status', null);
            if ($status !== null && in_array($status, array('active', 'disabled'), true)) {
                $row['status'] = $status;
            }
            $role = input('role', null);
            if ($role !== null && in_array($role, array('user', 'admin'), true)) {
                $row['role'] = $role;
            }
            $credits = input('credits', null);
            if ($credits !== null && is_numeric($credits)) {
                $delta = round((float)$credits - (float)$row['credits'], 2);
                if ($delta !== 0.0) {
                    $row['credits'] = round((float)$credits, 2);
                    $note = '管理员调整余额（' . ($delta > 0 ? '+' : '') . $delta . ' 元）';
                    bill_add($row['id'], $delta >= 0 ? 'recharge' : 'consume', $delta, $row['credits'], $note, '', 'system');
                }
            }
            $realnameStatus = input('realnameStatus', null);
            if ($realnameStatus !== null && in_array($realnameStatus, array('unverified', 'pending', 'verified', 'rejected'), true)) {
                $row['realname']['status'] = $realnameStatus;
                if ($realnameStatus === 'verified') {
                    $row['realname']['note'] = '管理员审核通过';
                    $row['realname']['at'] = now();
                } elseif ($realnameStatus === 'rejected') {
                    $row['realname']['note'] = '管理员驳回，请重新提交';
                }
            }
            $updated = $row;
        }
    });
    if (!$updated) {
        respond_error(404, '用户不存在', 404);
    }
    log_action($admin, 'user.update', '更新用户 #' . $params['id'] . ' 的账户信息');
    respond(public_user($updated));
});

$router->delete('/admin/users/{id}', function ($params) {
    $admin = require_admin();
    if ((int)$params['id'] === (int)$admin['id']) {
        respond_error(400, '不能删除当前登录的管理员账户', 400);
    }
    Store::update('users', function (&$data) use ($params) {
        $data = array_values(array_filter($data, function ($row) use ($params) {
            return (string)$row['id'] !== (string)$params['id'];
        }));
    });
    Store::update('tokens', function (&$data) use ($params) {
        $data = array_values(array_filter($data, function ($row) use ($params) {
            return (string)$row['userId'] !== (string)$params['id'];
        }));
    });
    log_action($admin, 'user.delete', '删除用户 #' . $params['id']);
    respond(array('message' => '用户已删除'));
});

$router->get('/admin/products', function () {
    require_admin();
    respond(array('items' => Store::read('products')));
});

function normalize_plans($plans)
{
    $result = array();
    foreach ($plans as $plan) {
        $specs = array();
        if (isset($plan['specs']) && is_array($plan['specs'])) {
            foreach ($plan['specs'] as $spec) {
                if (isset($spec['label']) && trim((string)$spec['label']) !== '') {
                    $specs[] = array('label' => trim((string)$spec['label']), 'value' => trim((string)pick($spec, 'value', '-')));
                }
            }
        }
        $result[] = array(
            'id' => trim((string)pick($plan, 'id', 'plan-' . mt_rand(1000, 9999))),
            'name' => trim((string)pick($plan, 'name', '标准套餐')),
            'desc' => trim((string)pick($plan, 'desc', '')),
            'specs' => $specs,
            'price' => round(clamp_num(pick($plan, 'price', 0), 0, 1000000, 0), 2),
            'unit' => '月',
            'stock' => (int)clamp_num(pick($plan, 'stock', 0), 0, 1000000, 0),
            'recommended' => !empty($plan['recommended']),
        );
    }
    return $result;
}

function normalize_product($raw, $existing = null)
{
    $name = trim((string)pick($raw, 'name', $existing ? $existing['name'] : ''));
    if ($name === '') {
        respond_error(400, '产品名称不能为空', 400);
    }
    $plans = isset($raw['plans']) && is_array($raw['plans']) ? normalize_plans($raw['plans']) : ($existing ? $existing['plans'] : array());
    if (!$plans) {
        respond_error(400, '至少需要一个套餐', 400);
    }
    $features = isset($raw['features']) ? $raw['features'] : ($existing ? $existing['features'] : array());
    if (is_string($features)) {
        $features = array_values(array_filter(array_map('trim', explode("\n", $features))));
    }
    if (!is_array($features)) {
        $features = array();
    }
    $regions = isset($raw['regions']) ? $raw['regions'] : ($existing ? $existing['regions'] : array('华东-上海'));
    if (is_string($regions)) {
        $regions = array_values(array_filter(array_map('trim', explode(',', $regions))));
    }
    $os = isset($raw['os']) ? $raw['os'] : ($existing ? $existing['os'] : array('Ubuntu 22.04 LTS'));
    if (is_string($os)) {
        $os = array_values(array_filter(array_map('trim', explode(',', $os))));
    }
    $slug = trim((string)pick($raw, 'slug', $existing ? $existing['slug'] : 'product-' . mt_rand(1000, 9999)));
    $category = trim((string)pick($raw, 'category', $existing ? $existing['category'] : 'cloud'));
    $categoryName = trim((string)pick($raw, 'categoryName', $existing ? $existing['categoryName'] : '云服务器'));
    return array(
        'slug' => $slug === '' ? 'product-' . mt_rand(1000, 9999) : $slug,
        'name' => $name,
        'category' => $category,
        'categoryName' => $categoryName,
        'tagline' => trim((string)pick($raw, 'tagline', $existing ? $existing['tagline'] : '')),
        'description' => trim((string)pick($raw, 'description', $existing ? $existing['description'] : '')),
        'features' => array_values($features),
        'recommended' => (bool)pick($raw, 'recommended', $existing ? $existing['recommended'] : false),
        'badge' => trim((string)pick($raw, 'badge', $existing ? $existing['badge'] : '')),
        'regions' => array_values($regions) ?: array('华东-上海'),
        'os' => array_values($os) ?: array('Ubuntu 22.04 LTS'),
        'plans' => $plans,
    );
}

$router->post('/admin/products', function () {
    $admin = require_admin();
    $product = normalize_product(body());
    $created = null;
    Store::update('products', function (&$data) use ($product, &$created) {
        $created = array_merge(array('id' => next_id($data)), $product);
        $data[] = $created;
    });
    log_action($admin, 'product.create', '创建产品：' . $product['name']);
    respond($created, 201);
});

$router->put('/admin/products/{id}', function ($params) {
    $admin = require_admin();
    $existing = find_row(Store::read('products'), $params['id']);
    if (!$existing) {
        respond_error(404, '产品不存在', 404);
    }
    $product = normalize_product(body(), $existing);
    $updated = null;
    Store::update('products', function (&$data) use ($params, $product, $existing, &$updated) {
        foreach ($data as &$row) {
            if ((string)$row['id'] === (string)$params['id']) {
                $row = array_merge(array('id' => $existing['id']), $product);
                $updated = $row;
            }
        }
    });
    log_action($admin, 'product.update', '更新产品：' . $product['name']);
    respond($updated);
});

$router->delete('/admin/products/{id}', function ($params) {
    $admin = require_admin();
    $product = find_row(Store::read('products'), $params['id']);
    if (!$product) {
        respond_error(404, '产品不存在', 404);
    }
    foreach (Store::read('orders') as $order) {
        if ($order['status'] === 'pending') {
            foreach ($order['items'] as $item) {
                if ((string)$item['productId'] === (string)$params['id']) {
                    respond_error(409, '该产品存在待支付订单，暂不可删除', 409);
                }
            }
        }
    }
    Store::update('products', function (&$data) use ($params) {
        $data = array_values(array_filter($data, function ($row) use ($params) {
            return (string)$row['id'] !== (string)$params['id'];
        }));
    });
    log_action($admin, 'product.delete', '删除产品：' . $product['name']);
    respond(array('message' => '产品已删除'));
});

$router->get('/admin/orders', function () {
    require_admin();
    $status = query('status', '');
    $keyword = trim((string)query('q', ''));
    $items = array();
    $userNames = array();
    foreach (Store::read('users') as $user) {
        $userNames[$user['id']] = $user['name'] . '（' . $user['username'] . '）';
    }
    foreach (Store::read('orders') as $order) {
        if ($status !== '' && $status !== 'all' && $order['status'] !== $status) {
            continue;
        }
        if ($keyword !== '') {
            $haystack = $order['no'] . ' ' . (isset($userNames[$order['userId']]) ? $userNames[$order['userId']] : '');
            if (mb_stripos($haystack, $keyword) === false) {
                continue;
            }
        }
        $order['statusText'] = order_status_text($order['status']);
        $order['userName'] = isset($userNames[$order['userId']]) ? $userNames[$order['userId']] : '未知用户';
        $order['itemCount'] = count($order['items']);
        $items[] = $order;
    }
    usort($items, function ($a, $b) {
        return strcmp($b['createdAt'], $a['createdAt']);
    });
    respond(array('items' => $items, 'total' => count($items)));
});

$router->post('/admin/orders/{id}/status', function ($params) {
    $admin = require_admin();
    $order = find_row(Store::read('orders'), $params['id']);
    if (!$order) {
        respond_error(404, '订单不存在', 404);
    }
    $status = (string)input('status', '');
    if (!in_array($status, array('pending', 'paid', 'cancelled', 'refunded'), true)) {
        respond_error(400, '不支持的订单状态', 400);
    }
    $previous = $order['status'];
    if ($previous === $status) {
        respond($order);
    }
    if ($status === 'refunded' && $previous !== 'paid') {
        respond_error(422, '仅已支付订单可以退款', 422);
    }
    if ($status === 'paid' && $previous !== 'paid') {
        $order['paidAt'] = now();
        $order['payMethod'] = $order['payMethod'] ? $order['payMethod'] : 'admin';
        provision_order($order, $admin);
    }
    if ($status === 'refunded') {
        user_adjust_credits($order['userId'], (float)$order['amount'], '订单 ' . $order['no'] . ' 退款', $order['no'], 'refund');
        push_notification($order['userId'], 'billing', '订单已退款', '订单 ' . $order['no'] . ' 已退款 ' . $order['amount'] . ' 元至账户余额。', '#/user/billing');
    }
    $order['status'] = $status;
    Store::update('orders', function (&$data) use ($order) {
        $idx = find_index($data, $order['id']);
        if ($idx >= 0) {
            $data[$idx] = $order;
        }
    });
    log_action($admin, 'order.status', '订单 ' . $order['no'] . ' 状态变更为 ' . order_status_text($status), 'warning');
    respond($order);
});

$router->get('/admin/tickets', function () {
    require_admin();
    $status = query('status', '');
    $userNames = array();
    foreach (Store::read('users') as $user) {
        $userNames[$user['id']] = $user['name'] . '（' . $user['username'] . '）';
    }
    $items = array();
    foreach (Store::read('tickets') as $row) {
        if ($status !== '' && $status !== 'all' && $row['status'] !== $status) {
            continue;
        }
        $row['userName'] = isset($userNames[$row['userId']]) ? $userNames[$row['userId']] : '未知用户';
        $row['messageCount'] = count($row['messages']);
        $row['lastMessage'] = $row['messages'] ? $row['messages'][count($row['messages']) - 1]['content'] : '';
        unset($row['messages']);
        $items[] = $row;
    }
    usort($items, function ($a, $b) {
        return strcmp($b['updatedAt'], $a['updatedAt']);
    });
    respond(array('items' => $items, 'total' => count($items)));
});

$router->get('/admin/tickets/{id}', function ($params) {
    require_admin();
    $ticket = find_row(Store::read('tickets'), $params['id']);
    if (!$ticket) {
        respond_error(404, '工单不存在', 404);
    }
    $user = find_row(Store::read('users'), $ticket['userId']);
    $ticket['userName'] = $user ? $user['name'] . '（' . $user['username'] . '）' : '未知用户';
    $ticket['userEmail'] = $user ? $user['email'] : '';
    respond($ticket);
});

$router->post('/admin/tickets/{id}/reply', function ($params) {
    $admin = require_admin();
    $ticket = find_row(Store::read('tickets'), $params['id']);
    if (!$ticket) {
        respond_error(404, '工单不存在', 404);
    }
    $content = trim((string)input('content', ''));
    if (mb_strlen($content) < 2) {
        respond_error(400, '回复内容至少 2 个字符', 400);
    }
    Store::update('tickets', function (&$data) use ($params, $admin, $content) {
        foreach ($data as &$row) {
            if ((string)$row['id'] === (string)$params['id']) {
                $maxId = 0;
                foreach ($row['messages'] as $m) {
                    $maxId = max($maxId, (int)$m['id']);
                }
                $row['messages'][] = array(
                    'id' => $maxId + 1,
                    'from' => 'staff',
                    'author' => '客服 ' . $admin['name'],
                    'content' => $content,
                    'at' => now(),
                );
                $row['status'] = 'answered';
                $row['updatedAt'] = now();
            }
        }
    });
    push_notification($ticket['userId'], 'ticket', '工单有新回复', '工单「' . $ticket['title'] . '」收到客服回复。', '#/user/tickets/' . $ticket['id']);
    log_action($admin, 'ticket.reply', '回复工单 #' . $ticket['id']);
    respond(find_row(Store::read('tickets'), $params['id']));
});

$router->post('/admin/tickets/{id}/status', function ($params) {
    $admin = require_admin();
    $status = (string)input('status', '');
    if (!in_array($status, array('open', 'answered', 'closed'), true)) {
        respond_error(400, '不支持的工单状态', 400);
    }
    Store::update('tickets', function (&$data) use ($params, $status) {
        foreach ($data as &$row) {
            if ((string)$row['id'] === (string)$params['id']) {
                $row['status'] = $status;
                $row['updatedAt'] = now();
            }
        }
    });
    log_action($admin, 'ticket.status', '工单 #' . $params['id'] . ' 状态变更为 ' . $status);
    respond(find_row(Store::read('tickets'), $params['id']));
});

$router->get('/admin/recharges', function () {
    require_admin();
    $rows = Store::read('recharges');
    $userNames = array();
    foreach (Store::read('users') as $user) {
        $userNames[$user['id']] = $user['name'] . '（' . $user['username'] . '）';
    }
    foreach ($rows as &$row) {
        $row['userName'] = isset($userNames[$row['userId']]) ? $userNames[$row['userId']] : '未知用户';
    }
    unset($row);
    usort($rows, function ($a, $b) {
        return strcmp($b['createdAt'], $a['createdAt']);
    });
    respond(array('items' => $rows));
});

$router->post('/admin/recharges/{id}/review', function ($params) {
    $admin = require_admin();
    $recharge = find_row(Store::read('recharges'), $params['id']);
    if (!$recharge) {
        respond_error(404, '充值申请不存在', 404);
    }
    if ($recharge['status'] !== 'pending') {
        respond_error(409, '该申请已处理', 409);
    }
    $decision = (string)input('status', '');
    if (!in_array($decision, array('approved', 'rejected'), true)) {
        respond_error(400, '审核结果不合法', 400);
    }
    $note = trim((string)input('note', ''));
    Store::update('recharges', function (&$data) use ($params, $decision, $note, $admin) {
        foreach ($data as &$row) {
            if ((string)$row['id'] === (string)$params['id']) {
                $row['status'] = $decision;
                $row['reviewedAt'] = now();
                $row['reviewNote'] = $note !== '' ? $note : ($decision === 'approved' ? '审核通过' : '审核驳回');
            }
        }
    });
    if ($decision === 'approved') {
        user_adjust_credits($recharge['userId'], (float)$recharge['amount'], '充值 ' . $recharge['amount'] . ' 元（财务审核通过）', 'RC' . $recharge['id'], $recharge['method']);
        push_notification($recharge['userId'], 'billing', '充值已到账', '您的 ' . $recharge['amount'] . ' 元充值已审核通过，余额已更新。', '#/user/billing');
        log_action($admin, 'finance.approve', '通过充值申请 #' . $recharge['id'] . '，金额 ' . $recharge['amount'] . ' 元');
    } else {
        push_notification($recharge['userId'], 'billing', '充值被驳回', '您的 ' . $recharge['amount'] . ' 元充值申请被驳回：' . $note, '#/user/billing');
        log_action($admin, 'finance.reject', '驳回充值申请 #' . $recharge['id'], 'warning');
    }
    respond(find_row(Store::read('recharges'), $params['id']));
});

$router->get('/admin/announcements', function () {
    require_admin();
    $rows = Store::read('announcements');
    usort($rows, function ($a, $b) {
        return strcmp($b['createdAt'], $a['createdAt']);
    });
    respond(array('items' => $rows));
});

$router->post('/admin/announcements', function () {
    $admin = require_admin();
    $title = trim((string)input('title', ''));
    $content = trim((string)input('content', ''));
    $category = trim((string)input('category', '产品公告'));
    if (mb_strlen($title) < 4) {
        respond_error(400, '公告标题至少 4 个字符', 400);
    }
    if (mb_strlen($content) < 10) {
        respond_error(400, '公告内容至少 10 个字符', 400);
    }
    $created = null;
    Store::update('announcements', function (&$data) use ($title, $content, $category, &$created) {
        $created = array(
            'id' => next_id($data),
            'title' => $title,
            'category' => $category,
            'pinned' => (bool)input('pinned', false),
            'views' => 0,
            'createdAt' => now(),
            'content' => $content,
        );
        $data[] = $created;
    });
    log_action($admin, 'announcement.create', '发布公告：' . $title);
    respond($created, 201);
});

$router->put('/admin/announcements/{id}', function ($params) {
    $admin = require_admin();
    $existing = find_row(Store::read('announcements'), $params['id']);
    if (!$existing) {
        respond_error(404, '公告不存在', 404);
    }
    $updated = null;
    Store::update('announcements', function (&$data) use ($params, $existing, &$updated) {
        foreach ($data as &$row) {
            if ((string)$row['id'] === (string)$params['id']) {
                $title = trim((string)input('title', $row['title']));
                $content = trim((string)input('content', $row['content']));
                if (mb_strlen($title) < 4) {
                    respond_error(400, '公告标题至少 4 个字符', 400);
                }
                $row['title'] = $title;
                $row['content'] = $content;
                $row['category'] = trim((string)input('category', $row['category']));
                $row['pinned'] = (bool)input('pinned', $row['pinned']);
                $updated = $row;
            }
        }
    });
    log_action($admin, 'announcement.update', '更新公告：' . $updated['title']);
    respond($updated);
});

$router->delete('/admin/announcements/{id}', function ($params) {
    $admin = require_admin();
    Store::update('announcements', function (&$data) use ($params) {
        $data = array_values(array_filter($data, function ($row) use ($params) {
            return (string)$row['id'] !== (string)$params['id'];
        }));
    });
    log_action($admin, 'announcement.delete', '删除公告 #' . $params['id']);
    respond(array('message' => '公告已删除'));
});

$router->get('/admin/logs', function () {
    require_admin();
    $level = query('level', '');
    $keyword = trim((string)query('q', ''));
    $items = array();
    foreach (Store::read('logs') as $row) {
        if ($level !== '' && $level !== 'all' && $row['level'] !== $level) {
            continue;
        }
        if ($keyword !== '') {
            $haystack = $row['userName'] . ' ' . $row['action'] . ' ' . $row['detail'] . ' ' . $row['ip'];
            if (mb_stripos($haystack, $keyword) === false) {
                continue;
            }
        }
        $items[] = $row;
    }
    usort($items, function ($a, $b) {
        return strcmp($b['at'], $a['at']);
    });
    respond(array('items' => $items, 'total' => count($items)));
});

$router->get('/admin/settings', function () {
    require_admin();
    $settings = settings();
    respond(array(
        'site' => $settings['site'],
        'theme' => theme_normalize(isset($settings['theme']) ? $settings['theme'] : array()),
        'presets' => isset($settings['presets']) ? $settings['presets'] : array(),
        'commerce' => isset($settings['commerce']) ? $settings['commerce'] : array(),
    ));
});

$router->put('/admin/settings/theme', function () {
    $admin = require_admin();
    $raw = input('theme', body());
    $theme = theme_normalize($raw);
    Store::update('settings', function (&$data) use ($theme) {
        $data['theme'] = $theme;
    });
    log_action($admin, 'theme.update', '保存主题配置：' . $theme['preset'] . '（' . $theme['mode'] . '）', 'warning');
    respond(array('theme' => $theme, 'message' => '主题已保存并下发到前台'));
});

$router->put('/admin/settings/site', function () {
    $admin = require_admin();
    $allowed = array('name', 'fullName', 'domain', 'icp', 'copyright', 'phone', 'email', 'address', 'supportHours', 'currency');
    $updated = array();
    Store::update('settings', function (&$data) use ($allowed, &$updated) {
        foreach ($allowed as $key) {
            if ($key === 'currency') {
                continue;
            }
            $value = input($key, null);
            if ($value !== null) {
                $data['site'][$key] = trim((string)$value);
                $updated[$key] = $data['site'][$key];
            }
        }
    });
    if (!isset(Store::read('settings')['site']['name']) || Store::read('settings')['site']['name'] === '') {
        Store::update('settings', function (&$data) {
            $data['site']['name'] = '智简魔方';
        });
    }
    log_action($admin, 'site.update', '更新站点基础信息');
    respond(array('site' => Store::read('settings')['site'], 'message' => '站点信息已保存'));
});

$router->post('/admin/upload', function () {
    require_admin();
    if (empty($_FILES['file'])) {
        respond_error(400, '未检测到上传文件', 400);
    }
    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        respond_error(400, '上传失败，错误码 ' . $file['error'], 400);
    }
    if ($file['size'] > 4 * 1024 * 1024) {
        respond_error(400, '文件不能超过 4 MB', 400);
    }
    $info = @getimagesize($file['tmp_name']);
    $allowed = array(
        IMAGETYPE_PNG => 'png',
        IMAGETYPE_JPEG => 'jpg',
        IMAGETYPE_WEBP => 'webp',
        IMAGETYPE_GIF => 'gif',
    );
    if (!$info || !isset($allowed[$info[2]])) {
        respond_error(400, '仅支持 PNG / JPG / WEBP / GIF 图片', 400);
    }
    $ext = $allowed[$info[2]];
    $name = 'bg-' . date('YmdHis') . '-' . bin2hex(random_bytes(6)) . '.' . $ext;
    $dir = dirname(__DIR__, 2) . '/uploads';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    $target = $dir . '/' . $name;
    if (!move_uploaded_file($file['tmp_name'], $target)) {
        respond_error(500, '文件写入失败', 500);
    }
    respond(array('url' => '/uploads/' . $name, 'name' => $name, 'size' => $file['size']));
});
