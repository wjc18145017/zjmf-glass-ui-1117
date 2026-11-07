<?php
/**
 * 公共接口：配置、产品、公告、帮助
 */

$router->get('/', function () {
    respond(array('service' => 'zjmf-glass-api', 'time' => now()));
});

$router->get('/health', function () {
    $versionFile = dirname(__DIR__, 2) . '/version.json';
    $version = is_file($versionFile) ? json_decode(file_get_contents($versionFile), true) : array();
    respond(array('status' => 'ok', 'time' => now(), 'version' => pick($version, 'version', '0.0.0')));
});

$router->get('/config', function () {
    $settings = settings();
    $versionFile = dirname(__DIR__, 2) . '/version.json';
    $version = is_file($versionFile) ? json_decode(file_get_contents($versionFile), true) : array();
    respond(array(
        'site' => $settings['site'],
        'theme' => theme_normalize(isset($settings['theme']) ? $settings['theme'] : array()),
        'presets' => isset($settings['presets']) ? $settings['presets'] : array(),
        'commerce' => isset($settings['commerce']) ? $settings['commerce'] : array(),
        'version' => pick($version, 'version', '0.0.0'),
        'demo' => true,
    ));
});

$router->get('/products', function () {
    $products = Store::read('products');
    $category = query('category', '');
    $keyword = trim((string)query('q', ''));
    $recommended = query('recommended', '');

    $result = array();
    foreach ($products as $product) {
        if ($category !== '' && $category !== 'all' && $product['category'] !== $category) {
            continue;
        }
        if ($recommended === '1' && empty($product['recommended'])) {
            continue;
        }
        if ($keyword !== '') {
            $haystack = $product['name'] . ' ' . $product['tagline'] . ' ' . $product['description'];
            if (mb_stripos($haystack, $keyword) === false) {
                continue;
            }
        }
        $minPrice = null;
        foreach ($product['plans'] as $plan) {
            if ($minPrice === null || (float)$plan['price'] < $minPrice) {
                $minPrice = (float)$plan['price'];
            }
        }
        $product['minPrice'] = $minPrice;
        $product['planCount'] = count($product['plans']);
        unset($product['description']);
        $result[] = $product;
    }

    $categories = array();
    foreach ($products as $product) {
        $id = $product['category'];
        if (!isset($categories[$id])) {
            $categories[$id] = array('id' => $id, 'name' => $product['categoryName'], 'count' => 0);
        }
        $categories[$id]['count']++;
    }
    respond(array('items' => $result, 'categories' => array_values($categories), 'total' => count($result)));
});

$router->get('/products/{id}', function ($params) {
    $product = product_find($params['id']);
    if (!$product) {
        respond_error(404, '产品不存在或已下架', 404);
    }
    $related = array();
    foreach (Store::read('products') as $row) {
        if ($row['category'] === $product['category'] && (int)$row['id'] !== (int)$product['id']) {
            $related[] = array('id' => $row['id'], 'slug' => pick($row, 'slug', ''), 'name' => $row['name'], 'tagline' => $row['tagline'], 'minPrice' => $row['plans'][0]['price']);
        }
    }
    if (!$related) {
        foreach (Store::read('products') as $row) {
            if ((int)$row['id'] !== (int)$product['id']) {
                $related[] = array('id' => $row['id'], 'slug' => pick($row, 'slug', ''), 'name' => $row['name'], 'tagline' => $row['tagline'], 'minPrice' => $row['plans'][0]['price']);
            }
        }
    }
    $product['related'] = array_slice($related, 0, 3);
    $product['rating'] = 4.9;
    $product['sold'] = 1200 + (int)$product['id'] * 137;
    respond($product);
});

$router->get('/announcements', function () {
    $rows = Store::read('announcements');
    usort($rows, function ($a, $b) {
        if ($a['pinned'] !== $b['pinned']) {
            return $a['pinned'] ? -1 : 1;
        }
        return strcmp($b['createdAt'], $a['createdAt']);
    });
    $items = array();
    foreach ($rows as $row) {
        $plain = preg_replace('/[#>*`\n\r]+/', ' ', $row['content']);
        $plain = trim(preg_replace('/\s+/', ' ', $plain));
        $items[] = array(
            'id' => $row['id'],
            'title' => $row['title'],
            'category' => $row['category'],
            'pinned' => (bool)$row['pinned'],
            'views' => (int)$row['views'],
            'createdAt' => $row['createdAt'],
            'excerpt' => mb_substr($plain, 0, 96) . '...',
        );
    }
    $categories = array();
    foreach ($rows as $row) {
        if (!in_array($row['category'], $categories, true)) {
            $categories[] = $row['category'];
        }
    }
    respond(array('items' => $items, 'categories' => $categories, 'total' => count($items)));
});

$router->get('/announcements/{id}', function ($params) {
    $found = null;
    Store::update('announcements', function (&$data) use ($params, &$found) {
        foreach ($data as &$row) {
            if ((string)$row['id'] === (string)$params['id']) {
                $row['views'] = (int)$row['views'] + 1;
                $found = $row;
            }
        }
    });
    if (!$found) {
        respond_error(404, '公告不存在', 404);
    }
    respond($found);
});

$router->get('/help', function () {
    respond(array('categories' => Store::read('help')));
});
