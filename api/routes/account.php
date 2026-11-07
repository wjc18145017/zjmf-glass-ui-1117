<?php
/**
 * 用户中心接口：服务器、账单、工单、资料、安全、密钥、通知
 */

$router->get('/servers', function () {
    $user = require_login();
    $rows = Store::read('servers');
    $items = array();
    foreach ($rows as $row) {
        if ((int)$row['userId'] === (int)$user['id']) {
            $items[] = $row;
        }
    }
    usort($items, function ($a, $b) {
        return strcmp($b['createdAt'], $a['createdAt']);
    });
    respond(array('items' => $items, 'total' => count($items)));
});

$router->get('/servers/{id}', function ($params) {
    $user = require_login();
    $server = find_row(Store::read('servers'), $params['id']);
    if (!$server) {
        respond_error(404, '实例不存在', 404);
    }
    if ((int)$server['userId'] !== (int)$user['id'] && $user['role'] !== 'admin') {
        respond_error(403, '无权查看该实例', 403);
    }
    respond($server);
});

$router->post('/servers/{id}/power', function ($params) {
    $user = require_login();
    $server = find_row(Store::read('servers'), $params['id']);
    if (!$server) {
        respond_error(404, '实例不存在', 404);
    }
    if ((int)$server['userId'] !== (int)$user['id']) {
        respond_error(403, '无权操作该实例', 403);
    }
    $action = (string)input('action', '');
    $map = array(
        'start' => array('status' => 'running', 'label' => '开机'),
        'stop' => array('status' => 'stopped', 'label' => '关机'),
        'restart' => array('status' => 'running', 'label' => '重启'),
    );
    if (!isset($map[$action])) {
        respond_error(400, '不支持的操作：' . $action, 400);
    }
    Server::update($server['id'], function (&$row) use ($map, $action) {
        $row['status'] = $map[$action]['status'];
        $row['uptime'] = $action === 'stop' ? '0 天 0 小时' : $row['uptime'];
    });
    $server = find_row(Store::read('servers'), $params['id']);
    log_action($user, 'server.power', '实例 ' . $server['name'] . ' 执行' . $map[$action]['label']);
    respond(array('server' => $server, 'message' => $map[$action]['label'] . '指令已下发'));
});

class Server
{
    public static function update($id, $fn)
    {
        Store::update('servers', function (&$data) use ($id, $fn) {
            foreach ($data as &$row) {
                if ((string)$row['id'] === (string)$id) {
                    $fn($row);
                }
            }
        });
    }
}

$router->post('/servers/{id}/renew', function ($params) {
    $user = require_login();
    $server = find_row(Store::read('servers'), $params['id']);
    if (!$server || (int)$server['userId'] !== (int)$user['id']) {
        respond_error(404, '实例不存在', 404);
    }
    $months = (int)input('months', 1);
    if (!in_array($months, array(1, 3, 6, 12), true)) {
        respond_error(400, '续费周期不可用', 400);
    }
    $product = product_find($server['productId']);
    $plan = plan_find($product, $server['planId']);
    if (!$plan) {
        respond_error(422, '实例套餐已下线，无法自助续费', 422);
    }
    $cost = product_price($product, $plan, $months);
    if ((float)$user['credits'] < $cost) {
        respond_error(422, '账户余额不足，需 ' . $cost . ' 元，请先充值', 422);
    }
    user_adjust_credits($user['id'], -$cost, '实例 ' . $server['name'] . ' 续费 ' . $months . ' 个月', $server['orderNo'], 'balance');
    $base = max(time(), strtotime($server['expireAt']));
    $newExpire = date('Y-m-d H:i:s', strtotime('+' . $months . ' month', $base));
    Server::update($server['id'], function (&$row) use ($newExpire) {
        $row['expireAt'] = $newExpire;
        if ($row['status'] === 'expired') {
            $row['status'] = 'running';
        }
    });
    push_notification($user['id'], 'billing', '续费成功', '实例 ' . $server['name'] . ' 已续费 ' . $months . ' 个月，新到期时间 ' . $newExpire . '。', '#/user/servers/' . $server['id']);
    log_action($user, 'server.renew', '实例 ' . $server['name'] . ' 续费 ' . $months . ' 个月，费用 ' . $cost . ' 元');
    respond(array('cost' => $cost, 'expireAt' => $newExpire));
});

$router->get('/bills', function () {
    $user = require_login();
    $bills = Store::read('bills');
    $items = array();
    $totalRecharge = 0;
    $totalConsume = 0;
    foreach ($bills as $row) {
        if ((int)$row['userId'] === (int)$user['id']) {
            $items[] = $row;
            if ($row['amount'] > 0) {
                $totalRecharge += (float)$row['amount'];
            } else {
                $totalConsume += abs((float)$row['amount']);
            }
        }
    }
    usort($items, function ($a, $b) {
        return strcmp($b['at'], $a['at']);
    });
    $recharges = array();
    foreach (Store::read('recharges') as $row) {
        if ((int)$row['userId'] === (int)$user['id']) {
            $recharges[] = $row;
        }
    }
    usort($recharges, function ($a, $b) {
        return strcmp($b['createdAt'], $a['createdAt']);
    });
    respond(array(
        'items' => $items,
        'recharges' => $recharges,
        'balance' => (float)$user['credits'],
        'totalRecharge' => round($totalRecharge, 2),
        'totalConsume' => round($totalConsume, 2),
    ));
});

$router->post('/recharge', function () {
    $user = require_login();
    $amount = (float)input('amount', 0);
    if ($amount < 1 || $amount > 50000) {
        respond_error(400, '充值金额需在 1-50000 元之间', 400);
    }
    $method = (string)input('method', 'alipay');
    if (!in_array($method, array('alipay', 'wechat'), true)) {
        respond_error(400, '不支持的充值渠道', 400);
    }
    $created = null;
    Store::update('recharges', function (&$data) use ($user, $amount, $method, &$created) {
        $created = array(
            'id' => next_id($data),
            'userId' => (int)$user['id'],
            'userName' => $user['name'],
            'amount' => round($amount, 2),
            'method' => $method,
            'status' => 'pending',
            'note' => '用户申请充值 ' . $amount . ' 元',
            'createdAt' => now(),
            'reviewedAt' => '',
            'reviewNote' => '',
        );
        $data[] = $created;
    });
    push_notification($user['id'], 'billing', '充值申请已提交', '您的 ' . $amount . ' 元充值申请已提交，财务将在 1 个工作日内审核。', '#/user/billing');
    log_action($user, 'recharge.apply', '提交充值申请 ' . $amount . ' 元（' . $method . '）');
    respond($created, 201);
});

$router->get('/tickets', function () {
    $user = require_login();
    $items = array();
    foreach (Store::read('tickets') as $row) {
        if ((int)$row['userId'] === (int)$user['id']) {
            $last = $row['messages'] ? $row['messages'][count($row['messages']) - 1] : null;
            $row['lastMessage'] = $last ? $last['content'] : '';
            $row['messageCount'] = count($row['messages']);
            unset($row['messages']);
            $items[] = $row;
        }
    }
    usort($items, function ($a, $b) {
        return strcmp($b['updatedAt'], $a['updatedAt']);
    });
    respond(array('items' => $items, 'total' => count($items)));
});

$router->post('/tickets', function () {
    $user = require_login();
    $title = trim((string)input('title', ''));
    $category = trim((string)input('category', '其他问题'));
    $priority = (string)input('priority', 'normal');
    $content = trim((string)input('content', ''));
    if (mb_strlen($title) < 4 || mb_strlen($title) > 60) {
        respond_error(400, '工单标题需为 4-60 个字符', 400);
    }
    if (mb_strlen($content) < 10 || mb_strlen($content) > 2000) {
        respond_error(400, '问题描述需为 10-2000 个字符', 400);
    }
    if (!in_array($priority, array('low', 'normal', 'high', 'urgent'), true)) {
        $priority = 'normal';
    }
    $created = null;
    Store::update('tickets', function (&$data) use ($user, $title, $category, $priority, $content, &$created) {
        $created = array(
            'id' => next_id($data),
            'userId' => (int)$user['id'],
            'userName' => $user['name'],
            'title' => $title,
            'category' => $category,
            'priority' => $priority,
            'status' => 'open',
            'createdAt' => now(),
            'updatedAt' => now(),
            'messages' => array(
                array(
                    'id' => 1,
                    'from' => 'user',
                    'author' => $user['name'],
                    'content' => $content,
                    'at' => now(),
                ),
            ),
        );
        $data[] = $created;
    });
    log_action($user, 'ticket.create', '创建工单：' . $title);
    respond($created, 201);
});

$router->get('/tickets/{id}', function ($params) {
    $user = require_login();
    $ticket = find_row(Store::read('tickets'), $params['id']);
    if (!$ticket) {
        respond_error(404, '工单不存在', 404);
    }
    if ((int)$ticket['userId'] !== (int)$user['id'] && $user['role'] !== 'admin') {
        respond_error(403, '无权查看该工单', 403);
    }
    respond($ticket);
});

$router->post('/tickets/{id}/reply', function ($params) {
    $user = require_login();
    $ticket = find_row(Store::read('tickets'), $params['id']);
    if (!$ticket) {
        respond_error(404, '工单不存在', 404);
    }
    if ((int)$ticket['userId'] !== (int)$user['id']) {
        respond_error(403, '无权回复该工单', 403);
    }
    if ($ticket['status'] === 'closed') {
        respond_error(409, '工单已关闭，无法继续回复', 409);
    }
    $content = trim((string)input('content', ''));
    if (mb_strlen($content) < 2) {
        respond_error(400, '回复内容至少 2 个字符', 400);
    }
    Store::update('tickets', function (&$data) use ($params, $user, $content) {
        foreach ($data as &$row) {
            if ((string)$row['id'] === (string)$params['id']) {
                $maxId = 0;
                foreach ($row['messages'] as $m) {
                    $maxId = max($maxId, (int)$m['id']);
                }
                $row['messages'][] = array(
                    'id' => $maxId + 1,
                    'from' => 'user',
                    'author' => $user['name'],
                    'content' => $content,
                    'at' => now(),
                );
                $row['status'] = 'open';
                $row['updatedAt'] = now();
            }
        }
    });
    log_action($user, 'ticket.reply', '回复工单 #' . $params['id']);
    respond(find_row(Store::read('tickets'), $params['id']));
});

$router->post('/tickets/{id}/close', function ($params) {
    $user = require_login();
    $ticket = find_row(Store::read('tickets'), $params['id']);
    if (!$ticket || (int)$ticket['userId'] !== (int)$user['id']) {
        respond_error(404, '工单不存在', 404);
    }
    Store::update('tickets', function (&$data) use ($params) {
        foreach ($data as &$row) {
            if ((string)$row['id'] === (string)$params['id']) {
                $row['status'] = 'closed';
                $row['updatedAt'] = now();
            }
        }
    });
    log_action($user, 'ticket.close', '关闭工单 #' . $params['id']);
    respond(array('message' => '工单已关闭'));
});

$router->get('/user/realname', function () {
    $user = require_login();
    respond(array('realname' => $user['realname']));
});

$router->post('/user/realname', function () {
    $user = require_login();
    $name = trim((string)input('name', ''));
    $idno = trim((string)input('idno', ''));
    $phone = trim((string)input('phone', ''));
    if (mb_strlen($name) < 2 || mb_strlen($name) > 20) {
        respond_error(400, '请输入真实姓名（2-20 个字符）', 400);
    }
    if (strlen($idno) < 8 || strlen($idno) > 30) {
        respond_error(400, '请输入有效的证件号码', 400);
    }
    if (!preg_match('/^1[3-9]\d{9}$/', $phone)) {
        respond_error(400, '请输入有效的手机号码', 400);
    }
    if ($user['realname']['status'] === 'verified') {
        respond_error(409, '已完成实名认证，无需重复提交', 409);
    }
    $masked = mb_substr($idno, 0, 4) . '****' . mb_substr($idno, -4);
    $updated = null;
    Store::update('users', function (&$data) use ($user, $name, $phone, $masked, &$updated) {
        foreach ($data as &$row) {
            if ((int)$row['id'] === (int)$user['id']) {
                $row['realname'] = array(
                    'status' => 'pending',
                    'name' => $name,
                    'idno' => $masked,
                    'at' => now(),
                    'note' => '资料已提交，等待人工审核',
                );
                $row['phone'] = $phone;
                $updated = $row;
            }
        }
    });
    push_notification($user['id'], 'system', '实名认证已提交', '资料已进入人工审核队列，预计 1 个工作日内完成。', '#/user/realname');
    log_action($user, 'realname.submit', '提交个人实名认证资料');
    respond(array('realname' => $updated['realname']));
});

$router->get('/user/security', function () {
    $user = require_login();
    $sessions = array();
    $currentToken = bearer_token();
    foreach (Store::read('tokens') as $row) {
        if ((int)$row['userId'] === (int)$user['id']) {
            $row['current'] = isset($row['token']) && $row['token'] === $currentToken;
            unset($row['token']);
            $sessions[] = $row;
        }
    }
    respond(array(
        'twofa' => !empty($user['security']['twofa']),
        'lastPasswordChange' => $user['security']['lastPasswordChange'],
        'sessions' => $sessions,
    ));
});

$router->post('/user/security/password', function () {
    $user = require_login();
    $old = (string)input('oldPassword', '');
    $new = (string)input('newPassword', '');
    if (!password_verify($old, $user['password_hash'])) {
        respond_error(422, '当前密码不正确', 422);
    }
    if (strlen($new) < 6 || strlen($new) > 32) {
        respond_error(400, '新密码长度需在 6-32 位之间', 400);
    }
    if ($old === $new) {
        respond_error(400, '新密码不能与当前密码相同', 400);
    }
    Store::update('users', function (&$data) use ($user, $new) {
        foreach ($data as &$row) {
            if ((int)$row['id'] === (int)$user['id']) {
                $row['password_hash'] = password_hash($new, PASSWORD_BCRYPT);
                $row['security']['lastPasswordChange'] = now();
            }
        }
    });
    log_action($user, 'security.password', '修改登录密码');
    respond(array('message' => '密码已更新'));
});

$router->post('/user/security/twofa', function () {
    $user = require_login();
    $enabled = (bool)input('enabled', false);
    Store::update('users', function (&$data) use ($user, $enabled) {
        foreach ($data as &$row) {
            if ((int)$row['id'] === (int)$user['id']) {
                $row['security']['twofa'] = $enabled;
            }
        }
    });
    log_action($user, 'security.twofa', $enabled ? '开启两步验证' : '关闭两步验证');
    respond(array('twofa' => $enabled));
});

$router->delete('/user/sessions/{id}', function ($params) {
    $user = require_login();
    $currentToken = bearer_token();
    Store::update('tokens', function (&$data) use ($user, $params, $currentToken) {
        $data = array_values(array_filter($data, function ($row) use ($user, $params, $currentToken) {
            if ((int)$row['userId'] !== (int)$user['id']) {
                return true;
            }
            if ((string)$row['id'] === (string)$params['id']) {
                return isset($row['token']) && $row['token'] === $currentToken;
            }
            return true;
        }));
    });
    log_action($user, 'security.session', '注销登录会话 #' . $params['id']);
    respond(array('message' => '会话已注销'));
});

$router->get('/user/apikeys', function () {
    $user = require_login();
    $items = array();
    foreach (Store::read('apikeys') as $row) {
        if ((int)$row['userId'] === (int)$user['id']) {
            $row['masked'] = mask_key($row['key']);
            $items[] = $row;
        }
    }
    usort($items, function ($a, $b) {
        return strcmp($b['createdAt'], $a['createdAt']);
    });
    respond(array('items' => $items));
});

$router->post('/user/apikeys', function () {
    $user = require_login();
    $name = trim((string)input('name', ''));
    $scopes = input('scopes', array());
    if (mb_strlen($name) < 2 || mb_strlen($name) > 30) {
        respond_error(400, '密钥名称需为 2-30 个字符', 400);
    }
    if (!is_array($scopes) || !$scopes) {
        $scopes = array('servers:read');
    }
    $allowedScopes = array('servers:read', 'servers:power', 'orders:read', 'billing:read', 'tickets:read');
    $scopes = array_values(array_intersect($scopes, $allowedScopes));
    $created = null;
    Store::update('apikeys', function (&$data) use ($user, $name, $scopes, &$created) {
        $created = array(
            'id' => next_id($data),
            'userId' => (int)$user['id'],
            'name' => $name,
            'key' => 'zjmf_live_' . bin2hex(random_bytes(16)),
            'scopes' => $scopes,
            'status' => 'active',
            'createdAt' => now(),
            'lastUsed' => '',
        );
        $data[] = $created;
    });
    log_action($user, 'apikey.create', '创建 API 密钥：' . $name);
    respond($created, 201);
});

$router->delete('/user/apikeys/{id}', function ($params) {
    $user = require_login();
    Store::update('apikeys', function (&$data) use ($user, $params) {
        $data = array_values(array_filter($data, function ($row) use ($user, $params) {
            return !((int)$row['userId'] === (int)$user['id'] && (string)$row['id'] === (string)$params['id']);
        }));
    });
    log_action($user, 'apikey.delete', '删除 API 密钥 #' . $params['id']);
    respond(array('message' => '密钥已删除'));
});

$router->post('/user/apikeys/{id}/rotate', function ($params) {
    $user = require_login();
    $newKey = '';
    Store::update('apikeys', function (&$data) use ($user, $params, &$newKey) {
        foreach ($data as &$row) {
            if ((int)$row['userId'] === (int)$user['id'] && (string)$row['id'] === (string)$params['id']) {
                $row['key'] = 'zjmf_live_' . bin2hex(random_bytes(16));
                $row['createdAt'] = now();
                $row['lastUsed'] = '';
                $newKey = $row['key'];
            }
        }
    });
    if ($newKey === '') {
        respond_error(404, '密钥不存在', 404);
    }
    log_action($user, 'apikey.rotate', '轮换 API 密钥 #' . $params['id']);
    respond(array('key' => $newKey));
});

$router->post('/user/apikeys/{id}/toggle', function ($params) {
    $user = require_login();
    $status = '';
    Store::update('apikeys', function (&$data) use ($user, $params, &$status) {
        foreach ($data as &$row) {
            if ((int)$row['userId'] === (int)$user['id'] && (string)$row['id'] === (string)$params['id']) {
                $row['status'] = $row['status'] === 'active' ? 'disabled' : 'active';
                $status = $row['status'];
            }
        }
    });
    log_action($user, 'apikey.toggle', '切换 API 密钥状态为 ' . $status);
    respond(array('status' => $status));
});

$router->get('/notifications', function () {
    $user = require_login();
    $items = array();
    $unread = 0;
    foreach (Store::read('notifications') as $row) {
        if ((int)$row['userId'] === (int)$user['id']) {
            if (empty($row['read'])) {
                $unread++;
            }
            $items[] = $row;
        }
    }
    usort($items, function ($a, $b) {
        return strcmp($b['at'], $a['at']);
    });
    respond(array('items' => $items, 'unread' => $unread));
});

$router->post('/notifications/read', function () {
    $user = require_login();
    $id = input('id', null);
    Store::update('notifications', function (&$data) use ($user, $id) {
        foreach ($data as &$row) {
            if ((int)$row['userId'] === (int)$user['id']) {
                if ($id === null || (string)$row['id'] === (string)$id) {
                    $row['read'] = true;
                }
            }
        }
    });
    respond(array('message' => '已标记为已读'));
});

$router->get('/user/profile', function () {
    $user = require_login();
    respond(public_user($user));
});

$router->put('/user/profile', function () {
    $user = require_login();
    $name = trim((string)input('name', $user['name']));
    $email = trim((string)input('email', $user['email']));
    $phone = trim((string)input('phone', $user['phone']));
    if (mb_strlen($name) < 1 || mb_strlen($name) > 20) {
        respond_error(400, '昵称需为 1-20 个字符', 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond_error(400, '请输入有效的邮箱地址', 400);
    }
    if ($phone !== '' && !preg_match('/^1[3-9]\d{9}$/', $phone)) {
        respond_error(400, '请输入有效的手机号码', 400);
    }
    $updated = null;
    Store::update('users', function (&$data) use ($user, $name, $email, $phone, &$updated) {
        foreach ($data as $row) {
            if ((int)$row['id'] !== (int)$user['id'] && strcasecmp($row['email'], $email) === 0) {
                respond_error(409, '该邮箱已被其他账户使用', 409);
            }
        }
        foreach ($data as &$row) {
            if ((int)$row['id'] === (int)$user['id']) {
                $row['name'] = $name;
                $row['email'] = $email;
                $row['phone'] = $phone;
                $updated = $row;
            }
        }
    });
    log_action($updated, 'profile.update', '更新个人资料');
    respond(public_user($updated));
});

$router->get('/user/summary', function () {
    $user = require_login();
    $servers = array();
    foreach (Store::read('servers') as $row) {
        if ((int)$row['userId'] === (int)$user['id']) {
            $servers[] = $row;
        }
    }
    $orders = order_list_for_user($user['id']);
    $tickets = array();
    foreach (Store::read('tickets') as $row) {
        if ((int)$row['userId'] === (int)$user['id'] && $row['status'] !== 'closed') {
            $tickets[] = $row;
        }
    }
    $notifications = array();
    foreach (Store::read('notifications') as $row) {
        if ((int)$row['userId'] === (int)$user['id']) {
            $notifications[] = $row;
        }
    }
    usort($notifications, function ($a, $b) {
        return strcmp($b['at'], $a['at']);
    });
    $unpaid = 0;
    foreach ($orders as $order) {
        if ($order['status'] === 'pending') {
            $unpaid++;
        }
    }
    respond(array(
        'balance' => (float)$user['credits'],
        'serverTotal' => count($servers),
        'serverRunning' => count(array_filter($servers, function ($s) { return $s['status'] === 'running'; })),
        'orderTotal' => count($orders),
        'unpaidOrders' => $unpaid,
        'ticketOpen' => count($tickets),
        'servers' => array_slice($servers, 0, 4),
        'orders' => array_slice($orders, 0, 4),
        'notifications' => array_slice($notifications, 0, 4),
        'realnameStatus' => $user['realname']['status'],
    ));
});
