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
<html lang="en" data-bs-theme="dark">
<head>
    <?php $ambPageTitle = 'Projects Administration'; include __DIR__ . '/adminHead.php'; ?>
    <script>
        window.AMB_WORK_ORDER_READY = <?php echo $workOrderReady ? 'true' : 'false'; ?>;
        window.AMB_YEAR_GROUPS = <?php echo json_encode($yearGroups); ?>;
    </script>
    <script src="../js/projectAdminFunctions.js?v=<?php echo filemtime(__DIR__ . '/../js/projectAdminFunctions.js'); ?>"></script>

</head>
<body class="page-projects">
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
                <span class="input-group-text"><i class="fas fa-search"></i></span>
                <input type="text" class="form-control" id="projectSearch" placeholder="Search projects..." aria-label="Search projects">
            </div>

            <p class="order-hint" id="projectOrderHint">
                <i class="fas fa-grip-vertical me-1"></i>
                Drag a project, or use its arrows, to change where it appears on your Works page. The new order is saved straight away.
                <span class="ms-1" id="projectOrderStatus" role="status"></span>
            </p>

            <!-- Projects Display Area -->
            <div class="row" id="existingPostInformation">
                <!-- Project cards will be inserted here by JavaScript -->
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
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
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="createProjectForm">
                    <div class="mb-3">
                        <label class="form-label" for="titlePostName">Project Title</label>
                        <input type="text" class="form-control" id="titlePostName" required>
                    </div>

                    <div class="mb-3">
                        <label class="form-label" for="projectDescription">Project Description</label>
                        <textarea class="form-control" rows="4" id="projectDescription"></textarea>
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Project Status</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="isActivePost" id="activeYesPost" value="true" checked>
                                    <label class="form-check-label" for="activeYesPost">Active</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="isActivePost" id="activeNoPost" value="false">
                                    <label class="form-check-label" for="activeNoPost">Inactive</label>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Current Project Setting</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="isCurrentProjectPost" id="currentYesPost" value="true">
                                    <label class="form-check-label" for="currentYesPost">Current Project</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="radio" name="isCurrentProjectPost" id="currentNoPost" value="false" checked>
                                    <label class="form-check-label" for="currentNoPost">Not Current Project</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p class="order-hint mb-0">A new project goes first on your Works page. You can move it afterwards.</p>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
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
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="updateProjectForm">
                    <input type="hidden" id="projectId">

                    <ul class="nav nav-tabs" id="projectTabs" role="tablist">
                        <li class="nav-item">
                            <a class="nav-link active" id="details-tab" data-bs-toggle="tab" href="#details" role="tab" aria-controls="details" aria-selected="true">Project Details</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" id="works-tab" data-bs-toggle="tab" href="#works" role="tab" aria-controls="works" aria-selected="false">Associated Works</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" id="arrange-tab" data-bs-toggle="tab" href="#arrange" role="tab" aria-controls="arrange" aria-selected="false">Order of Works</a>
                        </li>
                    </ul>

                    <div class="tab-content p-3 border border-top-0 rounded-bottom" id="projectTabContent">
                        <!-- Project Details Tab -->
                        <div class="tab-pane fade show active" id="details" role="tabpanel" aria-labelledby="details-tab">
                            <div class="mb-3">
                                <label class="form-label" for="editProjectTitle">Project Title</label>
                                <input type="text" class="form-control" id="editProjectTitle" required>
                            </div>

                            <div class="mb-3">
                                <label class="form-label" for="editProjectDescription">Project Description</label>
                                <textarea class="form-control" rows="4" id="editProjectDescription" required></textarea>
                            </div>

                            <div class="row">
                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Project Status</label>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="editIsActivePost" id="editActiveYesPost" value="true">
                                            <label class="form-check-label" for="editActiveYesPost">Active</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="editIsActivePost" id="editActiveNoPost" value="false">
                                            <label class="form-check-label" for="editActiveNoPost">Inactive</label>
                                        </div>
                                    </div>
                                </div>

                                <div class="col-md-6">
                                    <div class="mb-3">
                                        <label class="form-label">Current Project Setting</label>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="editIsCurrentProjectPost" id="editCurrentYesPost" value="true">
                                            <label class="form-check-label" for="editCurrentYesPost">Current Project</label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="editIsCurrentProjectPost" id="editCurrentNoPost" value="false">
                                            <label class="form-check-label" for="editCurrentNoPost">Not Current Project</label>
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
                                            <span class="visually-hidden">Loading works...</span>
                                        </div>
                                    </div>
                                </ul>
                            </div>

                            <div class="text-end">
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
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
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
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmActionBtn">
                    <i class="fas fa-check"></i> Yes, proceed
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Toast Container -->
<div id="myToastContainer" class="toast-container"></div>

<script>
    // The statistics cards are buttons: Enter or Space opens their list too
    $(document).on('keydown', '.stats-card[role="button"]', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.click();
        }
    });
</script>
</body>
</html>