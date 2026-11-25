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
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css">
    <link rel="stylesheet" href="admin.css?v=<?php echo filemtime(__DIR__ . '/admin.css'); ?>">
    <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
    <title>Navbar Admin</title>
    <style>
        /* Only what is particular to the Navbar page; the sidebar, panel,
           fields, buttons and dialogs come from admin.css */
        #navbarLinks {
            margin: 0;
            padding: 0;
        }

        .nav-item-card {
            background-color: var(--amb-inset);
            border: 1px solid var(--amb-line);
            border-radius: var(--amb-radius-sm);
            margin-bottom: 10px;
            padding: 12px 15px;
            transition: all 0.3s ease;
            position: relative;
            cursor: grab;
        }

        .nav-item-card:hover {
            background-color: var(--amb-inset-hover);
        }

        .nav-item-card.dragging {
            background-color: rgba(59, 122, 87, 0.3) !important;
            box-shadow: 0 0 15px rgba(59, 122, 87, 0.5) !important;
            border: 1px dashed var(--amb-accent) !important;
            z-index: 1000 !important;
            cursor: grabbing !important;
        }

        .nav-item-card[draggable=true] {
            user-select: none;
            -webkit-user-drag: element;
        }

        .nav-item-card.dragNavBar {
            transition: opacity 0.3s, transform 0.3s, box-shadow 0.3s;
        }

        /* The handle only shows where to grab; the whole row drags */
        .drag-handle {
            color: var(--amb-muted);
            opacity: 0.7;
            transition: opacity 0.2s;
            pointer-events: none;
        }

        .nav-item-card:hover .drag-handle {
            opacity: 1;
        }

        .nav-item-card input,
        .nav-item-card .input-group-text {
            cursor: auto;
        }

        .nav-item-card button {
            cursor: pointer;
        }

        .text-warning {
            color: var(--amb-warning) !important;
        }

        .nav-item-card .row.align-items-center {
            min-height: 38px;
            row-gap: 8px;
        }

        .nav-item-card .col-auto {
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
            0%, 100% { background-color: var(--amb-inset); }
            30% { background-color: rgba(59, 122, 87, 0.45); }
        }

        #searchLinks {
            width: 240px;
            max-width: 100%;
        }

        @media (max-width: 767.98px) {
            #searchLinks {
                width: 100%;
            }

            .page-title-row > div {
                flex: 1 1 100%;
            }
        }
    </style>
</head>
<body class="navbar-admin-page">
<?php $ambAdminPage = 'navbar'; include __DIR__ . '/adminNav.php'; ?>

<div class="admin-layout">
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="admin-title">Navbar Admin</div>

        <div class="sidebar-actions">
            <button id="saveLinksButton" class="btn btn-light w-100 mb-2" onclick="saveLinks()">
                <i class="bi bi-save"></i> Save Changes
                <span class="spinner-border spinner-border-sm loading-spinner" id="saveSpinner" role="status" aria-hidden="true"></span>
            </button>
            <button id="createLinkButton" class="btn btn-outline-light w-100 mb-4" onclick="createNewNavLinkRow()">
                <i class="bi bi-plus-circle"></i> Add New Link
            </button>
        </div>

        <div class="section-title">How it works</div>
        <p class="sidebar-note">
            These are the links in your website's menu, in the order they appear.
            Drag them to reorder, then press Save Changes.
        </p>
        <p class="sidebar-note mb-0">
            Links marked with <i class="bi bi-lock-fill text-warning"></i> have limited editing options.
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
<div class="toast-container p-3"></div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js" integrity="sha384-vtXRMe3mGCbOeY7l30aIg8H9p3GdeSe4IFlP6G8JMa7o7lXvnz3GFKzPxzJdPfGK" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js" integrity="sha384-geWF76RCwLtnZ8qwWowPQNguL3RmwHVBC9FhGdlKrxdiJJigb/j/68SIy3Te4Bkz" crossorigin="anonymous"></script>
<script src="../js/navbarAdmin.js"></script>

<script src="../js/adminSession.js"></script>
</body>
</html>
