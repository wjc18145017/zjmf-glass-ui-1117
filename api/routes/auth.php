<?php
/**
 * 认证接口
 */

$router->post('/auth/login', function () {
    $username = trim((string)input('username', ''));
    $password = (string)input('password', '');
    if ($username === '' || $password === '') {
        respond_error(400, '请输入账号与密码', 400);
    }
    $users = Store::read('users');
    $found = null;
    foreach ($users as $user) {
        if (strcasecmp($user['username'], $username) === 0 || strcasecmp($user['email'], $username) === 0) {
            $found = $user;
            break;
        }
    }
    if (!$found) {
        respond_error(401, '账号或密码错误', 401);
    }
    if ($found['status'] !== 'active') {
        respond_error(403, '该账户已被禁用，请联系管理员', 403);
    }
    if (!password_verify($password, $found['password_hash'])) {
        respond_error(401, '账号或密码错误', 401);
    }
    $token = issue_token($found['id']);
    log_action($found, 'auth.login', '用户登录成功（' . user_agent_short() . '）');
    respond(array('token' => $token, 'user' => public_user($found)));
});

$router->post('/auth/register', function () {
    $username = trim((string)input('username', ''));
    $email = trim((string)input('email', ''));
    $password = (string)input('password', '');
    $name = trim((string)input('name', ''));

    if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
        respond_error(400, '用户名需为 3-20 位字母、数字或下划线', 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond_error(400, '请输入有效的邮箱地址', 400);
    }
    if (strlen($password) < 6 || strlen($password) > 32) {
        respond_error(400, '密码长度需在 6-32 位之间', 400);
    }
    if ($name !== '' && mb_strlen($name) > 20) {
        respond_error(400, '昵称不能超过 20 个字符', 400);
    }

    $created = null;
    Store::update('users', function (&$data) use ($username, $email, $password, $name, &$created) {
        foreach ($data as $user) {
            if (strcasecmp($user['username'], $username) === 0) {
                respond_error(409, '该用户名已被注册', 409);
            }
            if (strcasecmp($user['email'], $email) === 0) {
                respond_error(409, '该邮箱已被注册', 409);
            }
        }
        $created = array(
            'id' => next_id($data),
            'username' => $username,
            'email' => $email,
            'name' => $name !== '' ? $name : $username,
            'role' => 'user',
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

    $token = issue_token($created['id']);
    log_action($created, 'auth.register', '新用户注册');
    push_notification($created['id'], 'system', '欢迎加入智简魔方', '完成实名认证后即可购买中国大陆机房产品，祝使用愉快。', '#/user/realname');
    respond(array('token' => $token, 'user' => public_user($created)));
});

$router->post('/auth/forgot', function () {
    $email = trim((string)input('email', ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond_error(400, '请输入有效的邮箱地址', 400);
    }
    $code = str_pad((string)mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
    $found = false;
    foreach (Store::read('users') as $user) {
        if (strcasecmp($user['email'], $email) === 0) {
            $found = true;
            break;
        }
    }
    if ($found) {
        Store::update('password_resets', function (&$data) use ($email, $code) {
            $data = array_values(array_filter($data, function ($row) use ($email) {
                return strcasecmp($row['email'], $email) !== 0;
            }));
            $data[] = array(
                'email' => $email,
                'code' => $code,
                'expiresAt' => time() + 1800,
                'createdAt' => now(),
            );
        });
    }
    respond(array(
        'sent' => true,
        'demoCode' => $found ? $code : '',
        'message' => '若该邮箱已注册，重置验证码已发送（演示环境直接返回验证码）',
    ));
});

$router->post('/auth/reset', function () {
    $email = trim((string)input('email', ''));
    $code = trim((string)input('code', ''));
    $password = (string)input('password', '');
    if (strlen($password) < 6 || strlen($password) > 32) {
        respond_error(400, '密码长度需在 6-32 位之间', 400);
    }
    $valid = false;
    $resets = Store::read('password_resets');
    foreach ($resets as $row) {
        if (strcasecmp($row['email'], $email) === 0 && $row['code'] === $code && (int)$row['expiresAt'] > time()) {
            $valid = true;
        }
    }
    if (!$valid) {
        respond_error(422, '验证码无效或已过期', 422);
    }
    $updated = null;
    Store::update('users', function (&$data) use ($email, $password, &$updated) {
        foreach ($data as &$user) {
            if (strcasecmp($user['email'], $email) === 0) {
                $user['password_hash'] = password_hash($password, PASSWORD_BCRYPT);
                $user['security']['lastPasswordChange'] = now();
                $updated = $user;
            }
        }
    });
    if (!$updated) {
        respond_error(404, '账户不存在', 404);
    }
    Store::update('tokens', function (&$data) use ($updated) {
        $data = array_values(array_filter($data, function ($row) use ($updated) {
            return (int)$row['userId'] !== (int)$updated['id'];
        }));
    });
    Store::update('password_resets', function (&$data) use ($email) {
        $data = array_values(array_filter($data, function ($row) use ($email) {
            return strcasecmp($row['email'], $email) !== 0;
        }));
    });
    log_action($updated, 'auth.reset', '通过邮箱验证码重置密码');
    respond(array('message' => '密码已重置，请重新登录'));
});

$router->get('/auth/me', function () {
    $user = require_login();
    $notifications = Store::read('notifications');
    $unread = 0;
    foreach ($notifications as $row) {
        if ((int)$row['userId'] === (int)$user['id'] && empty($row['read'])) {
            $unread++;
        }
    }
    $cart = cart_decorate(cart_read($user['id'])['items']);
    respond(array(
        'user' => public_user($user),
        'unread' => $unread,
        'cartCount' => $cart['count'],
        'isAdmin' => $user['role'] === 'admin',
    ));
});

$router->post('/auth/logout', function () {
    $token = bearer_token();
    if ($token !== '') {
        revoke_token($token);
    }
    respond(array('message' => '已退出登录'));
});
