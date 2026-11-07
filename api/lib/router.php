<?php
/**
 * 极简路由：支持 /path/{param} 占位符
 */
class Router
{
    private $routes = array();

    public function add($method, $pattern, $handler)
    {
        $this->routes[] = array(
            'method' => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler,
        );
    }

    public function get($pattern, $handler)
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post($pattern, $handler)
    {
        $this->add('POST', $pattern, $handler);
    }

    public function put($pattern, $handler)
    {
        $this->add('PUT', $pattern, $handler);
    }

    public function delete($pattern, $handler)
    {
        $this->add('DELETE', $pattern, $handler);
    }

    /**
     * 将 /path/{param} 编译为正则片段，占位符转为命名捕获组
     */
    private function compile($pattern)
    {
        $quoted = preg_quote($pattern, '#');
        $quoted = preg_replace('/\\\\{([a-zA-Z_][a-zA-Z0-9_]*)\\\\}/', '(?P<$1>[^/]+)', $quoted);
        return $quoted;
    }

    public function dispatch($method, $path)
    {
        $method = strtoupper($method);
        $path = rtrim($path, '/');
        if ($path === '') {
            $path = '/';
        }
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            $regex = '#^' . $this->compile($route['pattern']) . '$#u';
            if (preg_match($regex, $path, $matches)) {
                $params = array();
                foreach ($matches as $key => $value) {
                    if (!is_int($key)) {
                        $params[$key] = urldecode($value);
                    }
                }
                call_user_func($route['handler'], $params);
                return;
            }
        }
        respond_error(404, '接口不存在：' . $method . ' ' . $path, 404);
    }
}
