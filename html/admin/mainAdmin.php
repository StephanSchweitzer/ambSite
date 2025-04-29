<?php
session_start();
if ($_SESSION["ambar"] != "connected") {
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
?>

<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css">
    <link rel="stylesheet" href="admin.css">
    <meta charset="utf-8">
    <link rel="icon" type="image/x-icon" href="../imgMid/transpLeafStack.ico">
    <title>Main Admin Page</title>
</head>
<body>

<div class="container admin-container my-5 col-sm-12 col-md-10 col-lg-8" style="margin-top: 10vh !important;">
    <div class="admin-header-wrapper">
        <h1 class="admin-header text-center">Administration Dashboard</h1>
    </div>

    <div class="admin-welcome">Welcome back boober</div>
    <div class="admin-date"><?php echo date("l, F j, Y"); ?></div>

    <div class="row admin-dashboard">
        <div class="col-md-6 col-lg-4 mb-4">
            <a href="pictureAdmin.php" class="text-decoration-none">
                <div class="admin-card">
                    <div class="admin-card-icon">
                        <i class="fas fa-images"></i>
                    </div>
                    <div class="admin-card-title">Manage Works</div>
                    <div class="admin-card-description">Upload, edit, and organize your artwork and portfolio pieces.</div>
                </div>
            </a>
        </div>

        <div class="col-md-6 col-lg-4 mb-4">
            <a href="manageProjects.php" class="text-decoration-none">
                <div class="admin-card">
                    <div class="admin-card-icon">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <div class="admin-card-title">Manage Projects</div>
                    <div class="admin-card-description">Create and update your project showcase and details.</div>
                </div>
            </a>
        </div>

        <div class="col-md-6 col-lg-4 mb-4">
            <a href="aboutMeAdmin.php" class="text-decoration-none">
                <div class="admin-card">
                    <div class="admin-card-icon">
                        <i class="fas fa-user-edit"></i>
                    </div>
                    <div class="admin-card-title">Manage About Section</div>
                    <div class="admin-card-description">Update your bio, profile picture, and personal information.</div>
                </div>
            </a>
        </div>

        <div class="col-md-6 col-lg-4 mb-4">
            <a href="shopAdmin.php" class="text-decoration-none">
                <div class="admin-card">
                    <div class="admin-card-icon">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="admin-card-title">Manage Shop</div>
                    <div class="admin-card-description">Add, edit, and remove products from your online store.</div>
                </div>
            </a>
        </div>

        <div class="col-md-6 col-lg-4 mb-4">
            <a href="navbarAdmin.php" class="text-decoration-none">
                <div class="admin-card">
                    <div class="admin-card-icon">
                        <i class="fas fa-bars"></i>
                    </div>
                    <div class="admin-card-title">Manage Navbar</div>
                    <div class="admin-card-description">Customize your website's navigation menu structure.</div>
                </div>
            </a>
        </div>

        <div class="col-md-6 col-lg-4 mb-4">
            <a href="newsletterAdmin.php" class="text-decoration-none">
                <div class="admin-card position-relative">
                    <?php if ($newNewsletterCount > 0): ?>
                        <span class="badge-notification"><?php echo $newNewsletterCount; ?></span>
                    <?php endif; ?>
                    <div class="admin-card-icon">
                        <i class="fas fa-envelope-open-text"></i>
                    </div>
                    <div class="admin-card-title">Manage Newsletter</div>
                    <div class="admin-card-description">View subscribers and manage your email campaigns.</div>
                </div>
            </a>
        </div>
    </div>
</div>

<div class="logout-container">
    <form action="../signIn/logout.php" method="post">
        <button type="submit" class="btn btn-logout">
            <i class="fas fa-sign-out-alt me-2"></i>Logout
        </button>
    </form>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>