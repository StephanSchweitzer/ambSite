<?php
/**
 * db-smoke.php — runs the site's real read paths against a real MySQL 8.4.
 *
 * WHY THIS EXISTS
 *   The practice copy on a laptop can end up on a much newer MySQL than the
 *   server (Homebrew installs whatever is newest, which is an Innovation
 *   release, while the server is on 8.4 LTS). Newer MySQL adds reserved words
 *   and changes default behaviour, so a query can work perfectly on the laptop
 *   and fail live. `php -l` cannot see that -- it only checks syntax.
 *
 *   So CI creates the real tables on the real version and calls the real
 *   functions. Not re-implementations of them: the actual ones the public
 *   pages use, so what passes here is what visitors run.
 *
 * It only reads, apart from the fixtures loaded beforehand, and it runs
 * against a throwaway database. Give it the connection through the same
 * environment variables the site uses -- env.php lets real environment
 * variables win, so no .env is needed.
 */

$root = dirname(__DIR__, 2);

// A warning is a failure here. PHP would otherwise print "Undefined array
// key" and carry on returning a half-built page, which is exactly the kind
// of version difference this is meant to catch.
//
// Except where the site suppressed it with @, which it does deliberately --
// @getimagesize() on an artwork that has no file yet is a handled case, not a
// fault. A custom handler is still called for those, so without this guard the
// test fails on the site behaving exactly as intended.
set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

include $root . '/html/database/pdo.php';
include $root . '/html/actions/publicPageFunctions.php';
include $root . '/html/actions/aboutMeCache.php';
include $root . '/html/actions/shopPageFunctions.php';

$passed = 0;
$failures = array();

/** Runs one check. $test returns true to pass, or a string explaining itself. */
function check($name, $test)
{
    global $passed, $failures;
    try {
        $result = $test();
    } catch (Throwable $e) {
        $failures[] = sprintf("%s\n      %s: %s", $name, get_class($e), $e->getMessage());
        printf("  ✗ %s\n", $name);
        return;
    }
    if ($result === true) {
        $passed++;
        printf("  ✓ %s\n", $name);
        return;
    }
    $failures[] = $name . "\n      " . (is_string($result) ? $result : 'returned something unexpected');
    printf("  ✗ %s\n", $name);
}

function nonEmptyHtml($html, $needle = null)
{
    if (!is_string($html) || trim($html) === '') {
        return 'produced no HTML';
    }
    if ($needle !== null && strpos($html, $needle) === false) {
        return 'HTML did not contain ' . $needle;
    }
    return true;
}

printf("\nMySQL: %s\nPHP:   %s\n\n", $conn->getAttribute(PDO::ATTR_SERVER_VERSION), PHP_VERSION);

// The works carry image dimensions read from the artwork files, so the gallery
// only exercises its srcset and sizing path if the files exist. Three small
// real JPEGs stand in; they are removed again at the end so running this on a
// laptop leaves the practice site's own images untouched.
$imageDir = $root . '/html/baseImages';
$madeImages = array();
if (!is_dir($imageDir)) {
    mkdir($imageDir, 0755, true);
}
foreach (array('fixture-one.jpg' => array(40, 50), 'fixture-two.jpg' => array(50, 40),
               'fixture-hidden.jpg' => array(20, 20), 'fixture-about.jpg' => array(30, 30)) as $name => $size) {
    $path = $imageDir . '/' . $name;
    if (file_exists($path)) {
        continue;
    }
    $im = imagecreatetruecolor($size[0], $size[1]);
    imagefill($im, 0, 0, imagecolorallocate($im, 200, 180, 160));
    imagejpeg($im, $path, 70);
    $madeImages[] = $path;
}

// On a shutdown of any kind, including a fatal error partway through, so a
// crashed run cannot leave its stand-ins behind in a real artwork directory.
register_shutdown_function(function () use (&$madeImages) {
    foreach ($madeImages as $path) {
        @unlink($path);
    }
});

// The About text is cached in a file keyed by the project path, so a copy left
// by the practice site would be read instead of this database. Start clean.
@unlink(ambAboutCacheFile());

// --- the artwork side -------------------------------------------------------

$visibleId = $conn->query("SELECT workId FROM allWorks WHERE name = 'Fixture One'")->fetchColumn();
$hiddenId  = $conn->query("SELECT workId FROM allWorks WHERE name = 'Fixture Hidden'")->fetchColumn();

check('nav links load', function () use ($conn) {
    $links = ambGetNavLinks($conn);
    return count($links) === 2 ? true : 'expected 2 nav links, got ' . count($links);
});

check('projects load with their works', function () use ($conn) {
    $projects = ambGetProjectsWithWorks($conn, 'active');
    if (count($projects) !== 1) {
        return 'expected 1 active project, got ' . count($projects);
    }
    $works = $projects[0]['works'];
    return count($works) === 2 ? true : 'expected 2 works in the project, got ' . count($works);
});

// The fixtures leave sortOrder empty: a project that was never arranged
check('works in a project can keep their own order', function () use ($conn) {
    return ambProjectOrderReady($conn) ? true : 'worksInProjects.sortOrder is missing';
});

check('an unarranged project keeps the old order', function () use ($conn) {
    $projects = ambGetProjectsWithWorks($conn, 'active');
    $names = array_column($projects[0]['works'], 'name');
    return $names === array('Fixture Two', 'Fixture One') ? true : 'got ' . implode(', ', $names);
});

check('a hidden work stays out of a project', function () use ($conn) {
    $projects = ambGetProjectsWithWorks($conn, 'active');
    foreach ($projects[0]['works'] as $work) {
        if (strpos(json_encode($work), 'Fixture Hidden') !== false) {
            return 'the hidden work was included';
        }
    }
    return true;
});

check('the current project loads', function () use ($conn) {
    $projects = ambGetProjectsWithWorks($conn, 'currentProject');
    return count($projects) === 1 ? true : 'expected 1 current project, got ' . count($projects);
});

check('the carousel loads', function () use ($conn) {
    $works = ambGetCarouselWorks($conn);
    return count($works) === 1 ? true : 'expected 1 carousel work, got ' . count($works);
});

check('one work loads by id', function () use ($conn, $visibleId) {
    $work = ambGetPublicWork($conn, $visibleId);
    return !empty($work) ? true : 'the visible work did not load';
});

check('a hidden work does not load by id', function () use ($conn, $hiddenId) {
    $work = ambGetPublicWork($conn, $hiddenId);
    return empty($work) ? true : 'the hidden work loaded, which visitors must never see';
});

check('the About text loads', function () use ($conn) {
    // ambGetAbout() hands back the cache envelope -- array('version', 'about')
    // -- not the row, which is how index.php reads it.
    $cache = ambGetAbout($conn);
    if (empty($cache['version'])) {
        return 'About came back without a version';
    }
    return !empty($cache['about']['description']) ? true : 'About came back without a description';
});

// --- the shop side ----------------------------------------------------------

check('the shop reports itself ready', function () use ($conn) {
    return shopReady($conn) === true ? true : 'shopReady() said the tables are not there';
});

check('shop settings load', function () use ($conn) {
    $settings = shopSettings($conn, true);
    return !empty($settings['currency']) ? true : 'settings came back without a currency';
});

check('delivery zones load', function () use ($conn) {
    $zones = shopGetZones($conn);
    return count($zones) === 1 ? true : 'expected 1 zone, got ' . count($zones);
});

check('live products load', function () use ($conn) {
    $products = shopGetProducts($conn, array('status' => 'live'));
    return count($products) === 1 ? true : 'expected 1 live product, got ' . count($products);
});

check('one product loads by id', function () use ($conn) {
    $id = $conn->query("SELECT id FROM shopProducts WHERE name = 'Fixture Print'")->fetchColumn();
    $product = shopGetLiveProduct($conn, $id);
    return !empty($product) ? true : 'the live product did not load';
});

check('shop links for works load', function () use ($conn) {
    return is_array(shopLinksForWorks($conn)) ? true : 'shopLinksForWorks() did not return an array';
});

// --- the pages the server draws ---------------------------------------------

check('the menu renders', function () use ($conn) {
    $projects = ambGetProjectsWithWorks($conn, 'active');
    return nonEmptyHtml(ambRenderNav(ambGetNavLinks($conn), $projects), 'About');
});

check('the gallery renders', function () use ($conn) {
    return nonEmptyHtml(ambRenderWorks(ambGetProjectsWithWorks($conn, 'active')), 'Fixture One');
});

check('the carousel renders', function () use ($conn) {
    return nonEmptyHtml(ambRenderCarousel(ambGetCarouselWorks($conn)));
});

check('the About page renders', function () use ($conn) {
    $cache = ambGetAbout($conn);
    return nonEmptyHtml(ambRenderAbout($cache['about']));
});

check('the current project renders', function () use ($conn) {
    return nonEmptyHtml(ambRenderCurrentProject(ambGetProjectsWithWorks($conn, 'currentProject')));
});

check('the shop page renders', function () use ($conn) {
    $page = shopPage($conn, '/shop');
    if ($page['status'] !== 200) {
        return '/shop answered ' . $page['status'];
    }
    return nonEmptyHtml($page['html'], 'Fixture Print');
});

check('a shop item page renders', function () use ($conn) {
    $id = $conn->query("SELECT id FROM shopProducts WHERE name = 'Fixture Print'")->fetchColumn();
    $page = shopPage($conn, '/shop/' . $id . '/fixture-print');
    if ($page['status'] !== 200) {
        return 'the item page answered ' . $page['status'];
    }
    return nonEmptyHtml($page['html'], 'Fixture Print');
});

// --- result -----------------------------------------------------------------

printf("\n%d passed, %d failed\n", $passed, count($failures));

if ($failures) {
    print "\nFailures:\n";
    foreach ($failures as $i => $f) {
        printf("  %d. %s\n", $i + 1, $f);
    }
    print "\nThese queries run on the live server's MySQL. Fix them before deploying.\n\n";
    exit(1);
}

print "\nEverything the public pages read works on this MySQL.\n\n";
