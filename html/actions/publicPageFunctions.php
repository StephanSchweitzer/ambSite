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

// Plain text for a meta description: no tags, single spaces, cut at a word.
// Counts characters with preg (not mb_*), since the server has no mbstring.
function ambExcerpt($html, $length = 160)
{
    $text = html_entity_decode(strip_tags((string) $html), ENT_QUOTES, 'UTF-8');
    $text = trim((string) preg_replace('/\s+/u', ' ', $text));
    $chars = preg_split('//u', $text, -1, PREG_SPLIT_NO_EMPTY);
    if (!$chars || count($chars) <= $length) {
        return $text;
    }
    $cut = array_slice($chars, 0, $length);
    for ($i = $length - 1; $i > $length * 0.6; $i--) {
        if ($cut[$i] === ' ') {
            $cut = array_slice($cut, 0, $i);
            break;
        }
    }
    return rtrim(implode('', $cut), ' ,.;:-') . '…';
}

// Same as projectSectionId() in photoFunctions.js
function ambSectionId($title)
{
    $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower(trim((string) $title))), '-');
    return 'section-' . ($slug === '' ? 'project' : $slug);
}

// The anchor one year group of a project sits at, so a menu link can jump
// straight to it: section-painting-2023-2024.
// Same as groupSectionId() in photoFunctions.js
function ambGroupSectionId($projectTitle, $label)
{
    $slug = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower((string) $label)), '-');
    return ambSectionId($projectTitle) . ($slug === '' ? '' : '-' . $slug);
}

// Same as workSrcset() in photoFunctions.js
function ambWorkSrcset($work)
{
    $sources = array('/thumbnails/' . rawurlencode($work['location']) . ' 400w');
    foreach (AMB_WEB_VARIANT_WIDTHS as $width) {
        if ($width < $work['width']) {
            $sources[] = '/baseImages/web/' . $width . '/' . rawurlencode($work['location']) . ' ' . $width . 'w';
        }
    }
    $sources[] = ambWebImageUrl($work['location']) . ' ' . $work['width'] . 'w';
    return implode(', ', $sources);
}

// Same as workImage() in photoFunctions.js
function ambWorkImage($work, $lazy, $sizes = null, $className = null, $priority = false)
{
    $attributes = array(
        'loading' => $lazy ? 'lazy' : 'eager',
        'decoding' => 'sync',
    );
    if ($priority) {
        $attributes['fetchpriority'] = 'high';
    }
    if ($work['width'] && $work['height']) {
        $attributes['width'] = $work['width'];
        $attributes['height'] = $work['height'];
        if ($sizes && $work['width'] > 400) {
            $attributes['sizes'] = $sizes;
            $attributes['srcset'] = ambWorkSrcset($work);
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

// The menu's links, in order. The "Shop" link (the one whose instructions
// include loadShop) isn't changeable on the admin's menu page; once the shop
// exists, whether it's in the menu is the shop's own "Show Shop in the menu"
// setting instead of the row's visible flag. Used by navLinksAPI.php too.
function ambGetNavLinks($conn)
{
    include_once __DIR__ . '/shopFunctions.php';
    $shopInMenu = null; // null: no shop yet, so the row's own flag decides
    try {
        if (shopReady($conn)) {
            $shopInMenu = shopSettings($conn)['inMenu'] === '1';
        }
    } catch (Throwable $e) {
        error_log('ambGetNavLinks shop: ' . $e->getMessage());
    }
    $rows = $conn->query('SELECT ID, displayedText, linkRedirection, displayedOrder, isChangeable, onclick, isNewTab, attachedFollowingDiv, visible
                          FROM navLinks ORDER BY displayedOrder ASC, ID ASC')
                 ->fetchAll(PDO::FETCH_ASSOC);
    $links = array();
    foreach ($rows as $row) {
        $isShop = strpos((string) $row['onclick'], 'loadShop') !== false;
        $shown = $isShop && $shopInMenu !== null ? $shopInMenu : (int) $row['visible'] === 1;
        if ($shown) {
            unset($row['visible']);
            $links[] = $row;
        }
    }
    return $links;
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
        // The Shop link catches the eye now and then (ambar.css, shopGlow)
        $isShop = strpos((string) $link['onclick'], 'loadShop') !== false;
        $html .= '<div class="nav-link-container"><a'
            . ($href !== null ? ' href="' . ambHtml($href) . '"' : '')
            . ' class="mainLinkGenres' . ($isShop ? ' shop-link' : '') . '"'
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
                // On a computer, a project shown in year groups keeps its
                // years folded away underneath it; clicking the project's
                // name unfolds them. On a phone the years aren't listed and
                // the name goes to the project (navLinksFunctions.js,
                // projectYearsToggle). The undated group has no heading to
                // jump to, so it is not listed.
                $years = '';
                foreach (ambWorkGroups($project) as $group) {
                    if ($group['label'] === '') {
                        continue;
                    }
                    $years .= '<a class="project-year-link" href="/select-works#'
                        . ambHtml(ambGroupSectionId($project['title'], $group['label'])) . '">'
                        . ambHtml($group['label']) . '</a>';
                }
                // One group is no grouping: ambWorkGroups() gives a lone
                // unlabelled group, which leaves $years empty
                $yearsId = 'years-' . ambSectionId($project['title']);
                $inner .= '<a href="/select-works#' . ambHtml(ambSectionId($project['title'])) . '"'
                    . ($years === '' ? '' : ' class="project-link" aria-expanded="false" aria-controls="' . ambHtml($yearsId) . '"')
                    . '>' . ambHtml($project['title']) . '</a>';
                if ($years !== '') {
                    $inner .= '<div class="project-years" id="' . ambHtml($yearsId) . '">' . $years . '</div>';
                }
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

// ---------------------------------------------------------------------------
// Year groups inside a project
//
// Some projects are shown in groups of years rather than as one long run of
// works: the projects named in ambYearGroupedProjects() - today all four of
// them - are grouped as 2025-2026, 2023-2024 and 2020-2022, newest group
// first, with a small heading over each group. A project whose works all
// fall in one group is drawn as one run, with no heading, so the list can
// name a project before its works span the years.
//
// Nothing is stored for any of this — the groups are worked out from the
// year each work already carries, so a work added in the admin portal lands
// in the right group by itself, and a year outside the bands gets a group of
// its own rather than being dropped.
//
// Mirrored by YEAR_BANDS / workGroups() in js/photoFunctions.js — change both.
// The Projects admin's "Order of Works" tab shows the same groups:
// manageProjects.php hands it the bands and project names from here, and
// arrangeGroups() in js/projectAdminFunctions.js sorts works into them the
// same way — keep that in step too.
// ---------------------------------------------------------------------------

// Newest first, as the Works page shows them
function ambYearBands()
{
    return array(array(2025, 2026), array(2023, 2024), array(2020, 2022));
}

// The projects shown in year groups, by title (compared without case or spaces)
function ambYearGroupedProjects()
{
    return array('painting', 'plantart', 'drawing', 'tapeworks');
}

function ambGroupsByYear($title)
{
    // /u so an unusual space in the title (a non-breaking one pasted in from
    // a word processor, say) is stripped here exactly as JavaScript strips it
    // in groupsByYear() - the two must agree on whether a project is grouped,
    // or the page and the viewer would disagree about which work is which
    $clean = preg_replace('/\s+/u', '', (string) $title);
    if ($clean === null) { // not valid UTF-8; fall back to plain spaces
        $clean = preg_replace('/\s+/', '', (string) $title);
    }
    return in_array(strtolower((string) $clean), ambYearGroupedProjects(), true);
}

function ambYearBandLabel($from, $to)
{
    return $from === $to ? (string) $from : $from . "\xe2\x80\x93" . $to;
}

// The four-digit year a work carries, or null if it hasn't got a sensible one
function ambWorkYear($work)
{
    if (!preg_match('/\d{4}/', (string) $work['creationYear'], $found)) {
        return null;
    }
    $year = (int) $found[0];
    return ($year < 1900 || $year > 2100) ? null : $year;
}

// A project's works as the page draws them: one group per year band that has
// works in it, newest first, then any undated works in a last group with no
// heading. A project that isn't grouped — or one whose works all fall in the
// same group — comes back as a single group with no heading, which draws
// exactly as it always has.
function ambWorkGroups($project)
{
    $single = array(array('label' => '', 'works' => $project['works']));
    if (!ambGroupsByYear($project['title'])) {
        return $single;
    }

    $groups = array();
    foreach ($project['works'] as $work) {
        $year = ambWorkYear($work);
        $label = '';
        $from = -1; // undated works sort to the end
        if ($year !== null) {
            $label = (string) $year;
            $from = $year;
            foreach (ambYearBands() as $band) {
                if ($year >= $band[0] && $year <= $band[1]) {
                    $label = ambYearBandLabel($band[0], $band[1]);
                    $from = $band[0];
                    break;
                }
            }
        }
        if (!isset($groups[$label])) {
            $groups[$label] = array('label' => $label, 'from' => $from, 'works' => array());
        }
        $groups[$label]['works'][] = $work;
    }

    if (count($groups) < 2) {
        return $single;
    }

    $groups = array_values($groups);
    usort($groups, function ($a, $b) {
        return $b['from'] - $a['from'];
    });
    return $groups;
}

function ambRenderWorks($projects)
{
    $html = '';
    $index = 0;
    $last = count($projects) - 1;
    foreach ($projects as $projectIndex => $project) {
        $html .= '<section class="project" id="' . ambHtml(ambSectionId($project['title'])) . '">'
            . '<div class="project-header"><h2 class="project-title">' . ambHtml($project['title']) . '</h2>'
            . ($project['description'] ? '<p class="project-description">' . ambMultiline($project['description']) . '</p>' : '')
            . '</div>';
        $groups = ambWorkGroups($project);
        // Every group of a grouped project gets the wrapper, headed or not, so
        // the undated group is spaced like the others instead of looking like
        // the tail of the group above it
        $grouped = count($groups) > 1;
        foreach ($groups as $group) {
            if ($grouped) {
                $html .= '<div class="project-group"'
                    . ($group['label'] !== '' ? ' id="' . ambHtml(ambGroupSectionId($project['title'], $group['label'])) . '"' : '')
                    . '>'
                    . ($group['label'] !== '' ? '<h3 class="project-year">' . ambHtml($group['label']) . '</h3>' : '');
            }
            $html .= '<div class="projectWorks">';
            foreach ($group['works'] as $work) {
                $html .= '<a class="card work-card" href="' . ambHtml($work['path']) . '" data-index="' . $index . '" aria-label="' . ambHtml($work['name']) . '">'
                    . '<div class="img-container">' . ambWorkImage($work, $index > 1, AMB_GALLERY_SIZES, null, $index === 0)
                    . '<div class="img-overlay" aria-hidden="true"><h3 class="overlay-title">' . ambHtml($work['name']) . '</h3></div>'
                    . '</div></a>';
                $index++;
            }
            $html .= '</div>' . ($grouped ? '</div>' : '');
        }
        if ($projectIndex < $last) {
            $html .= '<div class="work-separator" aria-hidden="true"> ✧ ˚. ࣪ ˖ ·ﾟ ·ﾟ·:。·ﾟﾟ·✮ ⋆ ˚。☆ ⋆。°✩·ﾟ ·ﾟ·:。·ﾟﾟ·°˖✧</div>';
        }
        $html .= '</section>';
    }
    return $html;
}

// The cloud that parts to reveal the first painting of the slideshow. A veil
// and three banks of soft white puffs; all the movement is in ambar.css
// ("Clouds over the first painting"). Mirrors HOME_CLOUDS_HTML in
// photoFunctions.js - change both.
define('AMB_HOME_CLOUDS', '<div class="home-clouds" aria-hidden="true">'
    . '<div class="home-clouds-veil"></div>'
    . '<div class="home-clouds-bank is-left"></div>'
    . '<div class="home-clouds-bank is-right"></div>'
    . '<div class="home-clouds-bank is-high"></div>'
    . '</div>');

// The slideshow's paintings are only as tall as 72vh lets them be
// (.carousel-pic), so a portrait one is drawn far narrower than the 62vw the
// gallery's sizes assume. Saying so lets the browser pick a lighter copy.
// Same as carouselSizes() in photoFunctions.js.
function ambCarouselSizes($work)
{
    if (!$work['width'] || !$work['height']) {
        return AMB_GALLERY_SIZES;
    }
    $ratio = round($work['width'] / $work['height'], 3);
    return '(max-width: 992px) 92vw, min(62vw, 72vh * ' . $ratio . ')';
}

function ambRenderCarousel($works)
{
    $html = '<div id="homePageCarousel" class="carousel slide homePageCarousel"><div class="carousel-inner">';
    foreach ($works as $index => $work) {
        $html .= '<div class="carousel-item' . ($index === 0 ? ' active' : '') . '">'
            . '<a class="carousel-link" href="' . ambHtml($work['path']) . '" data-index="' . $index . '" aria-label="' . ambHtml($work['name']) . '">'
            . ambWorkImage($work, $index > 0, ambCarouselSizes($work), 'd-block carousel-pic', $index === 0)
            . '</a></div>';
    }
    $html .= '</div>';
    if (count($works) > 0) {
        $html .= AMB_HOME_CLOUDS; // the weather over the first painting (ambar.css)
    }
    if (count($works) > 1) {
        $html .= '<a class="carousel-control-prev" href="#homePageCarousel" role="button" data-slide="prev">'
            . '<span class="carousel-control-prev-icon" aria-hidden="true"></span><span class="sr-only">Previous</span></a>'
            . '<a class="carousel-control-next" href="#homePageCarousel" role="button" data-slide="next">'
            . '<span class="carousel-control-next-icon" aria-hidden="true"></span><span class="sr-only">Next</span></a>';
    }
    return $html . '</div>';
}

// Under the slideshow, shown on phones only (ambar.css, "The way in"): the
// menu's pages written out as words, so nobody has to find the menu button
// to get past the first page.
// Mirrors homeLinks() in photoFunctions.js - change both.
function ambRenderHomeLinks($links)
{
    $html = '';
    foreach ($links as $link) {
        $page = ambNavLinkPage($link);
        if ($page === null) {
            continue; // Instagram, Newsletter: not pages of the site
        }
        $html .= '<a href="' . ambHtml($page) . '" class="mainLinkGenres home-link">'
            . ambHtml($link['displayedText']) . '</a>';
    }
    return $html === '' ? '' : '<nav class="home-links" aria-label="Pages">' . $html . '</nav>';
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
        . '<img id="ambarPersoPic" alt="Portrait of Ambar Velasco" decoding="sync" src="' . ambHtml(ambAboutPicture($about)) . '">'
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
