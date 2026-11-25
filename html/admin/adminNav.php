<?php
/**
 * The bar across the top of every admin page: a link to each admin page
 * (the one on screen marked), the public site, and Logout.
 *
 * Include it first thing inside <body>, after setting $ambAdminPage to the
 * page's key below. Its look is in admin.css (amb-topbar-*). Never give these
 * links the class nav-link: the Works page's script clears .active from every
 * .nav-link on the page.
 *
 * The Shop and Newsletter links carry the same counts the dashboard shows
 * (orders to send, sign-ups since the newsletter page was last opened). Only
 * read here, never written: a failure just leaves the count off.
 */

// Only ever included by a page; opened by its own address it shows nothing
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

$ambAdminPage = $ambAdminPage ?? '';

if (!function_exists('ambAdminNavCounts')) {
    function ambAdminNavCounts()
    {
        global $conn;
        $counts = array('shop' => 0, 'newsletter' => 0);
        if (!isset($conn) || !$conn) {
            $pdoSoftFail = true;
            include_once __DIR__ . '/../database/pdo.php';
        }
        if (!isset($conn) || !$conn) {
            return $counts;
        }
        try {
            $q = $conn->query("SELECT COUNT(*) FROM shopOrders WHERE status = 'paid'");
            $counts['shop'] = $q ? (int) $q->fetchColumn() : 0;
        } catch (Throwable $e) {
            // the shop's tables aren't there yet
        }
        try {
            $q = $conn->query("SELECT COUNT(*) FROM newsletterEmailList n
                               JOIN admin_last_visit v ON v.section = 'newsletter'
                               WHERE n.subscriptionDate > v.last_visit");
            $counts['newsletter'] = $q ? (int) $q->fetchColumn() : 0;
        } catch (Throwable $e) {
        }
        return $counts;
    }
}

$ambNavCounts = (($_SESSION['ambar'] ?? null) === 'connected') ? ambAdminNavCounts() : array();

$ambNavLinks = array(
    'dashboard'  => array('mainAdmin.php', 'fa-house', 'Dashboard'),
    'works'      => array('pictureAdmin.php', 'fa-images', 'Works'),
    'projects'   => array('manageProjects.php', 'fa-diagram-project', 'Projects'),
    'about'      => array('aboutMeAdmin.php', 'fa-user-pen', 'About'),
    'shop'       => array('shopAdmin.php', 'fa-cart-shopping', 'Shop'),
    'navbar'     => array('navbarAdmin.php', 'fa-bars', 'Navbar'),
    'newsletter' => array('newsletterAdmin.php', 'fa-envelope-open-text', 'Newsletter'),
);
?>
<header class="amb-topbar">
    <a class="amb-topbar-brand" href="mainAdmin.php">Ambar Velasco <span>Admin</span></a>
    <nav class="amb-topbar-links" aria-label="Admin pages">
        <?php foreach ($ambNavLinks as $key => $link):
            $isCurrent = $key === $ambAdminPage;
            $count = $ambNavCounts[$key] ?? 0; ?>
            <a href="<?php echo $link[0]; ?>" class="amb-topbar-link<?php echo $isCurrent ? ' is-current' : ''; ?>"<?php echo $isCurrent ? ' aria-current="page"' : ''; ?>>
                <i class="fas <?php echo $link[1]; ?>" aria-hidden="true"></i><span><?php echo $link[2]; ?></span>
                <?php if ($count > 0 && !$isCurrent): ?><span class="amb-topbar-count" title="<?php echo $key === 'shop' ? 'Orders to send' : 'New subscribers'; ?>"><?php echo $count; ?></span><?php endif; ?>
            </a>
        <?php endforeach; ?>
    </nav>
    <div class="amb-topbar-end">
        <a href="/" target="_blank" rel="noopener" class="amb-topbar-link" title="Opens your website in a new tab">
            <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i><span>View site</span>
        </a>
        <form action="../signIn/logout.php" method="post">
            <button type="submit" class="amb-topbar-link amb-topbar-logout">
                <i class="fas fa-right-from-bracket" aria-hidden="true"></i><span>Logout</span>
            </button>
        </form>
    </div>
</header>
<script>
    // On phones the page links scroll sideways: start with this page's in view
    (function () {
        var current = document.querySelector('.amb-topbar-links .is-current');
        if (current && current.parentNode.scrollWidth > current.parentNode.clientWidth) {
            current.parentNode.scrollLeft = current.offsetLeft - 16;
        }
    })();
</script>
