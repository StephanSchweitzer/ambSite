<?php
// The one page of the public site: JavaScript fills in the content. This part
// works out which page was asked for so the browser and search engines get
// the right status (a real 404 for unknown addresses), title and link-preview
// tags — the picture and text shown when someone shares a link in Instagram,
// iMessage, WhatsApp, etc. A shared painting link (/work/<id>/<name>) previews
// that painting.

header('Content-Type: text/html; charset=UTF-8');

global $conn;
$pdoSoftFail = true; // the page still loads if the database is unreachable
include __DIR__ . '/database/pdo.php';
include_once __DIR__ . '/actions/publicPageFunctions.php';
include_once __DIR__ . '/actions/aboutMeCache.php';

function e($text)
{
    return htmlspecialchars((string) $text, ENT_QUOTES, 'UTF-8');
}

// One address per page: /about/ and /index.php are sent on to /about and /,
// and an old or shortened painting link (/work/12) to its full address, so
// search engines never see the same page under two addresses
function redirectTo($path)
{
    $query = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_QUERY);
    header('Location: ' . $path . ($query ? '?' . $query : ''), true, 301);
    die;
}

$requestPath = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if ($requestPath === '/index.php') {
    redirectTo('/');
}
if (strlen($requestPath) > 1 && substr($requestPath, -1) === '/') {
    redirectTo(rtrim($requestPath, '/') ?: '/');
}

$pages = array(
    '/' => array('view' => 'home', 'title' => 'Ambar Velasco Portfolio'),
    '/select-works' => array('view' => 'works', 'title' => 'Select Works - Ambar Velasco'),
    '/about' => array('view' => 'about', 'title' => 'About - Ambar Velasco'),
    '/shop' => array('view' => 'shop', 'title' => 'Shop - Ambar Velasco'),
    '/current-project' => array('view' => 'current-project', 'title' => 'Current Project - Ambar Velasco'),
);

$path = '/' . trim($requestPath, '/');

$status = 200;
$view = 'notfound';
$title = 'Ambar Velasco Portfolio';
$description = 'Professional Website, Artistic Portfolio, and E-Shop of Ambar Velasco. Explore a collection of unique artworks, projects, and creative expressions.';
$canonicalPath = $path;
$shareWork = null;
$work = null;
$workText = '';

if (isset($pages[$path])) {
    $view = $pages[$path]['view'];
    $title = $pages[$path]['title'];
} elseif (preg_match('#^/work/(\d+)(?:/[^/]*)?$#', $path, $match)) {
    $view = 'works';
    $lookupFailed = false;
    try {
        $work = $conn ? ambGetPublicWork($conn, $match[1]) : null;
    } catch (Throwable $ex) {
        // Show the Works page rather than an error; the script finds the painting
        error_log('index.php work ' . $match[1] . ': ' . $ex->getMessage());
        $work = null;
        $lookupFailed = true;
    }
    if ($work) {
        if ($requestPath !== $work['path']) {
            redirectTo($work['path']);
        }
        $title = $work['name'] . ' - Ambar Velasco';
        $workText = ambExcerpt($work['firstDescription'], 100000);
        $description = $workText !== '' ? ambExcerpt($workText, 140) . ' — by Ambar Velasco' : 'Artwork by Ambar Velasco';
        $shareWork = $work;
    } elseif ($conn && !$lookupFailed) {
        $status = 404; // only claim "not found" when the database was asked
        $view = 'notfound';
    }
} else {
    $status = 404;
}

if ($status === 404) {
    http_response_code(404);
    $title = 'Page not found - Ambar Velasco';
}

// What the page shows, fetched here so it can be written straight into the
// page (for search engines, and so visitors don't wait on a second request).
// The script picks the same data up from AMB_PAGE_DATA instead of asking again.
$pageData = array();
$content = null;   // the page's HTML, or null to let the script draw it
$navHtml = '';
$instagramUrl = null;
if ($conn) {
    try {
        $projects = ambGetProjectsWithWorks($conn, 'active');
        $navLinks = ambGetNavLinks($conn);
        $pageData['projects'] = $projects;
        $pageData['navLinks'] = $navLinks;
        // So the script can ask for the About text by its version, which
        // browsers may keep (see aboutMeCache.php)
        $aboutCache = ambGetAbout($conn);
        if ($aboutCache) {
            $pageData['aboutVersion'] = $aboutCache['version'];
        }
        $navHtml = ambRenderNav($navLinks, $projects);

        foreach ($navLinks as $link) {
            if (stripos((string) $link['linkRedirection'], 'instagram.com') !== false) {
                $instagramUrl = $link['linkRedirection'];
                break;
            }
        }

        if ($status === 404) {
            $content = ambRenderNotFound();
        } elseif ($view === 'works') {
            $content = ambRenderWorks($projects);
            if ($work) {
                $pageData['work'] = $work;
            } else {
                $titles = array_map(function ($project) { return $project['title']; }, $projects);
                if ($titles) {
                    $description = 'Works by Ambar Velasco: ' . implode(', ', $titles) . '.';
                }
            }
        } elseif ($view === 'home') {
            $carousel = ambGetCarouselWorks($conn);
            $pageData['carousel'] = $carousel;
            $content = ambRenderCarousel($carousel);
            $shareWork = $carousel ? $carousel[0] : null;
        } elseif ($view === 'about') {
            $about = $aboutCache ? $aboutCache['about'] : null;
            if ($about) {
                $pageData['about'] = $about;
                $content = ambRenderAbout($about);
                $aboutText = ambExcerpt($about['description']);
                if ($aboutText !== '') {
                    $description = $aboutText;
                }
            }
        } elseif ($view === 'current-project') {
            $currentProjects = ambGetProjectsWithWorks($conn, 'currentProject');
            $pageData['currentProject'] = $currentProjects;
            $content = ambRenderCurrentProject($currentProjects);
            if ($currentProjects && $currentProjects[0]['description']) {
                $description = ambExcerpt($currentProjects[0]['description']);
            }
        }

        // Default preview picture: the first work in the home page slideshow
        if (!$shareWork && $status === 200) {
            $carousel = isset($carousel) ? $carousel : ambGetCarouselWorks($conn);
            $shareWork = $carousel ? $carousel[0] : null;
        }
    } catch (Throwable $ex) {
        error_log('index.php page data: ' . $ex->getMessage());
        $pageData = array();
        $content = null;
        $navHtml = '';
    }
} elseif ($status === 404) {
    $content = ambRenderNotFound();
}

$canonicalUrl = AMB_SITE_URL . ($work ? $work['path'] : $canonicalPath);
$shareImage = $shareWork ? AMB_SITE_URL . ambWebImageUrl($shareWork['location']) : AMB_SITE_URL . '/miscIcons/logo.png';

$person = array('@type' => 'Person', '@id' => AMB_SITE_URL . '/#ambar', 'name' => 'Ambar Velasco', 'url' => AMB_SITE_URL . '/', 'jobTitle' => 'Artist');
if ($instagramUrl) {
    $person['sameAs'] = array($instagramUrl);
}
if ($work) {
    $structuredData = array(
        '@context' => 'https://schema.org',
        '@type' => 'VisualArtwork',
        'name' => $work['name'],
        'url' => $canonicalUrl,
        'image' => $shareImage,
        'creator' => $person,
    );
    if (!empty($work['creationYear'])) {
        $structuredData['dateCreated'] = (string) $work['creationYear'];
    }
    if (!empty($work['medium'])) {
        $structuredData['artMedium'] = (string) $work['medium'];
    }
    if ($workText !== '') {
        $structuredData['description'] = $workText;
    }
} elseif ($view === 'home') {
    // The site's name in search results comes from the WebSite entry
    $structuredData = array('@context' => 'https://schema.org', '@graph' => array(
        array('@type' => 'WebSite', 'name' => 'Ambar Velasco', 'url' => AMB_SITE_URL . '/', 'publisher' => array('@id' => $person['@id'])),
        $person,
    ));
} else {
    $structuredData = array('@context' => 'https://schema.org') + $person;
}

$mainPadding = $view === 'home' || $content === null ? '' : ' style="padding-top: 50px;"';
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>

    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','GTM-NHCWWZZJ');</script>
    <!-- End Google Tag Manager -->

    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="theme-color" content="<?= $work ? '#222220' : '#ffffff' ?>">

    <title><?= e($title) ?></title>
    <meta name="description" content="<?= e($description) ?>">
    <meta name="author" content="Ambar Velasco">
<?php if ($status === 404): ?>
    <meta name="robots" content="noindex">
<?php else: ?>
    <link rel="canonical" href="<?= e($canonicalUrl) ?>">

    <!-- Link previews (Instagram, iMessage, WhatsApp, Facebook, etc.) -->
    <meta property="og:site_name" content="Ambar Velasco">
    <meta property="og:type" content="website">
    <meta property="og:title" content="<?= e($title) ?>">
    <meta property="og:description" content="<?= e($description) ?>">
    <meta property="og:url" content="<?= e($canonicalUrl) ?>">
    <meta property="og:image" content="<?= e($shareImage) ?>">
<?php if ($shareWork && $shareWork['width']): ?>
    <meta property="og:image:width" content="<?= (int) $shareWork['width'] ?>">
    <meta property="og:image:height" content="<?= (int) $shareWork['height'] ?>">
    <meta property="og:image:alt" content="<?= e($shareWork['name']) ?> by Ambar Velasco">
<?php endif; ?>
    <meta name="twitter:card" content="summary_large_image">
    <script type="application/ld+json"><?= json_encode($structuredData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) ?></script>
<?php endif; ?>

    <link rel="icon" type="image/x-icon" href="/miscIcons/favicon.ico">

    <!-- Preconnect to external resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://ajax.googleapis.com">
    <link rel="preconnect" href="https://maxcdn.bootstrapcdn.com">

    <!-- Fonts: Lato for UI/body, Cormorant Garamond for display headings -->
    <link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="/ambar.css?v=<?php echo filemtime(__DIR__ . '/ambar.css'); ?>">

    <!-- Scripts load in this order without holding up the page -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.0/jquery.min.js" defer></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js" defer></script>
    <script src="/js/photoFunctions.js?v=<?php echo filemtime(__DIR__ . '/js/photoFunctions.js'); ?>" defer></script>
    <script src="/js/navLinksFunctions.js?v=<?php echo filemtime(__DIR__ . '/js/navLinksFunctions.js'); ?>" defer></script>
</head>
<body data-status="<?= (int) $status ?>"<?= $work ? ' class="modal-open"' : '' ?>>

<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NHCWWZZJ"
                  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->

<div class="page-container">
    <!-- Header -->
    <header class="headerNoMove" id="modifyZIndex">
        <div id="blockForHeader" class="blockForHeader">
            <h1 class="site-title">
                <a href="/" aria-label="Ambar Velasco, home">
                    <img src="/miscIcons/logo.png" id="ambName" fetchpriority="high" class="ambarNamePic" width="760" height="250" alt="Ambar Velasco">
                </a>
            </h1>
            <!-- Hamburger Menu Button -->
            <button id="hamburgerMenu" class="hamburger-menu" aria-label="Open menu" aria-expanded="false" aria-controls="navLinksBox">
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </header>

    <!-- Main Content Area -->
    <div id="sideBySide" class="main-content">
        <!-- Navigation -->
        <nav id="navLinksBox" class="navLinksBox" aria-label="Main Navigation"><?= $navHtml ?></nav>

        <!-- Content Area -->
        <main id="imagesAndContent" class="imagesAndContent" aria-label="Main Content" data-view="<?= e($view) ?>"<?= $content !== null ? ' data-server-view="' . e($view) . '"' : '' ?><?= $mainPadding ?>>
            <?= $content !== null ? $content : ambRenderLoading() ?>
        </main>
    </div>

    <!-- Artwork viewer. A painting link arrives with it already open, so the
         page doesn't show the light gallery first and then fade to dark.
         No Bootstrap "fade": photoFunctions.js animates opening and closing. -->
    <div class="modal<?= $work ? ' show' : '' ?>" id="bigPicModal" tabindex="-1" role="dialog" data-focus="false" aria-labelledby="imageTitle"<?= $work ? ' aria-modal="true" style="display: block;" data-preopened' : ' aria-hidden="true"' ?>>
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <button type="button" class="modal-close" data-dismiss="modal" aria-label="Close image view">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <!-- Zoom and See to scale, beside the close button (photoFunctions.js) -->
                <div class="viewer-toolbar">
                    <button type="button" id="seeToScale" class="viewer-icon" aria-pressed="false" aria-label="See to scale" title="See to scale" hidden>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 16.5L16.5 3L21 7.5L7.5 21Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 12.5l2 2M10 9.5l2 2M13 6.5l2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                    </button>
                    <button type="button" id="zoomIn" class="viewer-icon" aria-pressed="false" aria-label="Zoom in" title="Zoom in">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                </div>
                <div class="centerLargePhoto">
                    <!-- "See to scale": the painting on a wall beside a person (photoFunctions.js) -->
                    <div id="scaleScene" class="scale-scene" aria-hidden="true">
                        <div class="scale-floor"></div>
                        <svg class="scale-person" viewBox="0 0 50 165" preserveAspectRatio="none" aria-hidden="true">
                            <ellipse cx="25" cy="11" rx="8.5" ry="11"/>
                            <path d="M21 21 L29 21 L29 26 C38 26 44 28 45.5 32 C47 35 47.5 40 47.5 46 L47.5 96 C47.5 100 41 100 41 96 L40.5 48 L40 48 L40 86 L39 88 L36 162 C36 165 35 165 33 165 L29 165 C27.5 165 27 164 27 162 L25.8 92 L24.2 92 L23 162 C23 164 22.5 165 21 165 L17 165 C15 165 14 165 14 162 L11 88 L10 86 L10 48 L9.5 48 L9 96 C9 100 2.5 100 2.5 96 L2.5 46 C2.5 40 3 35 4.5 32 C6 28 12 26 21 26 Z"/>
                        </svg>
                        <svg class="scale-mug" viewBox="0 0 11.5 9.5" preserveAspectRatio="none" aria-hidden="true">
                            <path d="M0.2 0.3 L8 0.3 L7.7 8.5 C7.65 9.2 7.3 9.5 6.6 9.5 L1.6 9.5 C0.9 9.5 0.55 9.2 0.5 8.5 Z"/>
                            <path d="M7.9 2.3 C10.6 2.1 11.5 3.4 11.2 4.8 C10.9 6.3 9.6 7.1 7.7 7.1 L7.75 5.9 C9 5.9 9.8 5.4 10 4.6 C10.2 3.8 9.6 3.4 7.85 3.5 Z"/>
                        </svg>
                        <div class="scale-art"><img alt="" decoding="async"></div>
                        <p class="scale-label"></p>
                        <button type="button" class="scale-back viewer-tool">Back to the painting</button>
                    </div>
                    <img id="popUpImage" class="popUpImage" alt="<?= $work ? e($work['name']) : '' ?>"<?= $work ? ' src="' . e(ambWebImageUrl($work['location'])) . '"' : '' ?><?= $work && $work['width'] && $work['height'] ? ' style="--w: ' . (int) $work['width'] . '; --h: ' . (int) $work['height'] . '"' : '' ?>>
                    <div id="spinner" class="spinner-border text-light position-absolute" role="status" style="display: none;">
                        <span class="sr-only">Loading...</span>
                    </div>
                    <!-- Navigation Arrows -->
                    <div class="modal-nav-arrows">
                        <button id="prevImage" class="nav-arrow nav-prev" aria-label="Previous image">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 18L9 12L15 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button id="nextImage" class="nav-arrow nav-next" aria-label="Next image">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 18L15 12L9 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div id="imageInfo" class="imageInfo">
                    <h2 id="imageTitle"><?= $work ? e($work['name']) : '' ?></h2>
                    <p id="imageDescription"><?= $work ? ambMultiline($work['firstDescription']) : '' ?></p>
                    <button type="button" id="imageMore" class="image-more" hidden>more</button>
                    <p id="imageCounter" class="image-counter"></p>
                </div>
            </div>
        </div>
        <!-- Zooming in: a copy of the painting that can be scaled and moved (photoFunctions.js) -->
        <div id="zoomLayer" class="zoom-layer" aria-hidden="true">
            <img alt="" draggable="false">
            <div class="zoom-bar">
                <span id="zoomHint" class="zoom-hint"></span>
                <button type="button" id="zoomOut" class="viewer-tool">Back</button>
            </div>
        </div>
    </div>

<?php if ($work): ?>
    <div class="modal-backdrop show" id="preopenedBackdrop"></div>
<?php endif; ?>

    <!-- Navigation Overlay for Mobile -->
    <div class="nav-overlay"></div>
</div>
<?php if ($pageData): ?>
<script>window.AMB_PAGE_DATA = <?= json_encode($pageData, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE) ?>;</script>
<?php endif; ?>
</body>
</html>
