<?php
include_once __DIR__ . '/../database/session.php';
if (($_SESSION["ambar"] ?? null) != "connected") {
    header("Location: ../signIn/signIn.php?status=needCredentials");
    die;
}
?>
<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <?php $ambPageTitle = 'Navbar Administration'; include __DIR__ . '/adminHead.php'; ?>
</head>
<body class="page-navbar">
<?php $ambAdminPage = 'navbar'; include __DIR__ . '/adminNav.php'; ?>

<div class="admin-layout">
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="admin-title">Navbar Admin</div>

        <div class="sidebar-actions">
            <button id="saveLinksButton" class="btn btn-light w-100 mb-2" onclick="saveLinks()">
                <i class="fas fa-save"></i> Save Changes
                <span class="spinner-border spinner-border-sm loading-spinner" id="saveSpinner" role="status" aria-hidden="true"></span>
            </button>
            <button id="createLinkButton" class="btn btn-outline-light w-100 mb-4" onclick="createNewNavLinkRow()">
                <i class="fas fa-plus"></i> Add New Link
            </button>
        </div>

        <div class="section-title">How it works</div>
        <p class="sidebar-note">
            These are the links in your website's menu, in the order they appear.
            Drag them to reorder, then press Save Changes.
        </p>
        <p class="sidebar-note mb-0">
            Links marked with <i class="fas fa-lock text-warning"></i> have limited editing options.
        </p>
    </div>

    <!-- Main Content -->
    <div class="content-area">
        <div class="main-content">
            <div class="page-title-row">
                <h1 class="h3">Navbar Administration</h1>
                <div>
                    <input type="text" id="searchLinks" class="form-control form-control-sm" placeholder="Search links..." aria-label="Search links">
                </div>
            </div>

            <ul id="navbarLinks" class="list-unstyled">
                <!-- Nav items will be inserted here -->
            </ul>
        </div>
    </div>
</div>

<!-- Delete Confirmation Modal -->
<div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-labelledby="deleteConfirmModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="deleteConfirmModalLabel">Confirm Deletion</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                Are you sure you want to delete "<span id="deleteItemName"></span>"?
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmDeleteBtn">Delete</button>
            </div>
        </div>
    </div>
</div>

<!-- Toast Container -->
<div class="toast-container"></div>
<script src="../js/navbarAdmin.js?v=<?php echo filemtime(__DIR__ . '/../js/navbarAdmin.js'); ?>"></script>

</body>
</html>
