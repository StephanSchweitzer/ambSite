<?php
// "No more than N tries an hour from one visitor", for the public forms that
// a script could otherwise hammer: guessing promo codes, and putting other
// people's addresses on the newsletter list.
//
// Kept in small files in the system's temporary folder (like the About
// cache), so it needs no database table. A visitor is known only by a
// one-way hash of their IP address; nothing readable is stored. If the folder
// can't be written, nothing is limited: these are a brake, never a lock.

function ambRateKey()
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
    return substr(hash('sha256', 'amb-rate|' . $ip . '|' . (string) getenv('DB_PASSWORD')), 0, 32);
}

function ambRateFile($bucket)
{
    $dir = rtrim(sys_get_temp_dir(), '/\\') . '/amb-rate-limit';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return null;
    }
    // Now and then, forget visitors not seen for a day
    if (mt_rand(1, 200) === 1) {
        foreach ((array) @glob($dir . '/*.json') as $old) {
            if (@filemtime($old) < time() - 86400) {
                @unlink($old);
            }
        }
    }
    return $dir . '/' . preg_replace('/[^a-z]/', '', $bucket) . '-' . ambRateKey() . '.json';
}

// The times of this visitor's tries in the last $seconds
function ambRateRead($file, $seconds)
{
    $times = $file && is_file($file) ? json_decode((string) @file_get_contents($file), true) : array();
    $since = time() - $seconds;
    return array_values(array_filter(is_array($times) ? $times : array(), function ($time) use ($since) {
        return is_int($time) && $time > $since;
    }));
}

// True if this visitor has had $max tries in the last $seconds already
function ambRateLimited($bucket, $max, $seconds = 3600)
{
    return count(ambRateRead(ambRateFile($bucket), $seconds)) >= $max;
}

// Counts one try
function ambRateCount($bucket, $seconds = 3600)
{
    $file = ambRateFile($bucket);
    if (!$file) {
        return;
    }
    $handle = @fopen($file, 'c+');
    if (!$handle) {
        return;
    }
    flock($handle, LOCK_EX);
    $times = json_decode((string) stream_get_contents($handle), true);
    $since = time() - $seconds;
    $times = array_values(array_filter(is_array($times) ? $times : array(), function ($time) use ($since) {
        return is_int($time) && $time > $since;
    }));
    $times[] = time();
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode(array_slice($times, -200)));
    flock($handle, LOCK_UN);
    fclose($handle);
}
