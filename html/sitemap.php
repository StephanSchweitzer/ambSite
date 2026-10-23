<?php
// Served as /sitemap.xml (see .htaccess). Lists the main pages plus a page
// for every work on the Works page, with its image, so search engines can
// find and show individual paintings.

global $conn;
include 'database/pdo.php';
include_once 'actions/publicPageFunctions.php';

header('Content-Type: application/xml; charset=UTF-8');

function xmlText($text)
{
    return htmlspecialchars((string) $text, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

$pages = array(
    array('loc' => '/', 'priority' => '1.0', 'changefreq' => 'weekly'),
    array('loc' => '/select-works', 'priority' => '0.9', 'changefreq' => 'weekly'),
    array('loc' => '/about', 'priority' => '0.6', 'changefreq' => 'yearly'),
);

// The Current Project page, when the menu links to it and it has something
// to show. (The shop is left out on purpose.)
foreach (ambGetNavLinks($conn) as $link) {
    if (ambNavLinkPage($link) === '/current-project') {
        foreach (ambGetProjectsWithWorks($conn, 'currentProject') as $project) {
            if ($project['works']) {
                $pages[] = array('loc' => '/current-project', 'priority' => '0.7', 'changefreq' => 'monthly');
                break;
            }
        }
        break;
    }
}

// Every work on the Works page, plus any that are only in the home slideshow
$works = array();
$seen = array();
$groups = array_map(function ($project) { return $project['works']; }, ambGetProjectsWithWorks($conn, 'active'));
$groups[] = ambGetCarouselWorks($conn);
foreach ($groups as $group) {
    foreach ($group as $work) {
        if (!isset($seen[$work['id']])) {
            $seen[$work['id']] = true;
            $works[] = $work;
        }
    }
}

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
<?php foreach ($pages as $page): ?>
  <url>
    <loc><?= xmlText(AMB_SITE_URL . $page['loc']) ?></loc>
    <changefreq><?= $page['changefreq'] ?></changefreq>
    <priority><?= $page['priority'] ?></priority>
  </url>
<?php endforeach; ?>
<?php foreach ($works as $work): ?>
  <url>
    <loc><?= xmlText(AMB_SITE_URL . $work['path']) ?></loc>
    <changefreq>yearly</changefreq>
    <priority>0.7</priority>
    <image:image>
      <image:loc><?= xmlText(AMB_SITE_URL . ambWebImageUrl($work['location'])) ?></image:loc>
    </image:image>
  </url>
<?php endforeach; ?>
</urlset>
