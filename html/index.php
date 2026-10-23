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
include_once __DIR__ . '/actions/publicWorksFunctions.php';

function e($text)
{
    return htmlspecialchars((string) $text, ENT_QUOTES, 'UTF-8');
}

$pageTitles = array(
    '/' => 'Ambar Velasco Portfolio',
    '/select-works' => 'Select Works - Ambar Velasco',
    '/about' => 'About - Ambar Velasco',
    '/shop' => 'Shop - Ambar Velasco',
    '/current-project' => 'Current Project - Ambar Velasco',
);

$path = '/' . trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
if ($path === '/index.php') {
    $path = '/';
}

$status = 200;
$title = 'Ambar Velasco Portfolio';
$description = 'Professional Website, Artistic Portfolio, and E-Shop of Ambar Velasco. Explore a collection of unique artworks, projects, and creative expressions.';
$canonicalPath = $path;
$shareWork = null;
$work = null;

if (isset($pageTitles[$path])) {
    $title = $pageTitles[$path];
} elseif (preg_match('#^/work/(\d+)(?:/[^/]*)?$#', $path, $match)) {
    $work = $conn ? ambGetPublicWork($conn, $match[1]) : null;
    if ($work) {
        $title = $work['name'] . ' - Ambar Velasco';
        $workText = trim(preg_replace('/\s+/', ' ', strip_tags((string) $work['firstDescription'])));
        $description = $workText !== '' ? $workText . ' — by Ambar Velasco' : 'Artwork by Ambar Velasco';
        $canonicalPath = $work['path'];
        $shareWork = $work;
    } elseif ($conn) {
        $status = 404; // only claim "not found" when the database was asked
    }
} else {
    $status = 404;
}

if ($status === 404) {
    http_response_code(404);
    $title = 'Page not found - Ambar Velasco';
}

$instagramUrl = null;
if ($conn) {
    try {
        // Default preview picture: the first work in the home page slideshow
        if (!$shareWork && $status === 200) {
            $carousel = ambGetCarouselWorks($conn);
            $shareWork = $carousel ? $carousel[0] : null;
        }
        $instagram = $conn->query("SELECT linkRedirection FROM navLinks WHERE linkRedirection LIKE '%instagram.com%' LIMIT 1");
        $instagramUrl = $instagram ? $instagram->fetchColumn() : null;
    } catch (Exception $ex) {
        error_log('index.php preview data: ' . $ex->getMessage());
    }
}

$canonicalUrl = AMB_SITE_URL . $canonicalPath;
$shareImage = $shareWork ? AMB_SITE_URL . ambWebImageUrl($shareWork['location']) : AMB_SITE_URL . '/miscIcons/logo.png';

$person = array('@type' => 'Person', 'name' => 'Ambar Velasco', 'url' => AMB_SITE_URL . '/', 'jobTitle' => 'Artist');
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
    if (!empty($workText)) {
        $structuredData['description'] = $workText;
    }
} else {
    $structuredData = array('@context' => 'https://schema.org') + $person;
}
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
    <meta name="theme-color" content="#ffffff">

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
<body data-status="<?= (int) $status ?>">

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
        <nav id="navLinksBox" class="navLinksBox" aria-label="Main Navigation"></nav>

        <!-- Content Area -->
        <main id="imagesAndContent" class="imagesAndContent" aria-label="Main Content">
            <!-- Content will be loaded dynamically -->
            <div class="initial-loading">
                <div class="loading-spinner"></div>
            </div>
        </main>
    </div>

    <!-- Artwork viewer -->
    <div class="modal fade" id="bigPicModal" tabindex="-1" role="dialog" aria-labelledby="imageTitle" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <button type="button" class="modal-close" data-dismiss="modal" aria-label="Close image view">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <div class="centerLargePhoto">
                    <img id="popUpImage" class="popUpImage" alt="">
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
                    <h2 id="imageTitle"></h2>
                    <p id="imageDescription"></p>
                    <p id="imageCounter" class="image-counter"></p>
                </div>
            </div>
        </div>
    </div>

    <!-- Navigation Overlay for Mobile -->
    <div class="nav-overlay"></div>
</div>
</body>
</html>
