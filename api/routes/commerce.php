<?php
/**
 * 购物车与订单接口
 */

$router->get('/cart', function () {
    $user = require_login();
    respond(cart_decorate(cart_read($user['id'])['items']));
});

$router->post('/cart', function () {
    $user = require_login();
    $productId = (int)input('productId', 0);
    $planId = (string)input('planId', '');
    $region = trim((string)input('region', ''));
    $os = trim((string)input('os', ''));
    $months = (int)input('months', 1);
    $qty = max(1, min(10, (int)input('qty', 1)));

    $product = product_find($productId);
    if (!$product) {
        respond_error(404, '产品不存在', 404);
    }
    $plan = plan_find($product, $planId);
    if (!$plan) {
        respond_error(404, '套餐不存在', 404);
    }
    if ($region === '') {
        $region = $product['regions'][0];
    }
    if (!in_array($region, $product['regions'], true)) {
        respond_error(400, '所选可用区不可用', 400);
    }
    if ($os === '') {
        $os = $product['os'][0];
    }
    if (!in_array($os, $product['os'], true)) {
        respond_error(400, '所选操作系统不可用', 400);
    }
    $allowedMonths = array(1, 3, 6, 12);
    if (!in_array($months, $allowedMonths, true)) {
        respond_error(400, '计费周期不可用', 400);
    }
    if ((int)$plan['stock'] < $qty) {
        respond_error(422, '库存不足，当前仅剩 ' . $plan['stock'] . ' 台', 422);
    }

    $key = md5($productId . '|' . $planId . '|' . $region . '|' . $os . '|' . $months);
    $items = cart_read($user['id'])['items'];
    $merged = false;
    foreach ($items as &$item) {
        if ($item['key'] === $key) {
            $item['qty'] = min(10, (int)$item['qty'] + $qty);
            $merged = true;
        }
    }
    unset($item);
    if (!$merged) {
        $items[] = array(
            'key' => $key,
            'productId' => $productId,
            'planId' => $planId,
            'region' => $region,
            'os' => $os,
            'months' => $months,
            'qty' => $qty,
        );
    }
    cart_write($user['id'], $items);
    log_action($user, 'cart.add', '加入购物车：' . $product['name'] . ' / ' . $plan['name']);
    respond(cart_decorate($items));
});

$router->put('/cart', function () {
    $user = require_login();
    $key = (string)input('key', '');
    $qty = (int)input('qty', 1);
    if ($qty < 1 || $qty > 10) {
        respond_error(400, '数量需在 1-10 之间', 400);
    }
    $items = cart_read($user['id'])['items'];
    $found = false;
    foreach ($items as &$item) {
        if ($item['key'] === $key) {
            $item['qty'] = $qty;
            $found = true;
        }
    }
    unset($item);
    if (!$found) {
        respond_error(404, '购物车条目不存在', 404);
    }
    cart_write($user['id'], $items);
    respond(cart_decorate($items));
});

$router->delete('/cart/{key}', function ($params) {
    $user = require_login();
    $items = cart_read($user['id'])['items'];
    $items = array_values(array_filter($items, function ($item) use ($params) {
        return $item['key'] !== $params['key'];
    }));
    cart_write($user['id'], $items);
    respond(cart_decorate($items));
});

$router->delete('/cart', function () {
    $user = require_login();
    cart_write($user['id'], array());
    respond(cart_decorate(array()));
});

function build_order_items($rawItems)
{
    $result = array();
    foreach ($rawItems as $raw) {
        $productId = (int)(isset($raw['productId']) ? $raw['productId'] : 0);
        $product = product_find($productId);
        if (!$product) {
            respond_error(404, '产品不存在：' . $productId, 404);
        }
        $plan = plan_find($product, isset($raw['planId']) ? $raw['planId'] : '');
        if (!$plan) {
            respond_error(404, '套餐不存在：' . $product['name'], 404);
        }
        $months = (int)(isset($raw['months']) ? $raw['months'] : 1);
        if (!in_array($months, array(1, 3, 6, 12), true)) {
            respond_error(400, '计费周期不可用', 400);
        }
        $qty = max(1, min(10, (int)(isset($raw['qty']) ? $raw['qty'] : 1)));
        if ((int)$plan['stock'] < $qty) {
            respond_error(422, $product['name'] . ' / ' . $plan['name'] . ' 库存不足', 422);
        }
        $region = isset($raw['region']) ? $raw['region'] : $product['regions'][0];
        $os = isset($raw['os']) ? $raw['os'] : $product['os'][0];
        if (!in_array($region, $product['regions'], true) || !in_array($os, $product['os'], true)) {
            respond_error(400, '产品配置不合法：' . $product['name'], 400);
        }
        $unitPrice = product_price($product, $plan, $months);
        $result[] = array(
            'productId' => $productId,
            'slug' => $product['slug'],
            'productName' => $product['name'],
            'planId' => $plan['id'],
            'planName' => $plan['name'],
            'region' => $region,
            'os' => $os,
            'months' => $months,
            'qty' => $qty,
            'unitPrice' => $unitPrice,
            'amount' => round($unitPrice * $qty, 2),
        );
    }
    if (!$result) {
        respond_error(400, '订单中没有可结算的商品', 400);
    }
    return $result;
}

$router->post('/orders', function () {
    $user = require_login();
    $directItems = input('items', null);
    $fromCart = false;
    if (is_array($directItems) && count($directItems) > 0) {
        $items = build_order_items($directItems);
    } else {
        $cart = cart_read($user['id']);
        if (empty($cart['items'])) {
            respond_error(400, '购物车为空', 400);
        }
        $items = build_order_items($cart['items']);
        $fromCart = true;
    }
    $amount = 0;
    foreach ($items as $item) {
        $amount += (float)$item['amount'];
    }
    $amount = round($amount, 2);

    $order = null;
    Store::update('orders', function (&$data) use ($user, $items, $amount, &$order) {
        $id = next_id($data);
        $order = array(
            'id' => $id,
            'no' => generate_order_no($id),
            'userId' => (int)$user['id'],
            'status' => 'pending',
            'amount' => $amount,
            'payMethod' => '',
            'createdAt' => now(),
            'paidAt' => '',
            'provisioned' => false,
            'remark' => trim((string)input('remark', '')),
            'items' => $items,
        );
        $data[] = $order;
    });

    if ($fromCart) {
        cart_write($user['id'], array());
    }

    $payWithBalance = input('payWithBalance', false);
    if ($payWithBalance) {
        $order = pay_order($order, 'balance');
    } else {
        log_action($user, 'order.create', '创建订单 ' . $order['no'] . '，金额 ' . $amount . ' 元');
    }

    $order['statusText'] = order_status_text($order['status']);
    respond($order, 201);
});

$router->get('/orders', function () {
    $user = require_login();
    $rows = order_list_for_user($user['id']);
    $status = query('status', '');
    $result = array();
    foreach ($rows as $order) {
        if ($status !== '' && $status !== 'all' && $order['status'] !== $status) {
            continue;
        }
        $order['statusText'] = order_status_text($order['status']);
        $order['itemCount'] = count($order['items']);
        $result[] = $order;
    }
    respond(array('items' => $result, 'total' => count($result)));
});

function order_for_user($id)
{
    $user = require_login();
    $order = find_row(Store::read('orders'), $id);
    if (!$order) {
        foreach (Store::read('orders') as $row) {
            if (isset($row['no']) && strcasecmp($row['no'], (string)$id) === 0) {
                $order = $row;
                break;
            }
        }
    }
    if (!$order) {
        respond_error(404, '订单不存在', 404);
    }
    $isAdmin = $user['role'] === 'admin';
    if (!$isAdmin && (int)$order['userId'] !== (int)$user['id']) {
        respond_error(403, '无权查看该订单', 403);
    }
    return array($order, $user);
}

$router->get('/orders/{id}', function ($params) {
    list($order, $user) = order_for_user($params['id']);
    $servers = array();
    foreach (Store::read('servers') as $server) {
        if (isset($server['orderNo']) && $server['orderNo'] === $order['no']) {
            $servers[] = $server;
        }
    }
    $order['statusText'] = order_status_text($order['status']);
    $order['servers'] = $servers;
    respond($order);
});

$router->post('/orders/{id}/pay', function ($params) {
    list($order, $user) = order_for_user($params['id']);
    if ($order['status'] !== 'pending') {
        respond_error(409, '该订单当前状态不可支付：' . order_status_text($order['status']), 409);
    }
    $method = (string)input('method', 'balance');
    $allowed = array('balance', 'alipay', 'wechat');
    if (!in_array($method, $allowed, true)) {
        respond_error(400, '不支持的支付方式', 400);
    }
    $order = pay_order($order, $method);
    $order['statusText'] = order_status_text($order['status']);
    respond($order);
});

$router->post('/orders/{id}/cancel', function ($params) {
    list($order, $user) = order_for_user($params['id']);
    if ($order['status'] !== 'pending') {
        respond_error(409, '仅待支付订单可以取消', 409);
    }
    $order['status'] = 'cancelled';
    $order['remark'] = trim((string)input('reason', '用户主动取消'));
    Store::update('orders', function (&$data) use ($order) {
        $idx = find_index($data, $order['id']);
        if ($idx >= 0) {
            $data[$idx] = $order;
        }
    });
    log_action($user, 'order.cancel', '取消订单 ' . $order['no']);
    respond(array('id' => $order['id'], 'status' => 'cancelled', 'statusText' => '已取消'));
});
