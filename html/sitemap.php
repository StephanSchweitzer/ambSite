<?php
// Served as /sitemap.xml (see .htaccess). Lists the main pages plus a page
// for every work on the Works page, with its image, so search engines can
// find and show individual paintings.

global $conn;
include 'database/pdo.php';
include_once 'actions/publicWorksFunctions.php';

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

$works = array();
$seen = array();
foreach (ambGetProjectsWithWorks($conn, 'active') as $project) {
    foreach ($project['works'] as $work) {
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
