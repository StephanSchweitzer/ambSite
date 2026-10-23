<?php
include_once __DIR__ . '/../database/session.php';
if (($_SESSION["ambar"] ?? null) != "connected") {
    header("Location: ../signIn/signIn.php?status=needCredentials");
    die;
}
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="admin.css">
    <script src="../js/projectAdminFunctions.js"></script>
    <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
    <title>Project Admin Dashboard</title>

    <style>
        :root {
            --primary-color: #3498db;
            --secondary-color: #2c3e50;
            --success-color: #2ecc71;
            --danger-color: #e74c3c;
            --warning-color: #f39c12;
            --light-color: #343a40;
            --dark-color: #212529;
        }

        body {
            background-color: #212529;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #f8f9fa;
        }

        .admin-container {
            background-color: #2c3e50;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
            margin: 30px auto;
            max-width: 1400px;
            padding: 30px;
        }

        .page-header {
            background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
            border-radius: 8px;
            color: white;
            margin-bottom: 30px;
            padding: 30px;
            text-align: center;
        }

        .control-panel {
            background-color: #343a40;
            border-radius: 8px;
            margin-bottom: 30px;
            padding: 20px;
        }

        .btn-action {
            border-radius: 5px;
            font-weight: 600;
            margin: 5px;
            padding: 10px 20px;
            transition: all 0.3s;
        }

        .btn-action:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        .btn-outline-secondary {
            color: #e9ecef;
            border-color: #6c757d;
        }

        .create-btn {
            background-color: var(--success-color);
            color: white;
        }

        .project-card {
            background-color: #343a40;
            border: none;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            margin-bottom: 20px;
            padding: 20px;
            transition: all 0.3s ease;
        }

        .project-card:hover {
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            transform: translateY(-5px);
        }

        .project-card .card-title {
            color: var(--secondary-color);
            font-size: 1.4rem;
            font-weight: 600;
            margin-bottom: 15px;
        }

        .project-card .card-body {
            padding: 0;
        }

        .project-card .card-text {
            color: #e2e2e2;
            margin-bottom: 10px;
            font-weight: 500;
        }

        .project-card .card-text strong {
            color: #ffffff;
            font-weight: 600;
            margin-right: 5px;
        }

        .project-card .badge {
            font-size: 0.85rem;
            margin-right: 5px;
            padding: 5px 10px;
        }

        .modal-content {
            background-color: #343a40;
            border: none;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            color: #f8f9fa;
        }

        .modal-header {
            background-color: var(--secondary-color);
            border-radius: 10px 10px 0 0;
            color: white;
            padding: 15px 20px;
        }

        .modal-footer {
            border-top: 1px solid #eee;
            padding: 15px 20px;
        }

        .form-control {
            background-color: #495057;
            border: 1px solid #6c757d;
            border-radius: 5px;
            color: #f8f9fa;
            padding: 10px 15px;
        }

        .form-control:focus {
            background-color: #495057;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
            color: #f8f9fa;
        }

        .form-group label {
            color: #f8f9fa;
            font-weight: 600;
            margin-bottom: 8px;
        }

        /* Works list styling */
        #worksList {
            border: 1px solid #495057;
            border-radius: 8px;
            height: 400px;
            list-style-type: none;
            margin: 15px 0;
            overflow-y: auto;
            padding: 0;
            background-color: #343a40;
        }

        #worksList li {
            align-items: center;
            border-bottom: 1px solid #495057;
            display: flex;
            padding: 10px 15px;
            transition: background-color 0.2s;
        }

        #worksList li:hover {
            background-color: #495057;
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
            color: #aaa;
            left: 15px;
            position: absolute;
            top: 13px;
        }

        #workSearch {
            border-radius: 20px;
            padding-left: 40px;
        }

        .project-info {
            background-color: #2c3e50;
            border-radius: 4px;
            color: #adb5bd;
            font-size: 0.8rem;
            margin-left: 10px;
            padding: 2px 8px;
        }

        .toast-container {
            position: fixed;
            right: 20px;
            top: 20px;
            z-index: 9999;
        }

        .toast {
            background-color: #343a40;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            color: #f8f9fa;
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
            font-weight: 600;
        }

        .badge-inactive {
            background-color: var(--warning-color);
            color: #212529;
            font-weight: 600;
        }

        .badge-deleted {
            background-color: var(--danger-color);
            color: white;
            font-weight: 600;
        }

        .badge-current {
            background-color: var(--primary-color);
            color: white;
            font-weight: 600;
        }

        /* Loading spinner */
        .loading-spinner {
            align-items: center;
            background-color: rgba(255, 255, 255, 0.7);
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

        .spinner-border {
            color: var(--primary-color);
            height: 3rem;
            width: 3rem;
        }

        /* Status colors for projects */
        .status-indicator {
            border-left: 5px solid #ccc;
            height: 100%;
            position: absolute;
            left: 0;
            top: 0;
            border-radius: 10px 0 0 10px;
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

        /* Project counts */
        .project-counts {
            display: flex;
            justify-content: space-around;
            margin-bottom: 20px;
            text-align: center;
        }

        .count-card {
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            padding: 15px;
            width: 30%;
            cursor: pointer;
            transition: transform 0.2s ease;
            color: #f8f9fa;
        }

        .count-card:hover {
            transform: translateY(-5px);
        }

        /* Specific color styling for each type of count card */
        /* Active Projects - blue */
        .count-card:nth-child(1) {
            background-color: var(--primary-color);
            border: 1px solid var(--primary-color);
        }

        /* Inactive Projects - yellow/orange */
        .count-card:nth-child(2) {
            background-color: var(--warning-color);
            border: 1px solid var(--warning-color);
            color: #212529; /* Dark text for better contrast on yellow */
        }

        /* Deleted Projects - red */
        .count-card:nth-child(3) {
            background-color: var(--danger-color);
            border: 1px solid var(--danger-color);
        }

        /* Adjust text color for better contrast */
        .count-card:nth-child(2) .count-number,
        .count-card:nth-child(2) .count-label {
            color: #212529;
        }

        .count-card:hover {
            transform: translateY(-5px);
        }

        .count-number {
            font-size: 2rem;
            font-weight: bold;
            margin: 10px 0;
            color: #f8f9fa;
        }

        .count-label {
            color: #adb5bd;
            font-weight: 500;
        }

        /* Confirmation modal */
        #confirmationModal .modal-body {
            padding: 30px 20px;
            text-align: center;
            background-color: #343a40;
            color: #f8f9fa;
        }

        #confirmationModal .confirmation-icon {
            color: var(--danger-color);
            font-size: 3rem;
            margin-bottom: 20px;
        }

        /* Works count badge */
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

        .nav-tabs .nav-link {
            color: #ffffff; /* White text for better contrast on dark background */
            font-weight: 500; /* Slightly bolder font */
        }

        /* Style for inactive tabs */
        .nav-tabs .nav-link:not(.active) {
            color: #e0e0e0; /* Light grey for inactive tabs */
        }

        /* Style for active tab */
        .nav-tabs .nav-link.active {
            background-color: #343a40; /* Darker grey background */
            color: #ffc107; /* Yellow/gold color for the active tab text */
            border-color: #495057 #495057 #343a40; /* Matching border colors */
            font-weight: 600; /* Make active tab text bolder */
        }

        /* Hover state for better interactivity */
        .nav-tabs .nav-link:hover:not(.active) {
            color: #ffc107; /* Same as active color on hover */
            border-color: #636b74 #636b74 #495057; /* Slightly lighter borders on hover */
        }
    </style>
</head>
<body>
<div class="admin-container">
    <!-- Page Header -->
    <div class="page-header">
        <h1 class="display-4">Project Admin Dashboard</h1>
        <p class="lead">Manage your projects and associated works</p>
    </div>

    <!-- Main Navigation & Controls -->
    <div class="control-panel">
        <div class="row">
            <div class="col-md-6">
                <a href="mainAdmin.php" class="btn btn-outline-secondary btn-action">
                    <i class="fas fa-arrow-left"></i> Back to Main Admin
                </a>
            </div>
            <div class="col-md-6 text-right">
                <button type="button" class="btn btn-success btn-action create-btn" onclick="openPostForm()">
                    <i class="fas fa-plus"></i> Create Project
                </button>
            </div>
        </div>
    </div>

    <!-- Project Counts Section -->
    <div class="project-counts">
        <div class="count-card" onclick="getProjects('active')">
            <div class="count-number" id="activeCount">-</div>
            <div class="count-label">Active Projects</div>
        </div>
        <div class="count-card" onclick="getProjects('inactive')">
            <div class="count-number" id="inactiveCount">-</div>
            <div class="count-label">Inactive Projects</div>
        </div>
        <div class="count-card" onclick="getProjects('deleted')">
            <div class="count-number" id="deletedCount">-</div>
            <div class="count-label">Deleted Projects</div>
        </div>
    </div>

    <!-- Filter Controls -->
    <div class="filter-controls mb-4">
        <div class="btn-group w-100">
            <button type="button" class="btn btn-outline-primary btn-action" onclick="getProjects('active')" id="activeBtn">
                <i class="fas fa-check-circle"></i> Active Projects
            </button>
            <button type="button" class="btn btn-outline-warning btn-action" onclick="getProjects('inactive')" id="inactiveBtn">
                <i class="fas fa-pause-circle"></i> Inactive Projects
            </button>
            <button type="button" class="btn btn-outline-danger btn-action" onclick="getProjects('deleted')" id="deletedBtn">
                <i class="fas fa-trash-alt"></i> Deleted Projects
            </button>
        </div>
    </div>

    <!-- Projects Search Bar -->
    <div class="row mb-4">
        <div class="col-md-12">
            <div class="input-group">
                <div class="input-group-prepend">
                    <span class="input-group-text"><i class="fas fa-search"></i></span>
                </div>
                <input type="text" class="form-control" id="projectSearch" placeholder="Search projects...">
            </div>
        </div>
    </div>

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

                    <div class="form-group">
                        <label for="postOrderOfDisplay">Display Order / Position</label>
                        <input type="number" class="form-control" id="postOrderOfDisplay" min="1" value="1">
                    </div>
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

                            <div class="form-group">
                                <label for="editOrderOfDisplay">Display Order / Position</label>
                                <input type="number" class="form-control" id="editOrderOfDisplay" min="1">
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

<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.16.0/umd/popper.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

<script src="../js/adminSession.js"></script>
</body>
</html>