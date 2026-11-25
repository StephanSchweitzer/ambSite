<?php
include_once __DIR__ . '/../database/session.php';
if (($_SESSION["ambar"] ?? null) != "connected") {
    header("Location: ../signIn/signIn.php?status=needCredentials");
    die;
}
include '../database/pdo.php';
include_once __DIR__ . '/../actions/projectOrderFunctions.php';
include_once __DIR__ . '/../actions/publicPageFunctions.php';
$workOrderReady = ambProjectOrderReady($conn);

// The Works page's year groups, so "Order of Works" can show the same ones
$yearGroups = array('bands' => ambYearBands(), 'projects' => ambYearGroupedProjects());
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js" integrity="sha384-ZvpUoO/+PpLXR1lu4jmpXWu80pZlYUAfxl5NsBMWOEPSjUn/6Z/hRTt8+pR6L4N2" crossorigin="anonymous"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="admin.css?v=<?php echo filemtime(__DIR__ . '/admin.css'); ?>">
    <script>
        window.AMB_WORK_ORDER_READY = <?php echo $workOrderReady ? 'true' : 'false'; ?>;
        window.AMB_YEAR_GROUPS = <?php echo json_encode($yearGroups); ?>;
    </script>
    <script src="../js/projectAdminFunctions.js"></script>
    <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
    <title>Project Admin Dashboard</title>

    <style>
        /* Only what is particular to the Projects page; the sidebar, panel,
           fields, buttons and dialogs come from admin.css */
        :root {
            --primary-color: #3498db;
            --success-color: var(--amb-accent);
            --danger-color: var(--amb-danger);
            --warning-color: var(--amb-warning);
        }

        .project-card {
            background-color: var(--amb-inset);
            border: 1px solid var(--amb-line);
            border-radius: var(--amb-radius-sm);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            color: var(--amb-text);
            cursor: pointer;
            margin-bottom: 0;
            padding: 20px;
            transition: all 0.3s ease;
        }

        .project-card:hover {
            background-color: var(--amb-inset-hover);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
            transform: translateY(-5px);
        }

        .project-card .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 15px;
        }

        .project-card .card-body {
            padding: 0;
        }

        .project-card .card-text {
            color: var(--amb-muted);
            margin-bottom: 10px;
        }

        .project-card .card-text strong {
            color: var(--amb-text);
            font-weight: 600;
            margin-right: 5px;
        }

        .project-card .badge {
            font-size: 0.85rem;
            margin-right: 5px;
            padding: 5px 10px;
        }

        .modal-footer {
            padding: 15px 20px;
        }

        /* Works list in the project's dialog */
        #worksList {
            border: 1px solid var(--amb-border);
            border-radius: 8px;
            height: 400px;
            list-style-type: none;
            margin: 15px 0;
            overflow-y: auto;
            padding: 0;
            background-color: var(--amb-sidebar);
        }

        #worksList li {
            align-items: center;
            border-bottom: 1px solid var(--amb-border);
            display: flex;
            padding: 10px 15px;
            transition: background-color 0.2s;
        }

        #worksList li:hover {
            background-color: var(--amb-inset);
        }

        #worksList li:last-child {
            border-bottom: none;
        }

        .work-item-content {
            align-items: center;
            display: flex;
            flex: 1;
        }

        .work-item-checkbox {
            margin-right: 15px;
            transform: scale(1.2);
        }

        .work-item-thumbnail {
            border-radius: 5px;
            height: 40px;
            margin-right: 15px;
            object-fit: cover;
            width: 40px;
        }

        .work-item-name {
            flex: 1;
            font-weight: 500;
        }

        .work-search-container {
            margin-bottom: 15px;
            position: relative;
        }

        .work-search-container i {
            color: var(--amb-muted);
            left: 15px;
            position: absolute;
            top: 11px;
        }

        #workSearch {
            border-radius: 20px;
            padding-left: 40px;
        }

        .project-info {
            background-color: var(--amb-panel);
            border-radius: 4px;
            color: #adb5bd;
            font-size: 0.8rem;
            margin-left: 10px;
            padding: 2px 8px;
        }

        /* This page's own little messages (they slide in from the right) */
        .toast {
            margin-bottom: 10px;
            max-width: 350px;
            opacity: 0;
            padding: 15px 20px;
            transform: translateX(100%);
            transition: all 0.3s ease-in-out;
        }

        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }

        .toast.success {
            border-left: 5px solid var(--success-color);
        }

        .toast.error {
            border-left: 5px solid var(--danger-color);
        }

        .toast.info {
            border-left: 5px solid var(--primary-color);
        }

        .badge-active {
            background-color: var(--success-color);
            color: white;
        }

        .badge-inactive {
            background-color: var(--warning-color);
            color: #212529;
        }

        .badge-deleted {
            background-color: var(--danger-color);
            color: white;
        }

        .badge-current {
            background-color: var(--primary-color);
            color: white;
        }

        .loading-spinner {
            align-items: center;
            background-color: rgba(0, 0, 0, 0.4);
            border-radius: 5px;
            display: flex;
            height: 100%;
            justify-content: center;
            left: 0;
            position: absolute;
            top: 0;
            width: 100%;
            z-index: 1000;
        }

        /* The coloured edge on each project: its status */
        .status-indicator {
            border-left: 5px solid #ccc;
            height: 100%;
            position: absolute;
            left: 0;
            top: 0;
            border-radius: 8px 0 0 8px;
        }

        .status-active {
            border-color: var(--success-color);
        }

        .status-inactive {
            border-color: var(--warning-color);
        }

        .status-deleted {
            border-color: var(--danger-color);
        }

        .status-current {
            border-color: var(--primary-color);
        }

        #confirmationModal .modal-body {
            padding: 30px 20px;
            text-align: center;
        }

        #confirmationModal .confirmation-icon {
            color: var(--danger-color);
            font-size: 3rem;
            margin-bottom: 20px;
        }

        /* Works count bubble beside a project's name */
        .works-count {
            background-color: var(--primary-color);
            border-radius: 50%;
            color: white;
            display: inline-block;
            font-size: 0.8rem;
            height: 25px;
            line-height: 25px;
            margin-left: 10px;
            text-align: center;
            width: 25px;
        }

        #projectTabContent {
            border-color: var(--amb-border) !important;
        }

        /* Putting projects and works in order */
        .order-hint {
            color: var(--amb-muted);
            margin-bottom: 15px;
        }

        .order-controls {
            align-items: center;
            border-top: 1px solid var(--amb-border);
            display: flex;
            gap: 6px;
            margin-top: 15px;
            padding-top: 10px;
        }

        .order-controls .order-position {
            color: #adb5bd;
            flex: 1;
            font-size: 0.85rem;
        }

        .drag-handle {
            color: #adb5bd;
            cursor: grab;
            padding: 4px;
        }

        .btn-move {
            align-items: center;
            background: transparent;
            border: 1px solid #6c757d;
            border-radius: 5px;
            color: #f8f9fa;
            cursor: pointer;
            display: inline-flex;
            height: 32px;
            justify-content: center;
            width: 32px;
        }

        .btn-move:not(:disabled):hover {
            border-color: #f8f9fa;
        }

        .btn-move:disabled {
            cursor: default;
            opacity: 0.3;
        }

        .is-dragging {
            opacity: 0.4;
        }

        /* Moving projects while a search hides some would be confusing */
        .is-searching .order-controls {
            display: none;
        }

        .arrange-group-title {
            color: #adb5bd;
            font-size: 0.95rem;
            font-weight: 600;
            margin: 0 0 8px;
        }

        .arrange-list {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            list-style: none;
            margin: 0 0 15px;
            padding: 0;
        }

        .arrange-item {
            background-color: var(--amb-inset);
            border: 1px solid var(--amb-border);
            border-radius: 8px;
            cursor: grab;
            padding: 8px;
        }

        .arrange-item img {
            background-color: var(--amb-sidebar);
            border-radius: 5px;
            display: block;
            height: 100px;
            object-fit: contain;
            width: 100%;
        }

        .arrange-item .arrange-name {
            font-size: 0.85rem;
            margin: 6px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .arrange-item .arrange-moves {
            align-items: center;
            display: flex;
            gap: 6px;
            justify-content: space-between;
        }

        .arrange-item .order-position {
            color: #adb5bd;
            font-size: 0.85rem;
        }

        @media (max-width: 767.98px) {
            .project-card {
                padding: 15px;
            }
        }
    </style>
</head>
<body>
<?php $ambAdminPage = 'projects'; include __DIR__ . '/adminNav.php'; ?>

<div class="admin-layout">
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="admin-title">Projects Admin</div>

        <div class="sidebar-actions">
            <button type="button" class="btn btn-light w-100 mb-4" onclick="openPostForm()">
                <i class="fas fa-plus"></i> Create Project
            </button>
        </div>

        <div class="section-title">View Options</div>
        <nav class="nav flex-column mb-4 view-options">
            <button type="button" class="nav-link active" onclick="getProjects('active')" id="activeBtn">
                <i class="fas fa-check-circle"></i> Active Projects
            </button>
            <button type="button" class="nav-link" onclick="getProjects('inactive')" id="inactiveBtn">
                <i class="fas fa-pause-circle"></i> Inactive Projects
            </button>
            <button type="button" class="nav-link" onclick="getProjects('deleted')" id="deletedBtn">
                <i class="fas fa-trash-alt"></i> Deleted Projects
            </button>
        </nav>

        <div class="section-title">Statistics</div>
        <div class="stats-list">
            <div class="stats-card" role="button" tabindex="0" title="Show active projects" onclick="getProjects('active')">
                <i class="fas fa-check-circle"></i>
                <div>
                    <small>Active</small>
                    <p class="count" id="activeCount">-</p>
                </div>
            </div>
            <div class="stats-card" role="button" tabindex="0" title="Show inactive projects" onclick="getProjects('inactive')">
                <i class="fas fa-pause-circle"></i>
                <div>
                    <small>Inactive</small>
                    <p class="count" id="inactiveCount">-</p>
                </div>
            </div>
            <div class="stats-card" role="button" tabindex="0" title="Show deleted projects" onclick="getProjects('deleted')">
                <i class="fas fa-trash-alt"></i>
                <div>
                    <small>Deleted</small>
                    <p class="count" id="deletedCount">-</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="content-area">
        <div class="main-content">
            <div class="page-title-row">
                <h1 class="h3">Projects Administration</h1>
            </div>

            <!-- Projects Search Bar -->
            <div class="input-group mb-3">
                <div class="input-group-prepend">
                    <span class="input-group-text"><i class="fas fa-search"></i></span>
                </div>
                <input type="text" class="form-control" id="projectSearch" placeholder="Search projects...">
            </div>

            <p class="order-hint" id="projectOrderHint">
                <i class="fas fa-grip-vertical mr-1"></i>
                Drag a project, or use its arrows, to change where it appears on your Works page. The new order is saved straight away.
                <span class="ml-1" id="projectOrderStatus" role="status"></span>
            </p>

            <!-- Projects Display Area -->
            <div class="row" id="existingPostInformation">
                <!-- Project cards will be inserted here by JavaScript -->
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="sr-only">Loading...</span>
                    </div>
                    <p class="mt-3">Loading projects...</p>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Create Project Modal -->
<div class="modal fade" id="projectPostModal" tabindex="-1" role="dialog" aria-labelledby="projectModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="postModalLabel">Create New Project</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form id="createProjectForm">
                    <div class="form-group">
                        <label for="titlePostName">Project Title</label>
                        <input type="text" class="form-control" id="titlePostName" required>
                    </div>

                    <div class="form-group">
                        <label for="projectDescription">Project Description</label>
                        <textarea class="form-control" rows="4" id="projectDescription"></textarea>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Project Status</label>
                                <div class="custom-control custom-radio">
                                    <input class="custom-control-input" type="radio" name="isActivePost" id="activeYesPost" value="true" checked>
                                    <label class="custom-control-label" for="activeYesPost">Active</label>
                                </div>
                                <div class="custom-control custom-radio">
                                    <input class="custom-control-input" type="radio" name="isActivePost" id="activeNoPost" value="false">
                                    <label class="custom-control-label" for="activeNoPost">Inactive</label>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Current Project Setting</label>
                                <div class="custom-control custom-radio">
                                    <input class="custom-control-input" type="radio" name="isCurrentProjectPost" id="currentYesPost" value="true">
                                    <label class="custom-control-label" for="currentYesPost">Current Project</label>
                                </div>
                                <div class="custom-control custom-radio">
                                    <input class="custom-control-input" type="radio" name="isCurrentProjectPost" id="currentNoPost" value="false" checked>
                                    <label class="custom-control-label" for="currentNoPost">Not Current Project</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p class="order-hint mb-0">A new project goes first on your Works page. You can move it afterwards.</p>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button id="uploadWorkButton" type="button" class="btn btn-success" onclick="createProject()">
                    <i class="fas fa-save"></i> Create Project
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Update Project Modal -->
<div class="modal fade" id="projectUpdateModal" tabindex="-1" role="dialog" aria-labelledby="projectModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="projectModalLabel">Edit Project</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form id="updateProjectForm">
                    <input type="hidden" id="projectId">

                    <ul class="nav nav-tabs" id="projectTabs" role="tablist" style="border-bottom-color: #495057;">
                        <li class="nav-item">
                            <a class="nav-link active" id="details-tab" data-toggle="tab" href="#details" role="tab" aria-controls="details" aria-selected="true">Project Details</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" id="works-tab" data-toggle="tab" href="#works" role="tab" aria-controls="works" aria-selected="false">Associated Works</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" id="arrange-tab" data-toggle="tab" href="#arrange" role="tab" aria-controls="arrange" aria-selected="false">Order of Works</a>
                        </li>
                    </ul>

                    <div class="tab-content p-3 border border-top-0 rounded-bottom" id="projectTabContent">
                        <!-- Project Details Tab -->
                        <div class="tab-pane fade show active" id="details" role="tabpanel" aria-labelledby="details-tab">
                            <div class="form-group">
                                <label for="editProjectTitle">Project Title</label>
                                <input type="text" class="form-control" id="editProjectTitle" required>
                            </div>

                            <div class="form-group">
                                <label for="editProjectDescription">Project Description</label>
                                <textarea class="form-control" rows="4" id="editProjectDescription" required></textarea>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label>Project Status</label>
                                        <div class="custom-control custom-radio">
                                            <input class="custom-control-input" type="radio" name="editIsActivePost" id="editActiveYesPost" value="true">
                                            <label class="custom-control-label" for="editActiveYesPost">Active</label>
                                        </div>
                                        <div class="custom-control custom-radio">
                                            <input class="custom-control-input" type="radio" name="editIsActivePost" id="editActiveNoPost" value="false">
                                            <label class="custom-control-label" for="editActiveNoPost">Inactive</label>
                                        </div>
                                    </div>
                                </div>

                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label>Current Project Setting</label>
                                        <div class="custom-control custom-radio">
                                            <input class="custom-control-input" type="radio" name="editIsCurrentProjectPost" id="editCurrentYesPost" value="true">
                                            <label class="custom-control-label" for="editCurrentYesPost">Current Project</label>
                                        </div>
                                        <div class="custom-control custom-radio">
                                            <input class="custom-control-input" type="radio" name="editIsCurrentProjectPost" id="editCurrentNoPost" value="false">
                                            <label class="custom-control-label" for="editCurrentNoPost">Not Current Project</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <!-- Associated Works Tab -->
                        <div class="tab-pane fade" id="works" role="tabpanel" aria-labelledby="works-tab">
                            <div class="work-search-container">
                                <i class="fas fa-search"></i>
                                <input type="text" class="form-control" id="workSearch" placeholder="Search works...">
                            </div>

                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="selectAllWorks">
                                <label class="form-check-label" for="selectAllWorks">
                                    Select All Works
                                </label>
                            </div>

                            <div id="worksInProject">
                                <ul id="worksList">
                                    <!-- Work items will be inserted here -->
                                    <div class="text-center py-4">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="sr-only">Loading works...</span>
                                        </div>
                                    </div>
                                </ul>
                            </div>

                            <div class="text-right">
                                <button type="button" class="btn btn-primary" onclick="addWorksToProject()">
                                    <i class="fas fa-save"></i> Save Associated Works
                                </button>
                            </div>
                        </div>

                        <!-- Order of Works Tab -->
                        <div class="tab-pane fade" id="arrange" role="tabpanel" aria-labelledby="arrange-tab">
                            <div id="arrangeArea"></div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <div id="deleteOrRestore">
                    <button type="button" class="btn btn-danger" onclick="confirmDelete()">
                        <i class="fas fa-trash-alt"></i> Delete Project
                    </button>
                </div>
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="updateWork()">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Confirmation Modal -->
<div class="modal fade" id="confirmationModal" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-body">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle confirmation-icon"></i>
                    <h4 class="mb-4">Are you sure?</h4>
                    <p id="confirmationMessage">This action cannot be undone.</p>
                </div>
            </div>
            <div class="modal-footer justify-content-center">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmActionBtn">
                    <i class="fas fa-check"></i> Yes, proceed
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Toast Container -->
<div id="myToastContainer" class="toast-container"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.16.0/umd/popper.min.js" integrity="sha384-Q6E9RHvbIyZFJoft+2mJbHaEWldlvI9IOYy5n3zV9zzTtmI3UksdQRVvoxMfooAo" crossorigin="anonymous"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js" integrity="sha384-B4gt1jrGC7Jh4AgTPSdUtOBvfO8shuf57BaghqFfPlYxofvL8/KUEfYiJOMMV+rV" crossorigin="anonymous"></script>

<script>
    // The statistics cards are buttons: Enter or Space opens their list too
    $(document).on('keydown', '.stats-card[role="button"]', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });
</script>
<script src="../js/adminSession.js"></script>
</body>
</html>