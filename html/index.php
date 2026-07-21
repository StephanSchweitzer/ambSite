<?php
header('Content-Type: text/html; charset=UTF-8');
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
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta http-equiv="Cache-Control" content="no-cache">

    <title>Ambar Velasco Portfolio</title>
    <meta name="description" content="Professional Website, Artistic Portfolio, and E-Shop of Ambar Velasco. Explore a collection of unique artworks, projects, and creative expressions.">
    <meta name="author" content="Ambar Velasco">
    <meta name="keywords" content="art, portfolio, ambar velasco, artist, paintings, illustrations, creative, projects">

    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="imgMid/transpLeafStack.ico">

    <!-- Preconnect to external resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://ajax.googleapis.com">
    <link rel="preconnect" href="https://maxcdn.bootstrapcdn.com">

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap" rel="stylesheet">

    <!-- CSS Libraries -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="ambar.css">

    <!-- Scripts that don't need to be loaded immediately -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.0/jquery.min.js"></script>
</head>
<body>

<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NHCWWZZJ"
                  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->

<div class="page-container">
    <!-- Header -->
    <header class="headerNoMove" id="modifyZIndex">
        <div id="blockForHeader" class="blockForHeader">
            <a href="/">
                <img src="imgMid/colorAmbarNew.png" id="ambName" fetchpriority="high" class="ambarNamePic" alt="Ambar Velasco Logo">
            </a>
            <!-- Hamburger Menu Button -->
            <button id="hamburgerMenu" class="hamburger-menu" aria-label="Toggle navigation">
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

    <!-- Image Modal -->
    <div class="modal fade bd-example-modal-sm" id="bigPicModal" tabindex="-1" role="dialog" aria-labelledby="imageModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="centerLargePhoto">
                    <img id="popUpImage" class="popUpImage" alt="Artwork in large view">
                    <div id="spinner" class="spinner-border text-primary position-absolute" role="status" style="display: none;">
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
                </div>
            </div>
        </div>
    </div>

    <!-- Navigation Overlay for Mobile -->
    <div class="nav-overlay"></div>
</div>

<!-- Scripts -->
<script src="js/photoFunctions.js"></script>
<script src="js/navLinksFunctions.js"></script>

<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js" defer></script>
</body>
</html>