<?php
/**
 * What every admin page (and the sign-in page) puts in its <head>: the same
 * libraries at the same versions, the two typefaces of the public site, and
 * the one admin stylesheet, admin.css.
 *
 *   $ambPageTitle = 'Works Administration';
 *   $ambBootstrap = false;   // optional: the shop page has no Bootstrap
 *   $ambKeepSignedIn = false; // optional: the sign-in page (no session to keep)
 *   include __DIR__ . '/adminHead.php';
 *
 * Scripts load here, in <head> and not deferred, so a page's own script can
 * use jQuery and Bootstrap wherever it is included. Bootstrap 5 finds jQuery
 * because jQuery comes first, so $('#x').modal('show') and the like work.
 * Every <script> from a CDN carries its sha384; a new version needs a new one:
 *   curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A
 */

// Only ever included by a page; opened by its own address it shows nothing
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

$ambPageTitle = $ambPageTitle ?? 'Admin';
$ambBootstrap = $ambBootstrap ?? true;
$ambKeepSignedIn = $ambKeepSignedIn ?? true;
$ambAdminDir = __DIR__;
?>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title><?php echo htmlspecialchars($ambPageTitle); ?> · Ambar Velasco</title>
    <link rel="icon" type="image/x-icon" href="/miscIcons/favicon.ico">

    <!-- the site's own copy of its typefaces (vendor/README.md) -->
    <link rel="stylesheet" href="/vendor/fonts/fonts.css?v=<?php echo filemtime($ambAdminDir . '/../vendor/fonts/fonts.css'); ?>">
<?php if ($ambBootstrap): ?>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
<?php endif; ?>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css" integrity="sha384-twcuYPV86B3vvpwNhWJuaLdUSLF9+ttgM2A6M870UYXrOsxKfER2MKox5cirApyA" crossorigin="anonymous">
    <link rel="stylesheet" href="/admin/admin.css?v=<?php echo filemtime($ambAdminDir . '/admin.css'); ?>">

    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.0/jquery.min.js" integrity="sha384-NXgwF8Kv9SSAr+jemKKcbvQsz+teULH/a5UNJvZc6kP47hZgl62M1vGnw6gHQhb1" crossorigin="anonymous"></script>
<?php if ($ambBootstrap): ?>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
<?php endif; ?>
<?php if ($ambKeepSignedIn): ?>
    <script src="/js/adminSession.js?v=<?php echo filemtime($ambAdminDir . '/../js/adminSession.js'); ?>"></script>
<?php endif; ?>
