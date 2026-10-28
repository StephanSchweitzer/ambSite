<?php
// The About text and photo, kept in a small file so a visit to the About
// page doesn't have to ask the database. The file is rewritten whenever the
// admin page saves a change, and read afresh from the database once a week
// in any case. It lives in the system's temporary folder: always writable by
// the site, and outside the folder a deploy replaces. If it can't be read or
// written, everything falls back to the database, as before.
//
// Each version of the About content has a short "version" code (a
// fingerprint of the text and photo). Pages ask for /actions/aboutMeAPI.php
// ?v=<version>, so browsers can keep that reply for a week and still get
// the new one the moment it changes (the page then asks for a new address).

// How long the file is trusted before it's read again from the database.
// On the practice site that database is replaced by every refresh from the
// real site, so the copy is only kept a minute there.
function ambAboutCacheMaxAge()
{
    $appEnv = function_exists('env') ? env('APP_ENV', 'production') : 'production';
    return $appEnv === 'production' ? 7 * 24 * 3600 : 60;
}

function ambAboutCacheFile()
{
    // One folder per copy of the site, in case two ever share a server
    $folder = rtrim(sys_get_temp_dir(), '/\\') . '/ambsite-cache-' . substr(sha1(dirname(__DIR__, 2)), 0, 12);
    return $folder . '/about.json';
}

// The cached copy: array('version' => ..., 'about' => row or null), or null
// when there's no usable copy (missing, too old, or unreadable)
function ambReadAboutCache()
{
    $file = ambAboutCacheFile();
    $changed = @filemtime($file);
    if ($changed === false) {
        return null;
    }
    $age = time() - $changed;
    if ($age < 0 || $age > ambAboutCacheMaxAge()) {
        return null;
    }
    $cache = json_decode((string) @file_get_contents($file), true);
    if (!is_array($cache) || !isset($cache['version']) || !array_key_exists('about', $cache)) {
        return null;
    }
    if ($cache['about'] !== null && !is_array($cache['about'])) {
        return null;
    }
    return $cache;
}

// Reads the About content from the database and saves the copy. Returns the
// same shape as ambReadAboutCache(), or null if the database can't be read.
function ambRefreshAboutCache($conn)
{
    $file = ambAboutCacheFile();
    // The old copy goes first, so a copy that can't be rewritten can't stay
    // behind showing the previous text for a week
    @unlink($file);

    if (!$conn) {
        return null;
    }
    try {
        $about = $conn->query('SELECT * FROM aboutMe ORDER BY id DESC LIMIT 1')->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        error_log('aboutMeCache: ' . $e->getMessage());
        return null;
    }
    $about = $about ?: null;
    $cache = array(
        'version' => substr(sha1(json_encode($about, JSON_INVALID_UTF8_SUBSTITUTE)), 0, 16),
        'about' => $about,
    );

    // Written to a side file and then moved into place, so a visitor never
    // reads a half-written copy
    $folder = dirname($file);
    if (!is_dir($folder)) {
        @mkdir($folder, 0700, true);
    }
    $temp = $folder . '/about.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($temp, json_encode($cache, JSON_INVALID_UTF8_SUBSTITUTE)) === false || !@rename($temp, $file)) {
        @unlink($temp);
        error_log('aboutMeCache: could not save the copy in ' . $folder);
    }
    return $cache;
}

// The About content, from the copy when there's a good one
function ambGetAbout($conn)
{
    $cache = ambReadAboutCache();
    return $cache !== null ? $cache : ambRefreshAboutCache($conn);
}
