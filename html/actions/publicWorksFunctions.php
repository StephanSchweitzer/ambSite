<?php
// Shared helpers for the public side of the site: the Works page data, the
// shareable painting links (/work/<id>/<name>), the link-preview tags in
// index.php and the sitemap. Only visible works are ever returned here.

include_once __DIR__ . '/imageManipulationFunctions.php';

if (!defined('AMB_SITE_URL')) {
    define('AMB_SITE_URL', 'https://ambarvelasco.com');
}

// "Work in Progress" -> "work-in-progress". Only decorates the link; the
// number in /work/<id>/... is what actually finds the painting, so renaming
// a work never breaks links that were already shared (index.php sends an old
// name on to the current one).
function ambSlug($text)
{
    $text = trim((string) $text);
    if (function_exists('transliterator_transliterate')) {
        // "Água" -> "Agua" (iconv below can turn accents into stray marks)
        $latin = transliterator_transliterate('Any-Latin; Latin-ASCII', $text);
        if ($latin !== false) {
            $text = $latin;
        }
    }
    if (function_exists('iconv')) {
        $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text);
        if ($ascii !== false) {
            $text = $ascii;
        }
    }
    $text = strtolower($text);
    $text = trim(preg_replace('/[^a-z0-9]+/', '-', $text), '-');
    if (strlen($text) > 60) {
        $text = rtrim(substr($text, 0, 60), '-');
    }
    return $text === '' ? 'work' : $text;
}

function ambWorkPath($id, $name)
{
    return '/work/' . (int) $id . '/' . ambSlug($name);
}

function ambWebImageUrl($location)
{
    return '/baseImages/web/' . rawurlencode($location);
}

// Columns every public work query selects (always aliased w.)
function ambWorkColumns()
{
    return 'w.workId, w.fileLocation, w.name, w.desc2, w.desc3, w.medium, '
         . 'w.year, w.orderOfDisplay, w.long_description';
}

// One database row -> what the public pages need. width/height are the size
// of the web copy, so the page can reserve each image's space before it loads
// (that's what keeps "scroll to this painting" landing in the right place).
function ambFormatWork($row)
{
    $location = (string) $row['fileLocation'];
    $htmlDir = dirname(__DIR__);

    $width = null;
    $height = null;
    $size = @getimagesize($htmlDir . '/baseImages/' . $location);
    if (!$size) {
        $size = @getimagesize($htmlDir . '/thumbnails/' . $location);
    }
    if ($size) {
        list($width, $height) = webImageSize($size[0], $size[1]);
    }

    $name = trim((string) $row['name']);

    return array(
        'id' => (int) $row['workId'],
        'location' => $location,
        'name' => $name,
        'path' => ambWorkPath($row['workId'], $name),
        'firstDescription' => $row['desc2'],
        'secondDescription' => $row['desc3'],
        'long_description' => $row['long_description'],
        'medium' => $row['medium'],
        'creationYear' => $row['year'],
        'width' => $width,
        'height' => $height
    );
}

// Projects in display order, each with its visible works in display order.
// $which: 'active' (the Works page) or 'currentProject'.
function ambGetProjectsWithWorks($conn, $which = 'active')
{
    $where = $which === 'currentProject' ? 'isCurrentProject = 1' : 'active = 1';
    $projects = $conn->query("SELECT id, title, description FROM projects WHERE $where ORDER BY orderOfDisplay DESC")
                     ->fetchAll(PDO::FETCH_ASSOC);
    if (!$projects) {
        return array();
    }

    $byId = array();
    foreach ($projects as $project) {
        $byId[$project['id']] = array(
            'id' => (int) $project['id'],
            'title' => trim((string) $project['title']),
            'description' => $project['description'],
            'works' => array()
        );
    }

    $placeholders = implode(',', array_fill(0, count($byId), '?'));
    $query = 'SELECT wip.projectId, ' . ambWorkColumns() . '
              FROM worksInProjects wip
              JOIN allWorks w ON w.workId = wip.workId
              WHERE wip.projectId IN (' . $placeholders . ') AND w.visible = 1
              ORDER BY w.orderOfDisplay DESC, wip.id ASC';
    $stmt = $conn->prepare($query);
    $stmt->execute(array_keys($byId));

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $byId[$row['projectId']]['works'][] = ambFormatWork($row);
    }

    return array_values($byId);
}

function ambGetCarouselWorks($conn)
{
    $rows = $conn->query('SELECT ' . ambWorkColumns() . '
                          FROM allWorks w
                          WHERE w.carousel = 1 AND w.visible = 1
                          ORDER BY w.orderOfDisplay DESC')
                 ->fetchAll(PDO::FETCH_ASSOC);
    return array_map('ambFormatWork', $rows);
}

// A single work for a shared link, or null if it's hidden or doesn't exist
function ambGetPublicWork($conn, $id)
{
    $stmt = $conn->prepare('SELECT ' . ambWorkColumns() . ' FROM allWorks w WHERE w.workId = ? AND w.visible = 1');
    $stmt->execute(array((int) $id));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? ambFormatWork($row) : null;
}
