<?php
// The site's own visitor counting (in place of Google Analytics). Recorded
// by actions/visit.php, shown on the admin's Visitors page
// (admin/visitorsAdmin.php). Table: database/visits.sql.
//
// What it keeps, and doesn't: the address seen (without anything after a
// "?"), the name of the website the visitor came from, phone/tablet/computer,
// and a one-day visitor mark. No cookie, nothing in the visitor's browser,
// no IP address and no browser details are stored. The mark is a one-way
// hash of the IP address and browser made with a secret that is replaced
// every day and the old one deleted, so it only tells that day's visitors
// apart and can never be traced back or matched across days.

// The addresses worth counting, each written one way (a painting's or an
// item's name in the address is left off, so a renamed one counts as one).
// Anything else is a mistyped or made-up address and isn't counted.
function ambVisitPath($path)
{
    $path = '/' . trim((string) parse_url((string) $path, PHP_URL_PATH), '/');
    if (in_array($path, array('/', '/select-works', '/about', '/shop', '/current-project', '/shop/basket', '/shop/thank-you'), true)) {
        return $path;
    }
    if (preg_match('#^/(work|shop)/(\d{1,9})(?:/[^/]*)?$#', $path, $m)) {
        return '/' . $m[1] . '/' . (int) $m[2];
    }
    return null;
}

// The other website's name only ("instagram.com"), or '' for none / this site
function ambVisitReferrer($referrer)
{
    $host = strtolower((string) parse_url((string) $referrer, PHP_URL_HOST));
    $host = preg_replace('/^(www\.|m\.|l\.|lm\.)/', '', $host);
    $own = strtolower(preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
    $own = preg_replace('/^www\./', '', $own);
    if ($host === '' || $host === $own || !preg_match('/^[a-z0-9.-]{1,120}$/', $host)) {
        return '';
    }
    return $host;
}

function ambVisitDevice($agent)
{
    if (preg_match('/iPad|Tablet|Android(?!.*Mobile)/i', $agent)) {
        return 'tablet';
    }
    if (preg_match('/Mobi|iPhone|iPod|Android/i', $agent)) {
        return 'phone';
    }
    return 'computer';
}

// Search engines, link previewers and other programs that run a page's script
function ambVisitIsRobot($agent)
{
    return $agent === '' || (bool) preg_match('/bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor|facebookexternalhit|embedly|python|curl|wget/i', $agent);
}

// Today's secret for the visitor mark, kept in the system's temporary folder;
// earlier days' secrets are deleted as soon as a new day's is made
function ambVisitSecret($day)
{
    $dir = rtrim(sys_get_temp_dir(), '/\\') . '/amb-visit-secret';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return null;
    }
    $file = $dir . '/' . $day . '.key';
    $secret = is_file($file) ? (string) @file_get_contents($file) : '';
    if (strlen($secret) !== 64) {
        $secret = bin2hex(random_bytes(32));
        if (@file_put_contents($file, $secret, LOCK_EX) === false) {
            return null;
        }
        @chmod($file, 0600);
        foreach ((array) @glob($dir . '/*.key') as $old) {
            if ($old !== $file) {
                @unlink($old);
            }
        }
        // (two requests making the first secret of the day at once: both
        // use whichever was written last)
        $secret = (string) @file_get_contents($file);
    }
    return $secret;
}

// Records one address seen. False when it wasn't counted (not an address
// worth counting, a robot, or the table isn't there yet).
function ambRecordVisit($conn, $path, $referrer, $agent, $ip)
{
    $path = ambVisitPath($path);
    $agent = (string) $agent;
    if ($path === null || ambVisitIsRobot($agent)) {
        return false;
    }
    $day = date('Y-m-d');
    $secret = ambVisitSecret($day);
    if ($secret === null) {
        return false;
    }
    $visitor = substr(hash_hmac('sha256', $ip . '|' . $agent, $secret), 0, 16);
    try {
        // (the time from PHP, like the day, so the two never disagree about midnight)
        $stmt = $conn->prepare('INSERT INTO siteVisits (visitedAt, day, path, referrer, device, visitor) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute(array(date('Y-m-d H:i:s'), $day, $path, ambVisitReferrer($referrer), ambVisitDevice($agent), $visitor));
    } catch (Throwable $e) {
        return false; // (database/visits.sql hasn't been run yet)
    }
    return true;
}

function ambVisitsReady($conn)
{
    try {
        $conn->query('SELECT 1 FROM siteVisits LIMIT 1');
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

// The numbers for the Visitors page: the last $days days, today included
function ambVisitStats($conn, $days)
{
    $since = date('Y-m-d', strtotime('-' . ($days - 1) . ' days'));
    $one = function ($sql, $params = array()) use ($conn) {
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    };

    // (a visitor is one mark on one day: the marks change every day)
    $totals = $one('SELECT COUNT(*) AS views, COUNT(DISTINCT day, visitor) AS visitors FROM siteVisits WHERE day >= ?', array($since));
    $byDay = array();
    foreach ($one('SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM siteVisits WHERE day >= ? GROUP BY day', array($since)) as $row) {
        $byDay[$row['day']] = $row;
    }
    $daysList = array();
    for ($i = $days - 1; $i >= 0; $i--) {
        $d = date('Y-m-d', strtotime('-' . $i . ' days'));
        $daysList[] = array('day' => $d, 'views' => (int) ($byDay[$d]['views'] ?? 0), 'visitors' => (int) ($byDay[$d]['visitors'] ?? 0));
    }

    $pages = $one("SELECT path, COUNT(*) AS views, COUNT(DISTINCT day, visitor) AS visitors FROM siteVisits
                   WHERE day >= ? AND path NOT LIKE '/work/%' AND path NOT REGEXP '^/shop/[0-9]'
                   GROUP BY path ORDER BY visitors DESC, views DESC", array($since));
    $works = $one("SELECT v.path, w.name, COUNT(*) AS views, COUNT(DISTINCT v.day, v.visitor) AS visitors
                   FROM siteVisits v LEFT JOIN allWorks w ON w.workId = CAST(SUBSTRING(v.path, 7) AS UNSIGNED)
                   WHERE v.day >= ? AND v.path LIKE '/work/%'
                   GROUP BY v.path, w.name ORDER BY visitors DESC, views DESC LIMIT 15", array($since));
    $items = array();
    try {
        $items = $one("SELECT v.path, p.name, COUNT(*) AS views, COUNT(DISTINCT v.day, v.visitor) AS visitors
                       FROM siteVisits v LEFT JOIN shopProducts p ON p.id = CAST(SUBSTRING(v.path, 7) AS UNSIGNED)
                       WHERE v.day >= ? AND v.path REGEXP '^/shop/[0-9]'
                       GROUP BY v.path, p.name ORDER BY visitors DESC, views DESC LIMIT 15", array($since));
    } catch (Throwable $e) {
        // the shop's tables aren't there
    }
    $from = $one("SELECT referrer, COUNT(DISTINCT day, visitor) AS visitors FROM siteVisits
                  WHERE day >= ? AND referrer <> '' GROUP BY referrer ORDER BY visitors DESC LIMIT 15", array($since));
    $devices = $one('SELECT device, COUNT(DISTINCT day, visitor) AS visitors FROM siteVisits WHERE day >= ? GROUP BY device ORDER BY visitors DESC', array($since));

    return array(
        'since' => $since,
        'views' => (int) $totals[0]['views'],
        'visitors' => (int) $totals[0]['visitors'],
        'days' => $daysList,
        'pages' => $pages,
        'works' => $works,
        'items' => $items,
        'from' => $from,
        'devices' => $devices,
    );
}
