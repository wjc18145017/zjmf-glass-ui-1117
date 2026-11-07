<?php
/**
 * 业务服务层：主题规范化、购物车、订单、开通、账单等
 */

function theme_fallback()
{
    return array(
        'preset' => 'deepsea',
        'mode' => 'dark',
        'background' => array(
            'type' => 'gradient',
            'color' => '#04121d',
            'from' => '#04121d',
            'to' => '#0b3550',
            'angle' => 140,
            'image' => '',
            'blur' => 0,
            'veil' => 0.2,
            'veilColor' => '#03111a',
        ),
        'glass' => array(
            'alpha' => 0.48,
            'blur' => 20,
            'border' => 0.3,
            'glow' => 0.4,
            'radius' => 20,
            'shadow' => 0.5,
            'saturation' => 1.5,
        ),
        'accent' => array(
            'primary' => '#3fd0c9',
            'secondary' => '#58a6ff',
        ),
    );
}

function theme_normalize($raw)
{
    $fallback = theme_fallback();
    if (!is_array($raw)) {
        return $fallback;
    }
    $bg = isset($raw['background']) && is_array($raw['background']) ? $raw['background'] : array();
    $glass = isset($raw['glass']) && is_array($raw['glass']) ? $raw['glass'] : array();
    $accent = isset($raw['accent']) && is_array($raw['accent']) ? $raw['accent'] : array();

    $type = pick($bg, 'type', 'gradient');
    if (!in_array($type, array('solid', 'gradient', 'image'), true)) {
        $type = 'gradient';
    }

    $image = trim((string)pick($bg, 'image', ''));
    if ($image !== '' && !preg_match('#^(https?://|/uploads/|data:image/)#i', $image)) {
        $image = '';
    }

    $mode = pick($raw, 'mode', 'dark');
    if (!in_array($mode, array('dark', 'light', 'system'), true)) {
        $mode = 'dark';
    }

    $preset = pick($raw, 'preset', 'custom');
    if (!is_string($preset)) {
        $preset = 'custom';
    }

    return array(
        'preset' => $preset,
        'mode' => $mode,
        'background' => array(
            'type' => $type,
            'color' => is_hex_color(pick($bg, 'color')) ? $bg['color'] : '#04121d',
            'from' => is_hex_color(pick($bg, 'from')) ? $bg['from'] : '#04121d',
            'to' => is_hex_color(pick($bg, 'to')) ? $bg['to'] : '#0b3550',
            'angle' => (int)clamp_num(pick($bg, 'angle', 140), 0, 360, 140),
            'image' => $image,
            'blur' => clamp_num(pick($bg, 'blur', 0), 0, 40, 0),
            'veil' => clamp_num(pick($bg, 'veil', 0.2), 0, 0.9, 0.2),
            'veilColor' => is_hex_color(pick($bg, 'veilColor')) ? $bg['veilColor'] : '#03111a',
        ),
        'glass' => array(
            'alpha' => clamp_num(pick($glass, 'alpha', 0.48), 0.25, 0.95, 0.48),
            'blur' => clamp_num(pick($glass, 'blur', 20), 0, 40, 20),
            'border' => clamp_num(pick($glass, 'border', 0.3), 0, 0.9, 0.3),
            'glow' => clamp_num(pick($glass, 'glow', 0.4), 0, 0.9, 0.4),
            'radius' => clamp_num(pick($glass, 'radius', 20), 0, 40, 20),
            'shadow' => clamp_num(pick($glass, 'shadow', 0.5), 0, 1, 0.5),
            'saturation' => clamp_num(pick($glass, 'saturation', 1.5), 1, 2.5, 1.5),
        ),
        'accent' => array(
            'primary' => is_hex_color(pick($accent, 'primary')) ? $accent['primary'] : '#3fd0c9',
            'secondary' => is_hex_color(pick($accent, 'secondary')) ? $accent['secondary'] : '#58a6ff',
        ),
    );
}

function product_find($id)
{
    $products = Store::read('products');
    $found = find_row($products, $id);
    if ($found) {
        return $found;
    }
    foreach ($products as $product) {
        if (isset($product['slug']) && strcasecmp($product['slug'], (string)$id) === 0) {
            return $product;
        }
    }
    return null;
}

function plan_find($product, $planId)
{
    if (!$product || empty($product['plans'])) {
        return null;
    }
    foreach ($product['plans'] as $plan) {
        if ((string)$plan['id'] === (string)$planId) {
            return $plan;
        }
    }
    return null;
}

function plan_spec($plan, $labels, $default = '-')
{
    if (!$plan || empty($plan['specs'])) {
        return $default;
    }
    foreach ($plan['specs'] as $spec) {
        foreach ($labels as $label) {
            if (isset($spec['label']) && $spec['label'] === $label) {
                return $spec['value'];
            }
        }
    }
    return $default;
}

function cart_read($userId)
{
    $carts = Store::read('carts');
    foreach ($carts as $cart) {
        if ((int)$cart['userId'] === (int)$userId) {
            return $cart;
        }
    }
    return array('userId' => (int)$userId, 'items' => array());
}

function cart_write($userId, $items)
{
    Store::update('carts', function (&$data) use ($userId, $items) {
        $found = false;
        foreach ($data as &$cart) {
            if ((int)$cart['userId'] === (int)$userId) {
                $cart['items'] = $items;
                $found = true;
            }
        }
        if (!$found) {
            $data[] = array('userId' => (int)$userId, 'items' => $items);
        }
    });
}

function cart_decorate($items)
{
    $result = array();
    $total = 0;
    foreach ($items as $item) {
        $product = product_find($item['productId']);
        if (!$product) {
            continue;
        }
        $plan = plan_find($product, $item['planId']);
        if (!$plan) {
            continue;
        }
        $months = (int)$item['months'];
        $qty = max(1, (int)$item['qty']);
        $unitPrice = product_price($product, $plan, $months);
        $amount = round($unitPrice * $qty, 2);
        $result[] = array(
            'key' => $item['key'],
            'productId' => (int)$product['id'],
            'productName' => $product['name'],
            'slug' => $product['slug'],
            'planId' => $plan['id'],
            'planName' => $plan['name'],
            'region' => $item['region'],
            'os' => $item['os'],
            'months' => $months,
            'qty' => $qty,
            'unitPrice' => $unitPrice,
            'amount' => $amount,
            'specs' => $plan['specs'],
            'stock' => (int)$plan['stock'],
        );
        $total += $amount;
    }
    return array('items' => $result, 'total' => round($total, 2), 'count' => count($result));
}

function order_list_for_user($userId)
{
    $orders = Store::read('orders');
    $result = array();
    foreach ($orders as $order) {
        if ((int)$order['userId'] === (int)$userId) {
            $result[] = $order;
        }
    }
    usort($result, function ($a, $b) {
        return strcmp($b['createdAt'], $a['createdAt']);
    });
    return $result;
}

function order_status_text($status)
{
    $map = array(
        'pending' => '待支付',
        'paid' => '已支付',
        'cancelled' => '已取消',
        'refunded' => '已退款',
    );
    return isset($map[$status]) ? $map[$status] : $status;
}

function bill_add($userId, $type, $amount, $balanceAfter, $note, $orderNo, $method)
{
    Store::update('bills', function (&$data) use ($userId, $type, $amount, $balanceAfter, $note, $orderNo, $method) {
        $data[] = array(
            'id' => next_id($data),
            'userId' => (int)$userId,
            'type' => $type,
            'amount' => round($amount, 2),
            'balanceAfter' => round($balanceAfter, 2),
            'method' => $method,
            'status' => 'completed',
            'note' => $note,
            'orderNo' => $orderNo,
            'at' => now(),
        );
    });
}

function user_adjust_credits($userId, $delta, $note, $orderNo, $method)
{
    $balance = 0;
    Store::update('users', function (&$data) use ($userId, $delta, &$balance) {
        foreach ($data as &$user) {
            if ((int)$user['id'] === (int)$userId) {
                $user['credits'] = round(((float)$user['credits']) + $delta, 2);
                if ($user['credits'] < 0) {
                    $user['credits'] = 0;
                }
                $balance = $user['credits'];
            }
        }
    });
    bill_add($userId, $delta >= 0 ? 'recharge' : 'consume', $delta, $balance, $note, $orderNo, $method);
    return $balance;
}

function server_name_prefix($product, $plan)
{
    $map = array(
        'cloud-ecs' => 'ecs',
        'gpu-cloud' => 'gpu',
        'hk-dedicated' => 'hk-ded',
        'hk-vps' => 'hk-vps',
        'anti-ddos-cdn' => 'cdn',
        'object-storage' => 'oss',
        'shared-hosting' => 'host',
    );
    $slug = isset($product['slug']) ? $product['slug'] : '';
    $prefix = isset($map[$slug]) ? $map[$slug] : 'srv';
    return $prefix;
}

function provision_order(&$order, $user)
{
    if (!empty($order['provisioned'])) {
        return array();
    }
    $servers = Store::read('servers');
    $created = array();
    $nextId = next_id($servers);
    foreach ($order['items'] as $item) {
        $product = product_find($item['productId']);
        $plan = plan_find($product, $item['planId']);
        $qty = max(1, (int)$item['qty']);
        for ($i = 0; $i < $qty; $i++) {
            $prefix = $product ? server_name_prefix($product, $plan) : 'srv';
            $name = $prefix . '-' . substr(md5(uniqid((string)mt_rand(), true)), 0, 6);
            $expireAt = date('Y-m-d H:i:s', strtotime('+' . (int)$item['months'] . ' month'));
            $isCdn = $product && $product['slug'] === 'anti-ddos-cdn';
            $server = array(
                'id' => $nextId++,
                'userId' => (int)$order['userId'],
                'name' => $name,
                'productId' => (int)$item['productId'],
                'productName' => $item['productName'],
                'planId' => $item['planId'],
                'planName' => $item['planName'],
                'region' => $item['region'],
                'os' => $item['os'],
                'ip' => $isCdn ? ($name . '.zjmf-demo.local') : random_ip(),
                'ipv6' => '',
                'status' => 'running',
                'cpu' => plan_spec($plan, array('CPU'), '-'),
                'ram' => plan_spec($plan, array('内存'), '-'),
                'disk' => plan_spec($plan, array('系统盘', '硬盘', '存储空间', '空间'), '-'),
                'bandwidth' => plan_spec($plan, array('带宽', '防护峰值'), '-'),
                'trafficUsed' => 0,
                'trafficLimit' => plan_spec($plan, array('月流量'), '不限'),
                'createdAt' => now(),
                'expireAt' => $expireAt,
                'orderNo' => $order['no'],
                'sshPort' => $isCdn ? 0 : 22,
                'note' => '订单 ' . $order['no'] . ' 自动开通',
                'uptime' => '0 天 0 小时',
            );
            $servers[] = $server;
            $created[] = $server;
        }
    }
    Store::write('servers', $servers);
    $order['provisioned'] = true;
    if ($created) {
        push_notification(
            $order['userId'],
            'system',
            '实例已开通',
            '订单 ' . $order['no'] . ' 已开通 ' . count($created) . ' 个实例，可前往「我的服务器」查看。',
            '#/user/servers'
        );
    }
    return $created;
}

function pay_order(&$order, $method)
{
    $user = null;
    $users = Store::read('users');
    $idx = find_index($users, $order['userId']);
    if ($idx < 0) {
        respond_error(404, '订单所属用户不存在', 404);
    }
    $user = $users[$idx];
    $amount = (float)$order['amount'];

    if ($method === 'balance') {
        if ((float)$user['credits'] < $amount) {
            respond_error(422, '账户余额不足，请先充值或更换支付方式', 422);
        }
        user_adjust_credits($user['id'], -$amount, '订单 ' . $order['no'] . ' 支付', $order['no'], 'balance');
    }

    $order['status'] = 'paid';
    $order['paidAt'] = now();
    $order['payMethod'] = $method;
    provision_order($order, $user);

    $orders = Store::read('orders');
    $oi = find_index($orders, $order['id']);
    if ($oi >= 0) {
        $orders[$oi] = $order;
        Store::write('orders', $orders);
    }

    log_action($user, 'order.pay', '支付订单 ' . $order['no'] . '，金额 ' . $amount . ' 元（' . $method . '）');
    push_notification($user['id'], 'billing', '订单支付成功', '订单 ' . $order['no'] . ' 已支付 ' . $amount . ' 元，实例正在自动开通。', '#/user/orders');
    return $order;
}

function admin_stats()
{
    $users = Store::read('users');
    $orders = Store::read('orders');
    $servers = Store::read('servers');
    $tickets = Store::read('tickets');
    $recharges = Store::read('recharges');

    $revenue = 0;
    $paidOrders = 0;
    foreach ($orders as $order) {
        if ($order['status'] === 'paid') {
            $revenue += (float)$order['amount'];
            $paidOrders++;
        }
    }

    $running = 0;
    foreach ($servers as $server) {
        if ($server['status'] === 'running') {
            $running++;
        }
    }

    $openTickets = 0;
    foreach ($tickets as $ticket) {
        if ($ticket['status'] !== 'closed') {
            $openTickets++;
        }
    }

    $pendingRecharges = 0;
    foreach ($recharges as $row) {
        if ($row['status'] === 'pending') {
            $pendingRecharges++;
        }
    }

    $days = array();
    for ($i = 6; $i >= 0; $i--) {
        $day = date('Y-m-d', strtotime('-' . $i . ' day'));
        $days[$day] = 0;
    }
    foreach ($orders as $order) {
        if ($order['status'] === 'paid' && !empty($order['paidAt'])) {
            $day = substr($order['paidAt'], 0, 10);
            if (isset($days[$day])) {
                $days[$day] += (float)$order['amount'];
            }
        }
    }
    $chart = array();
    foreach ($days as $day => $value) {
        $chart[] = array('date' => $day, 'revenue' => round($value, 2));
    }

    $recentOrders = array();
    $sorted = $orders;
    usort($sorted, function ($a, $b) {
        return strcmp($b['createdAt'], $a['createdAt']);
    });
    $recentOrders = array_slice($sorted, 0, 6);

    return array(
        'userTotal' => count($users),
        'userActive' => count(array_filter($users, function ($u) { return $u['status'] === 'active'; })),
        'orderTotal' => count($orders),
        'orderPaid' => $paidOrders,
        'revenue' => round($revenue, 2),
        'serverTotal' => count($servers),
        'serverRunning' => $running,
        'ticketOpen' => $openTickets,
        'pendingRecharges' => $pendingRecharges,
        'revenueChart' => $chart,
        'recentOrders' => $recentOrders,
        'serverStatus' => array(
            'running' => $running,
            'stopped' => count(array_filter($servers, function ($s) { return $s['status'] === 'stopped'; })),
            'expired' => count(array_filter($servers, function ($s) { return $s['status'] === 'expired'; })),
        ),
    );
}
