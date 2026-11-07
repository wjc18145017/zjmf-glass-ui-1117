<?php
/**
 * 极简 JSON 文件存储层
 * - 首次读取时若 data/ 中不存在，自动从 api/seed/ 复制种子数据
 * - 写入使用临时文件 + rename，避免半写
 * - update() 使用文件锁保证并发安全
 */
class Store
{
    public static function root()
    {
        return dirname(__DIR__, 2);
    }

    public static function dataDir()
    {
        $dir = self::root() . '/data';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        return $dir;
    }

    public static function seedDir()
    {
        return dirname(__DIR__) . '/seed';
    }

    public static function path($name)
    {
        return self::dataDir() . '/' . $name . '.json';
    }

    public static function read($name)
    {
        $file = self::path($name);
        if (!is_file($file)) {
            $seed = self::seedDir() . '/' . $name . '.json';
            if (is_file($seed)) {
                @copy($seed, $file);
            } else {
                return array();
            }
        }
        $raw = @file_get_contents($file);
        if ($raw === false || $raw === '') {
            return array();
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : array();
    }

    public static function write($name, $data)
    {
        $file = self::path($name);
        $tmp = $file . '.tmp.' . getmypid();
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) {
            $json = '[]';
        }
        file_put_contents($tmp, $json, LOCK_EX);
        @rename($tmp, $file);
    }

    /**
     * 在排他锁内读取-修改-写入。
     * 回调签名为 function (array &$data) : void
     */
    public static function update($name, $fn)
    {
        $lockFile = self::dataDir() . '/' . $name . '.lock';
        $fp = fopen($lockFile, 'c');
        if (!$fp) {
            $data = self::read($name);
            $fn($data);
            self::write($name, $data);
            return $data;
        }
        flock($fp, LOCK_EX);
        $data = self::read($name);
        $fn($data);
        self::write($name, $data);
        flock($fp, LOCK_UN);
        fclose($fp);
        return $data;
    }
}
