<?php
include_once __DIR__ . '/../database/session.php';
if (($_SESSION["ambar"] ?? null) != "connected") {
    header("Location: ../signIn/signIn.php?status=needCredentials");
    die;
}
// How many people visit the site, and what they look at: the site's own
// counting (actions/visitFunctions.php), in place of Google Analytics.
// Drawn here on the server; the page has no script of its own.

include '../database/pdo.php';
include_once __DIR__ . '/../actions/visitFunctions.php';

function h($text)
{
    return htmlspecialchars((string) $text, ENT_QUOTES, 'UTF-8');
}

$periods = array(7 => 'Last 7 days', 30 => 'Last 30 days', 90 => 'Last 3 months', 365 => 'Last year');
$days = (int) ($_GET['days'] ?? 30);
if (!isset($periods[$days])) {
    $days = 30;
}

$ready = ambVisitsReady($conn);
$stats = null;
if ($ready) {
    try {
        $stats = ambVisitStats($conn, $days);
    } catch (Throwable $e) {
        error_log('visitorsAdmin: ' . $e->getMessage());
    }
}

$pageNames = array(
    '/' => 'Home',
    '/select-works' => 'Works',
    '/about' => 'About',
    '/shop' => 'Shop',
    '/shop/basket' => 'Basket',
    '/shop/thank-you' => 'Thank-you page (after paying)',
    '/current-project' => 'Current project',
);
$deviceNames = array('phone' => 'Phones', 'tablet' => 'Tablets', 'computer' => 'Computers');

// A list of names and numbers, or a quiet line when there's nothing yet
function visitorsTable($rows, $nameHeading, $nameOf, $withViews = true)
{
    if (!$rows) {
        return '<p class="visitors-none">Nothing yet.</p>';
    }
    $html = '<table class="table table-sm visitors-table"><thead><tr><th scope="col">' . h($nameHeading) . '</th>'
        . '<th scope="col" class="num">Visitors</th>' . ($withViews ? '<th scope="col" class="num">Times seen</th>' : '') . '</tr></thead><tbody>';
    foreach ($rows as $row) {
        $html .= '<tr><td>' . $nameOf($row) . '</td><td class="num">' . number_format((int) $row['visitors']) . '</td>'
            . ($withViews ? '<td class="num">' . number_format((int) $row['views']) . '</td>' : '') . '</tr>';
    }
    return $html . '</tbody></table>';
}
?>
<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <?php $ambPageTitle = 'Visitors'; include __DIR__ . '/adminHead.php'; ?>
</head>
<body class="page-visitors">
<?php $ambAdminPage = 'visitors'; include __DIR__ . '/adminNav.php'; ?>

<div class="admin-layout">
    <div class="sidebar">
        <div class="admin-title">Visitors</div>

<?php if ($stats): ?>
        <div class="stats-card">
            <i class="fas fa-user-group" aria-hidden="true"></i>
            <div>
                <p class="count"><?php echo number_format($stats['visitors']); ?></p>
                <small>visitors</small>
            </div>
        </div>
        <div class="stats-card">
            <i class="fas fa-eye" aria-hidden="true"></i>
            <div>
                <p class="count"><?php echo number_format($stats['views']); ?></p>
                <small>pages and paintings seen</small>
            </div>
        </div>
<?php endif; ?>

        <nav class="view-options" aria-label="How far back">
            <div class="section-title">Show</div>
<?php foreach ($periods as $n => $label): ?>
            <a href="?days=<?php echo $n; ?>" class="nav-link<?php echo $n === $days ? ' active' : ''; ?>"<?php echo $n === $days ? ' aria-current="page"' : ''; ?>>
                <i class="fas fa-calendar-days" aria-hidden="true"></i><?php echo h($label); ?>
            </a>
<?php endforeach; ?>
        </nav>

        <div class="section-title">How it's counted</div>
        <p class="sidebar-note">
            The site counts visits itself. Visitors get no cookies and are never
            asked about them. Nobody's address or identity is kept, so one person
            coming back on two days counts as two visitors.
        </p>
    </div>

    <div class="content-area">
        <div class="main-content">
            <div class="page-title-row">
                <div>
                    <h1 class="h3">Visitors</h1>
                    <p class="page-subtitle"><?php echo h($periods[$days]); ?><?php echo $stats ? ', since ' . h(date('j F Y', strtotime($stats['since']))) : ''; ?></p>
                </div>
            </div>

<?php if (!$ready): ?>
            <div class="empty-state">
                <p>Counting visits starts once the site's database has its new table.<br>
                (For Stephan: <code>database/visits.sql</code>, run once on the server.)</p>
            </div>
<?php elseif (!$stats): ?>
            <div class="empty-state"><p>Sorry, the numbers couldn't be loaded. Please try again later.</p></div>
<?php else: ?>
            <div class="visitors-grid">
                <section class="panel-box">
                    <h2 class="panel-box-title"><i class="fas fa-file-lines" aria-hidden="true"></i>Pages</h2>
                    <?php echo visitorsTable($stats['pages'], 'Page', function ($row) use ($pageNames) {
                        return h($pageNames[$row['path']] ?? $row['path']);
                    }); ?>
                </section>

                <section class="panel-box">
                    <h2 class="panel-box-title"><i class="fas fa-image" aria-hidden="true"></i>Paintings opened</h2>
                    <?php echo visitorsTable($stats['works'], 'Painting', function ($row) {
                        $name = $row['name'] !== null && $row['name'] !== '' ? $row['name'] : 'A work no longer on the site';
                        return '<a href="' . h($row['path']) . '" target="_blank" rel="noopener">' . h($name) . '</a>';
                    }); ?>
                </section>

<?php if ($stats['items']): ?>
                <section class="panel-box">
                    <h2 class="panel-box-title"><i class="fas fa-tags" aria-hidden="true"></i>Shop items opened</h2>
                    <?php echo visitorsTable($stats['items'], 'Item', function ($row) {
                        $name = $row['name'] !== null && $row['name'] !== '' ? $row['name'] : 'An item no longer in the shop';
                        return '<a href="' . h($row['path']) . '" target="_blank" rel="noopener">' . h($name) . '</a>';
                    }); ?>
                </section>
<?php endif; ?>

                <section class="panel-box">
                    <h2 class="panel-box-title"><i class="fas fa-arrow-right-to-bracket" aria-hidden="true"></i>Where visitors came from</h2>
                    <?php echo visitorsTable($stats['from'], 'Website', function ($row) {
                        return h($row['referrer']);
                    }, false); ?>
                    <p class="visitors-note">Visitors who typed the address or used a bookmark aren't listed.</p>
                </section>

                <section class="panel-box">
                    <h2 class="panel-box-title"><i class="fas fa-mobile-screen" aria-hidden="true"></i>Phones and computers</h2>
                    <?php echo visitorsTable($stats['devices'], 'Seen on', function ($row) use ($deviceNames) {
                        return h($deviceNames[$row['device']] ?? $row['device']);
                    }, false); ?>
                </section>

                <section class="panel-box">
                    <h2 class="panel-box-title"><i class="fas fa-calendar-day" aria-hidden="true"></i>Each day<?php echo $days > 31 ? ', the last month' : ''; ?></h2>
                    <?php echo visitorsTable(array_slice(array_reverse($stats['days']), 0, 31), 'Day', function ($row) {
                        return h(date('D j M', strtotime($row['day'])));
                    }); ?>
                </section>
            </div>
<?php endif; ?>
        </div>
    </div>
</div>
</body>
</html>
