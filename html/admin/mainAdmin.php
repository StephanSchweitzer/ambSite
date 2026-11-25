<?php
include_once __DIR__ . '/../database/session.php';
if (($_SESSION["ambar"] ?? null) != "connected") {
    header("Location: ../signIn/signIn.php?status=needCredentials");
    die;
}

include '../database/pdo.php';

// Function to get new newsletter subscriptions count
function getNewNewsletterCount($conn) {
    try {
        // Get the last visit timestamp
        $queryLastVisit = "SELECT last_visit FROM admin_last_visit WHERE section = 'newsletter'";
        $stmtLastVisit = $conn->prepare($queryLastVisit);
        $stmtLastVisit->execute();

        if ($stmtLastVisit->rowCount() === 0) {
            // If no record exists, create one and return 0
            $insertQuery = "INSERT INTO admin_last_visit (section, last_visit) VALUES ('newsletter', CURRENT_TIMESTAMP)";
            $conn->exec($insertQuery);
            return 0;
        }

        $lastVisit = $stmtLastVisit->fetch(PDO::FETCH_ASSOC)['last_visit'];

        // Count new subscriptions since last visit
        $queryNewCount = "SELECT COUNT(*) as count FROM newsletterEmailList WHERE subscriptionDate > :lastVisit";
        $stmtNewCount = $conn->prepare($queryNewCount);
        $stmtNewCount->bindParam(':lastVisit', $lastVisit, PDO::PARAM_STR);
        $stmtNewCount->execute();

        return $stmtNewCount->fetch(PDO::FETCH_ASSOC)['count'];

    } catch (PDOException $e) {
        // In case of error, return 0 to avoid breaking the UI
        return 0;
    }
}

// Get the count of new newsletter subscriptions
$newNewsletterCount = getNewNewsletterCount($conn);

// Shop orders that are paid and waiting to be sent
$ordersToSend = 0;
try {
    $shopCount = $conn->query("SELECT COUNT(*) FROM shopOrders WHERE status = 'paid'");
    $ordersToSend = $shopCount ? (int) $shopCount->fetchColumn() : 0;
} catch (Throwable $e) {
    $ordersToSend = 0; // the shop's tables aren't there yet
}
?>

<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <?php $ambPageTitle = 'Dashboard'; include __DIR__ . '/adminHead.php'; ?>
</head>
<body class="page-dashboard">
<?php $ambAdminPage = 'dashboard'; include __DIR__ . '/adminNav.php'; ?>

<div class="content-area is-narrow">
    <div class="main-content">
        <div class="page-title-row">
            <div>
                <h1 class="h3 admin-welcome">Welcome back boober</h1>
                <p class="admin-date"><?php echo date("l, F j, Y"); ?></p>
            </div>
        </div>

        <div class="admin-dashboard">
            <a href="pictureAdmin.php" class="admin-card">
                <div class="admin-card-icon"><i class="fas fa-images"></i></div>
                <div>
                    <div class="admin-card-title">Manage Works</div>
                    <div class="admin-card-description">Upload, edit, and organize your artwork and portfolio pieces.</div>
                </div>
            </a>

            <a href="manageProjects.php" class="admin-card">
                <div class="admin-card-icon"><i class="fas fa-diagram-project"></i></div>
                <div>
                    <div class="admin-card-title">Manage Projects</div>
                    <div class="admin-card-description">Create and update your project showcase and details.</div>
                </div>
            </a>

            <a href="aboutMeAdmin.php" class="admin-card">
                <div class="admin-card-icon"><i class="fas fa-user-pen"></i></div>
                <div>
                    <div class="admin-card-title">Manage About Section</div>
                    <div class="admin-card-description">Update your bio, profile picture, and personal information.</div>
                </div>
            </a>

            <a href="shopAdmin.php" class="admin-card">
                <?php if ($ordersToSend > 0): ?>
                    <span class="badge-notification" title="Orders to send"><?php echo $ordersToSend; ?></span>
                <?php endif; ?>
                <div class="admin-card-icon"><i class="fas fa-cart-shopping"></i></div>
                <div>
                    <div class="admin-card-title">Manage Shop</div>
                    <div class="admin-card-description">Orders to send, the items for sale, delivery prices.</div>
                </div>
            </a>

            <a href="navbarAdmin.php" class="admin-card">
                <div class="admin-card-icon"><i class="fas fa-bars"></i></div>
                <div>
                    <div class="admin-card-title">Manage Navbar</div>
                    <div class="admin-card-description">Customize your website's navigation menu structure.</div>
                </div>
            </a>

            <a href="newsletterAdmin.php" class="admin-card">
                <?php if ($newNewsletterCount > 0): ?>
                    <span class="badge-notification" title="New subscribers"><?php echo $newNewsletterCount; ?></span>
                <?php endif; ?>
                <div class="admin-card-icon"><i class="fas fa-envelope-open-text"></i></div>
                <div>
                    <div class="admin-card-title">Manage Newsletter</div>
                    <div class="admin-card-description">View subscribers and manage your email campaigns.</div>
                </div>
            </a>
        </div>
    </div>
</div>
</body>
</html>