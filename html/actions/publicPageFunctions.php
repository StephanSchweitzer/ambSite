<?php
// Server-side copies of what the public site's JavaScript draws, so every page
// arrives already filled in: search engines and link previews see the real
// menu, works and text without running any script, and visitors see the page
// straight away instead of a spinner. The markup matches what
// js/photoFunctions.js and js/navLinksFunctions.js build, so the script can
// keep it as it is rather than draw it again. If you change the markup in one
// place, change it in the other.

include_once __DIR__ . '/publicWorksFunctions.php';

function ambHtml($text)
{
    return htmlspecialchars((string) $text, ENT_QUOTES, 'UTF-8');
}

// Descriptions are stored as HTML-ish text written in the admin; the script
// shows them with line breaks turned into <br> (multiline() in photoFunctions.js)
function ambMultiline($text)
{
    return $text ? str_replace("\n", '<br>', (string) $text) : '';
}

// Plain text for a meta description: no tags, single spaces, cut at a word
function ambExcerpt($html, $length = 160)
{
    $text = trim(preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags((string) $html), ENT_QUOTES, 'UTF-8')));
    if (mb_strlen($text, 'UTF-8') <= $length) {
        return $text;
    }
    $cut = mb_substr($text, 0, $length, 'UTF-8');
    $space = mb_strrpos($cut, ' ', 0, 'UTF-8');
    return rtrim($space > $length * 0.6 ? mb_substr($cut, 0, $space, 'UTF-8') : $cut, ' ,.;:-') . '…';
}

// Same as projectSectionId() in photoFunctions.js
function ambSectionId($title)
{
    $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower(trim((string) $title))), '-');
    return 'section-' . ($slug === '' ? 'project' : $slug);
}

// Same as workImage() in photoFunctions.js
function ambWorkImage($work, $lazy, $sizes = null, $className = null)
{
    $attributes = array(
        'loading' => $lazy ? 'lazy' : 'eager',
        'decoding' => 'async',
    );
    if ($work['width'] && $work['height']) {
        $attributes['width'] = $work['width'];
        $attributes['height'] = $work['height'];
        if ($sizes && $work['width'] > 400) {
            $attributes['sizes'] = $sizes;
            $attributes['srcset'] = '/thumbnails/' . rawurlencode($work['location']) . ' 400w, '
                . ambWebImageUrl($work['location']) . ' ' . $work['width'] . 'w';
        }
    }
    $attributes['src'] = ambWebImageUrl($work['location']);
    $attributes['alt'] = $work['name'];
    $attributes['data-original'] = '/baseImages/' . rawurlencode($work['location']);
    if ($className) {
        $attributes['class'] = $className;
    }

    $html = '<img';
    foreach ($attributes as $name => $value) {
        $html .= ' ' . $name . '="' . ambHtml($value) . '"';
    }
    return $html . '>';
}

// ---------------------------------------------------------------------------
// Menu (navLinksFunctions.js: insertLinks, createNewNavLinkRow,
// loadAndDisplayProjectTitles)
// ---------------------------------------------------------------------------

function ambGetNavLinks($conn)
{
    return $conn->query('SELECT ID, displayedText, linkRedirection, displayedOrder, isChangeable, onclick, isNewTab, attachedFollowingDiv
                         FROM navLinks WHERE visible = 1 ORDER BY displayedOrder ASC')
                ->fetchAll(PDO::FETCH_ASSOC);
}

// The site page a menu link shows, from the instructions stored with it
function ambNavLinkPage($link)
{
    $pages = array(
        'getProjectsAndWorks' => '/select-works',
        'openInfo' => '/about',
        'loadShop' => '/shop',
        'openCurrentProject' => '/current-project',
    );
    foreach (explode(';', (string) $link['onclick']) as $instruction) {
        $instruction = trim($instruction);
        if (isset($pages[$instruction])) {
            return $pages[$instruction];
        }
    }
    return null;
}

function ambNavLinkHref($link)
{
    $href = $link['linkRedirection'];
    $page = ambNavLinkPage($link);
    if ($page && ($href === null || $href === '' || $href === '#')) {
        $href = $page;
    }
    return $href;
}

function ambRenderNav($links, $projects)
{
    $html = '';
    foreach ($links as $link) {
        $href = ambNavLinkHref($link);
        $html .= '<div class="nav-link-container"><a'
            . ($href !== null ? ' href="' . ambHtml($href) . '"' : '')
            . ' class="mainLinkGenres"'
            . ($link['isNewTab'] == 1 ? ' target="_blank" rel="noopener"' : '')
            . '>' . ambHtml($link['displayedText']) . '</a></div>';

        $extra = $link['attachedFollowingDiv'] ? json_decode($link['attachedFollowingDiv'], true) : null;
        if (!is_array($extra)) {
            continue;
        }
        $id = isset($extra['id']) ? (string) $extra['id'] : '';
        $inner = '';
        $style = '';
        if ($id === 'selectProjectCategories') {
            foreach ($projects as $project) {
                $inner .= '<a href="/select-works#' . ambHtml(ambSectionId($project['title'])) . '">' . ambHtml($project['title']) . '</a>';
            }
        } elseif ($id === 'newsletterSignUp') {
            $inner = '<div class="newsletter-container">'
                . '<label for="newsletterEmail" class="sr-only">Email address</label>'
                . '<input type="email" id="newsletterEmail" placeholder="Enter your email address" class="newsletter-input" autocomplete="email">'
                . '<div class="button-container"><button id="newsletterSubmit" class="newsletter-button">Subscribe</button></div>'
                . '</div>';
            $style = ' style="display: none;"';
        }
        $html .= '<div id="' . ambHtml($id) . '" class="' . ambHtml(isset($extra['class']) ? $extra['class'] : '') . '"' . $style . '>' . $inner . '</div>';
    }
    return $html;
}

// ---------------------------------------------------------------------------
// Pages (photoFunctions.js: renderWorks, renderHome, renderAbout, ...)
// ---------------------------------------------------------------------------

define('AMB_GALLERY_SIZES', '(max-width: 992px) 92vw, 62vw');

function ambRenderWorks($projects)
{
    $html = '';
    $index = 0;
    $last = count($projects) - 1;
    foreach ($projects as $projectIndex => $project) {
        $html .= '<section class="project" id="' . ambHtml(ambSectionId($project['title'])) . '">'
            . '<div class="project-header"><h2 class="project-title">' . ambHtml($project['title']) . '</h2>'
            . ($project['description'] ? '<p class="project-description">' . ambMultiline($project['description']) . '</p>' : '')
            . '</div><div class="projectWorks">';
        foreach ($project['works'] as $work) {
            $html .= '<a class="card work-card" href="' . ambHtml($work['path']) . '" data-index="' . $index . '" aria-label="' . ambHtml($work['name']) . '">'
                . '<div class="img-container">' . ambWorkImage($work, $index > 1, AMB_GALLERY_SIZES)
                . '<div class="img-overlay" aria-hidden="true"><h3 class="overlay-title">' . ambHtml($work['name']) . '</h3></div>'
                . '</div></a>';
            $index++;
        }
        $html .= '</div>';
        if ($projectIndex < $last) {
            $html .= '<div class="work-separator" aria-hidden="true"> ✧ ˚. ࣪ ˖ ·ﾟ ·ﾟ·:。·ﾟﾟ·✮ ⋆ ˚。☆ ⋆。°✩·ﾟ ·ﾟ·:。·ﾟﾟ·°˖✧</div>';
        }
        $html .= '</section>';
    }
    return $html;
}

function ambRenderCarousel($works)
{
    $html = '<div id="homePageCarousel" class="carousel slide homePageCarousel"><div class="carousel-inner">';
    foreach ($works as $index => $work) {
        $html .= '<div class="carousel-item' . ($index === 0 ? ' active' : '') . '">'
            . '<a class="carousel-link" href="' . ambHtml($work['path']) . '" data-index="' . $index . '" aria-label="' . ambHtml($work['name']) . '">'
            . ambWorkImage($work, $index > 0, AMB_GALLERY_SIZES, 'd-block carousel-pic')
            . '</a></div>';
    }
    $html .= '</div>';
    if (count($works) > 1) {
        $html .= '<a class="carousel-control-prev" href="#homePageCarousel" role="button" data-slide="prev">'
            . '<span class="carousel-control-prev-icon" aria-hidden="true"></span><span class="sr-only">Previous</span></a>'
            . '<a class="carousel-control-next" href="#homePageCarousel" role="button" data-slide="next">'
            . '<span class="carousel-control-next-icon" aria-hidden="true"></span><span class="sr-only">Next</span></a>';
    }
    return $html . '</div>';
}

// Plain email addresses in the About text become mailto links
// (linkEmailAddresses() in photoFunctions.js)
function ambLinkEmailAddresses($html)
{
    $parts = preg_split('/(<[^>]*>)/', $html, -1, PREG_SPLIT_DELIM_CAPTURE);
    $insideLink = 0;
    foreach ($parts as $i => $part) {
        if ($part !== '' && $part[0] === '<') {
            if (preg_match('#^<a[\s>]#i', $part)) {
                $insideLink++;
            } elseif (preg_match('#^</a\s*>#i', $part)) {
                $insideLink = max(0, $insideLink - 1);
            }
        } elseif (!$insideLink) {
            $parts[$i] = preg_replace('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', '<a href="mailto:$0" class="email-link">$0</a>', $part);
        }
    }
    return implode('', $parts);
}

function ambAboutPicture($about)
{
    $picture = !empty($about['pictureLocation']) ? $about['pictureLocation'] : 'baseImages/bubbers.jpg';
    return preg_match('#^(https?:)?/#', $picture) ? $picture : '/' . $picture;
}

// The side-by-side layout; the script switches to the stacked one on
// screens 1206px wide or less
function ambRenderAbout($about)
{
    return '<div class="infoflex"><div class="size1" id="aboutMeInfo"><p>'
        . ambLinkEmailAddresses(ambMultiline($about['description']))
        . '</p></div><div class="size2"><div class="ambPicDiv">'
        . '<img id="ambarPersoPic" alt="Portrait of Ambar Velasco" decoding="async" src="' . ambHtml(ambAboutPicture($about)) . '">'
        . '</div></div></div>';
}

function ambRenderCurrentProject($projects)
{
    $html = '';
    $index = 0;
    foreach ($projects as $project) {
        $html .= '<div class="project" id="' . ambHtml(ambSectionId($project['title'])) . '" style="text-align: center;"><div>'
            . '<h2 style="margin-bottom: 30px;">' . ambHtml($project['title']) . '</h2>'
            . '<p style="color: rgb(113, 121, 126); margin-bottom: 60px;">' . ambMultiline($project['description']) . '</p>'
            . '</div><div class="projectWorks">';
        foreach ($project['works'] as $work) {
            $image = ambWorkImage(array('width' => null) + $work, $index > 0, null, 'currentProjectImage');
            $html .= '<div class="card" style="border: 0px; text-align: center; margin-bottom: 60px;">'
                . '<div class="buttonContainer"><span>Image</span><span>Description</span></div>'
                . '<div class="projectImgTxtContainer" style="display: flex; flex-direction: column; overflow: hidden;">'
                . '<div class="img-container">' . $image . '</div>'
                . '<div class="description_text" style="display: none;">' . ambMultiline($work['long_description']) . '</div>'
                . '</div></div>';
            $index++;
        }
        $html .= '</div></div>';
    }
    return $html;
}

function ambRenderNotFound()
{
    return '<div class="not-found"><h2>Page not found</h2>'
        . '<p>Sorry, there\'s nothing at this address.</p>'
        . '<p><a href="/select-works" class="not-found-link">See the works</a></p></div>';
}

function ambRenderLoading()
{
    return '<div class="initial-loading"><div class="loading-spinner"></div></div>';
}
