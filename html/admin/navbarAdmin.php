<?php
include_once __DIR__ . '/../database/session.php';
if (($_SESSION["ambar"] ?? null) != "connected") {
    header("Location: ../signIn/signIn.php?status=needCredentials");
    die;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
    <link rel="stylesheet" href="admin.css">
    <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
    <title>Navbar Admin</title>
    <style>
        :root {
            --primary-color: #3498db;
            --secondary-color: #2ecc71;
            --dark-color: #2c3e50;
            --light-color: #ecf0f1;
            --danger-color: #e74c3c;
            --warning-color: #f39c12;
        }

        body {
            background-color: var(--dark-color);
            color: var(--light-color);
        }

        .admin-header {
            background-color: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 30px;
        }

        .content-section {
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 20px;
        }

        .nav-item-card {
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            margin-bottom: 10px;
            padding: 15px;
            transition: all 0.3s ease;
            border: 2px solid transparent;
            position: relative;
            cursor: grab; /* Change to grab hand cursor */
        }

        .nav-item-card:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }

        .nav-item-card.dragging {
            background-color: rgba(52, 152, 219, 0.3) !important;
            box-shadow: 0 0 15px rgba(52, 152, 219, 0.5) !important;
            border: 2px dashed var(--primary-color) !important;
            z-index: 1000 !important;
            cursor: grabbing !important; /* Change to grabbing hand when actively dragging */
        }

        /* The styles below are from the old implementation that worked */
        .nav-item-card[draggable=true] {
            user-select: none;
            -webkit-user-drag: element;
        }

        /* Better visual feedback for dragging state */
        .nav-item-card.dragNavBar {
            transition: opacity 0.3s, transform 0.3s, box-shadow 0.3s;
        }

        .drag-handle {
            color: var(--light-color);
            opacity: 0.7;
            transition: opacity 0.2s;
            /* Making the drag handle just decorative, not functional for dragging */
            pointer-events: none;
        }

        .nav-item-card:hover .drag-handle {
            opacity: 1;
        }

        /* Make sure inputs and buttons show the right cursor */
        .nav-item-card input,
        .nav-item-card button,
        .nav-item-card .input-group-text {
            cursor: auto; /* Reset cursor for interactive elements */
        }

        .nav-item-card button {
            cursor: pointer; /* Make buttons show pointer */
        }

        .text-warning {
            color: var(--warning-color) !important;
        }

        .input-group {
            margin-bottom: 0;
        }

        /* Ensure consistent vertical alignment */
        .row.align-items-center {
            min-height: 38px; /* Match height of input groups */
        }

        /* Fixed width column for handle to ensure alignment */
        .col-auto {
            display: flex;
            align-items: center;
        }

        .loading-spinner {
            display: none;
            margin-left: 10px;
        }

        .save-success {
            animation: successHighlight 2s ease-out;
        }

        @keyframes successHighlight {
            0%, 100% { background-color: rgba(255, 255, 255, 0.05); }
            30% { background-color: rgba(46, 204, 113, 0.2); }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .fade-in {
            animation: fadeIn 0.3s ease-out forwards;
        }

        body.navbar-admin-page #navbarLinks li,
        body.navbar-admin-page #navbarLinks .nav-item-card {
            cursor: grab !important; /* Force grab cursor with !important */
        }

        body.navbar-admin-page #navbarLinks li.dragging,
        body.navbar-admin-page #navbarLinks .nav-item-card.dragging {
            cursor: grabbing !important; /* Force grabbing cursor when dragging */
        }

        /* Override for interactive elements within the list items */
        body.navbar-admin-page #navbarLinks li input,
        body.navbar-admin-page #navbarLinks li button,
        body.navbar-admin-page #navbarLinks li .input-group-text,
        body.navbar-admin-page #navbarLinks .nav-item-card input,
        body.navbar-admin-page #navbarLinks .nav-item-card button,
        body.navbar-admin-page #navbarLinks .nav-item-card .input-group-text {
            cursor: auto !important; /* Reset cursor for interactive elements */
        }

        body.navbar-admin-page #navbarLinks li button,
        body.navbar-admin-page #navbarLinks .nav-item-card button {
            cursor: pointer !important; /* Make buttons show pointer */
        }

    </style>
</head>
<body class="navbar-admin-page">

<div class="container py-4">
    <div class="admin-header text-center fade-in">
        <h1 class="display-4">Navbar Administration</h1>
        <p class="lead">Manage your website's navigation menu</p>
        <a href="mainAdmin.php" class="btn btn-outline-light mb-3">
            <i class="bi bi-arrow-left"></i> Back to Main Admin
        </a>
    </div>

    <div class="row">
        <div class="col-lg-10 mx-auto fade-in" style="animation-delay: 0.1s;">
            <!-- Nav Items Section -->
            <div class="content-section">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h3><i class="bi bi-list"></i> Navigation Items</h3>
                    <div>
                        <input type="text" id="searchLinks" class="form-control form-control-sm" placeholder="Search links...">
                    </div>
                </div>

                <div class="alert alert-info d-flex align-items-center" role="alert">
                    <i class="bi bi-info-circle me-2"></i>
                    <div>Drag items to reorder. Items marked with <i class="bi bi-lock-fill"></i> have limited editing options.</div>
                </div>

                <ul id="navbarLinks" class="list-unstyled">
                    <!-- Nav items will be inserted here -->
                </ul>

                <div class="d-flex justify-content-between mt-4">
                    <button id="createLinkButton" class="btn btn-success" onclick="createNewNavLinkRow()">
                        <i class="bi bi-plus-circle"></i> Add New Link
                    </button>
                    <button id="saveLinksButton" class="btn btn-primary" onclick="saveLinks()">
                        <i class="bi bi-save"></i> Save Changes
                        <span class="spinner-border spinner-border-sm loading-spinner" id="saveSpinner" role="status" aria-hidden="true"></span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Delete Confirmation Modal -->
<div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-labelledby="deleteConfirmModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title text-dark" id="deleteConfirmModalLabel">Confirm Deletion</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-dark">
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
<div class="toast-container position-fixed bottom-0 end-0 p-3"></div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="../js/navbarAdmin.js"></script>

<script src="../js/adminSession.js"></script>
</body>
</html>