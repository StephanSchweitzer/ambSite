<?php
session_start();
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
    <title>Works Administration</title>

    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">

    <!-- jQuery -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.4/jquery.min.js"></script>

    <!-- Bootstrap 5 CSS and JS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css">

    <!-- Custom CSS -->
    <link rel="stylesheet" href="admin.css">

    <style>
        body {
            background-color: #25252f;
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .sidebar {
            background-color: #1e1e28;
            min-height: 100vh;
            padding: 20px;
            position: fixed;
            width: 250px;
            overflow-y: auto;
        }

        .content-area {
            margin-left: 250px;
            padding: 20px;
            width: 100%;
        }

        .admin-container {
            background-color: #2c3e50;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
            margin: 30px auto;
            max-width: 1400px;
            padding: 30px;
        }

        .admin-title {
            font-size: 1.8rem;
            margin-bottom: 20px;
            color: white;
        }

        .nav-link {
            color: rgba(255, 255, 255, 0.9);
            border-radius: 5px;
            margin-bottom: 5px;
            transition: all 0.2s;
        }

        .nav-link:hover, .nav-link.active {
            background-color: rgba(255,255,255,0.1);
            color: white;
        }

        .nav-link i {
            width: 20px;
            text-align: center;
            margin-right: 8px;
        }

        .stats-card {
            background-color: #3b7a57;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: all 0.3s;
            cursor: pointer;
            color: white;
        }

        .stats-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .stats-card i {
            font-size: 24px;
            margin-right: 15px;
            color: #8de4ff;
        }

        .stats-card small {
            color: rgba(255, 255, 255, 0.8);
        }

        .stats-card .count {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 0;
        }

        .section-title {
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.1rem;
            color: #8de4ff;
            font-weight: 500;
            margin: 20px 0 10px;
        }

        .main-content {
            background-color: #2c3e50;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
            padding: 20px;
            color: white;
        }

        .search-and-filters {
            margin-bottom: 20px;
        }

        .filter-tag {
            display: inline-block;
            padding: 5px 10px;
            background-color: #f0f0f0;
            border-radius: 20px;
            margin-right: 5px;
            margin-bottom: 5px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s;
            color: #333;
        }

        .filter-tag.active {
            background-color: #3b7a57;
            color: white;
        }

        .work-card {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            transition: all 0.3s;
            cursor: pointer;
            position: relative;
            background-color: white;
            color: #333;
        }

        .work-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .work-image {
            height: 200px;
            overflow: hidden;
            position: relative;
        }

        .work-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s;
        }

        .work-card:hover .work-image img {
            transform: scale(1.05);
        }

        .work-badges {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .badge-select-works {
            background-color: #4dabf7 !important;
        }

        .badge-carousel {
            background-color: #ff922b !important;
        }

        .badge-available {
            background-color: #51cf66 !important;
        }

        .badge-color {
            background-color: #cc5de8 !important;
        }

        .badge-bw {
            background-color: #34495e;
        }

        .work-info {
            padding: 15px;
        }

        .work-title {
            font-weight: 600;
            margin-bottom: 5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #333;
        }

        .work-medium, .work-year {
            color: #555;
            font-size: 0.9rem;
        }

        .selected-card-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(52, 152, 219, 0.3);
            border: 3px solid #3498db;
            border-radius: 8px;
            display: none;
        }

        .selected-card-overlay .selection-icon {
            position: absolute;
            top: 10px;
            left: 10px;
            background-color: #3498db;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .work-card.selected .selected-card-overlay {
            display: block;
        }

        .multi-select-toolbar {
            display: none;
            background-color: #2c3e50;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            color: white;
        }

        .toast-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
        }

        .custom-toast {
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border-radius: 8px;
            overflow: hidden;
        }

        #loadingSpinner {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            display: none;
        }

        /* Improved contrast fixes */
        .text-muted {
            color: #a8c7e0 !important;
        }

        #resultsInfo {
            color: #a8c7e0 !important;
        }

        .form-text {
            color: #b0d4ff !important;
        }

        .form-check-label {
            color: white;
        }

        /* Make dropdown items more readable */
        .dropdown-menu {
            background-color: #2c3e50;
        }

        .dropdown-item {
            color: white;
        }

        .dropdown-item:hover, .dropdown-item:focus {
            background-color: #3b7a57;
            color: white;
        }

        /* Fix select dropdown text in main content */
        .main-content select.form-select {
            color: white;
            background-color: #2c3e50;
            border-color: #495057;
        }

        .main-content select.form-select option {
            background-color: #2c3e50;
            color: white;
        }

        /* Fix input text in main content */
        .main-content .form-control {
            color: white;
            background-color: #2c3e50;
            border-color: #495057;
        }

        .main-content .form-control::placeholder {
            color: #a8c7e0;
        }

        .input-group-text {
            background-color: #3b7a57;
            color: white;
            border-color: #3b7a57;
        }

        /* Make sort dropdown visible on dark background */
        #sortDropdown {
            color: white;
            border-color: #a8c7e0;
        }

        /* Dark theme for modals */
        .modal-content {
            background-color: #2c3e50;
            color: white;
            border: 1px solid #1e1e28;
        }

        .modal-header {
            border-bottom: 1px solid #1e1e28;
        }

        .modal-footer {
            border-top: 1px solid #1e1e28;
        }

        .modal-content .btn-close {
            color: white;
            filter: invert(1) grayscale(100%) brightness(200%);
        }

        /* Form controls in modal */
        .modal-content .form-control,
        .modal-content .form-select {
            background-color: #1e1e28;
            color: white;
            border: 1px solid #495057;
        }

        .modal-content .form-control:focus,
        .modal-content .form-select:focus {
            background-color: #25252f;
            border-color: #3b7a57;
            box-shadow: 0 0 0 0.25rem rgba(59, 122, 87, 0.25);
        }

        .modal-content .form-control::placeholder {
            color: #a8c7e0;
        }

        /* Make form labels light in modal */
        .modal-content .form-label {
            color: white;
            font-weight: 500;
        }

        /* Make radio button labels light in modal */
        .modal-content .form-check-label {
            color: white;
        }

        .modal-content .form-text {
            color: #a8c7e0 !important;
        }

        /* Modal buttons */
        .modal-footer .btn-secondary {
            background-color: #495057;
            border-color: #495057;
            color: white;
        }

        .modal-footer .btn-primary {
            background-color: #3b7a57;
            border-color: #3b7a57;
            color: white;
        }

        .modal-footer .btn-danger {
            background-color: #e74c3c;
            border-color: #e74c3c;
            color: white;
        }

        .modal-content .dropdown-menu {
            background-color: #2c3e50;
        }

        .modal-content .dropdown-item {
            color: white;
        }

        .modal-content .dropdown-item:hover,
        .modal-content .dropdown-item:focus {
            background-color: #3b7a57;
            color: white;
        }

        /* Override the existing modal styles */
        .modal-content .text-muted {
            color: #a8c7e0 !important;
        }

        /* Custom styles for badges in modal */
        .modal-content .badge-select-works {
            background-color: #4dabf7 !important;
        }

        .modal-content .badge-carousel {
            background-color: #ff922b !important;
        }

        .modal-content .badge-available {
            background-color: #51cf66 !important;
        }

        .modal-content .badge-color {
            background-color: #cc5de8 !important;
        }

        .modal-content .badge-bw {
            background-color: #34495e;
        }

        /* Confirmation modal specific styling */
        #confirmationModal .modal-content {
            background-color: #2c3e50;
        }

        #confirmationModal .modal-header {
            border-bottom-color: #1e1e28;
        }

        #confirmationModal .modal-footer {
            border-top-color: #1e1e28;
        }

        #confirmActionBtn {
            background-color: #e74c3c;
            border-color: #e74c3c;
        }

        /* Image preview border */
        .modal-content #previewImage,
        .modal-content #uploadPreview {
            border: 2px solid #1e1e28;
        }

        /* Fix badge color and font weight */
        .badge {
            font-weight: 600;
        }

        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                position: relative;
                min-height: auto;
            }

            .content-area {
                margin-left: 0;
            }
        }

        #projectsList {
            border: 1px solid #495057;
            border-radius: 8px;
            max-height: 350px;
            list-style-type: none;
            margin: 15px 0;
            overflow-y: auto;
            padding: 0;
            background-color: #2c3e50; /* Dark background */
        }

        #projectsList .list-group-item {
            background-color: #343a40; /* Dark grey background */
            color: #ffffff; /* White text */
            border-color: #495057; /* Darker border */
            padding: 10px 15px;
            border-radius: 0;
        }

        #projectsList .list-group-item:hover {
            background-color: #404b57; /* Slightly lighter on hover */
        }

        #projectsList .form-check-label {
            color: #ffffff; /* White text for checkboxes */
        }

        #projectsList .badge {
            background-color: #3b7a57; /* Green badge */
            color: white;
        }

        /* Project search styling */
        .project-search-container .input-group-text {
            background-color: #3b7a57; /* Green background */
            color: white;
            border-color: #3b7a57;
        }

        #projectSearch {
            background-color: #2c3e50; /* Dark background */
            color: white;
            border-color: #495057;
        }

        #projectSearch::placeholder {
            color: #a8c7e0; /* Light blue placeholder */
        }

        /* Select all checkbox */
        .form-check-input:checked {
            background-color: #3b7a57; /* Green when checked */
            border-color: #3b7a57;
        }

        /* Make sure this gets applied to the modal */
        .modal-content #projectsList .list-group-item {
            background-color: #343a40;
            color: #ffffff;
        }

        .dropdown-menu.border-white {
            border: 1px solid white !important; /* Makes border thicker and ensures it overrides other styles */
            border-radius: 2px;                 /* Slightly rounded corners */
            box-shadow: 0 0 3px rgba(255,255,255,0.3); /* Optional: adds a subtle glow effect */
        }
    </style>
</head>
<body>
<!-- Loading Spinner -->
<div id="loadingSpinner">
    <div class="spinner-border text-light" role="status">
        <span class="visually-hidden">Loading...</span>
    </div>
</div>

<div class="d-flex">
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="admin-title">Works Admin</div>

        <a href="mainAdmin.php" class="btn btn-outline-light btn-sm w-100 mb-3">
            <i class="fas fa-arrow-left"></i> Main Admin
        </a>

        <button class="btn btn-light w-100 mb-4" id="addNewWorkBtn">
            <i class="fas fa-plus"></i> Add New Work
        </button>

        <div class="section-title">View Options</div>
        <nav class="nav flex-column mb-4">
            <a class="nav-link active" href="#" id="viewSelectWorks">
                <i class="fas fa-star"></i> Select Works
            </a>
            <a class="nav-link" href="#" id="viewUnselectedWorks">
                <i class="fas fa-images"></i> Unselected Works
            </a>
            <a class="nav-link" href="#" id="viewDeletedWorks">
                <i class="fas fa-trash"></i> Deleted Works
            </a>
            <a class="nav-link" href="#" id="viewCarouselWorks">
                <i class="fas fa-film"></i> Carousel Works
            </a>
        </nav>

        <div class="section-title">Statistics</div>
        <div class="stats-card d-flex align-items-center" id="totalWorksCard">
            <i class="fas fa-photo-film"></i>
            <div>
                <small>Total Works</small>
                <p class="count" id="totalWorksCount">0</p>
            </div>
        </div>

        <div class="stats-card d-flex align-items-center" id="selectWorksCard">
            <i class="fas fa-star"></i>
            <div>
                <small>Select Works</small>
                <p class="count" id="selectWorksCount">0</p>
            </div>
        </div>

        <div class="stats-card d-flex align-items-center" id="carouselWorksCard">
            <i class="fas fa-film"></i>
            <div>
                <small>In Carousel</small>
                <p class="count" id="carouselWorksCount">0</p>
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="content-area">
        <div class="main-content">

            <div class="d-flex justify-content-between align-items-center mb-4">
                <h1 class="h3">Works Administration</h1>
                <div class="d-flex">
                    <div class="dropdown">
                        <button class="btn btn-outline-secondary dropdown-toggle border border-white" type="button" id="sortDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-sort"></i> Sort
                        </button>
                        <ul class="dropdown-menu border border-white" aria-labelledby="sortDropdown">
                            <li><a class="dropdown-item sort-option" data-sort="name-asc" href="#">Name (A-Z)</a></li>
                            <li><a class="dropdown-item sort-option" data-sort="name-desc" href="#">Name (Z-A)</a></li>
                            <li><a class="dropdown-item sort-option" data-sort="upload-newest" href="#">Latest Uploads</a></li>
                            <li><a class="dropdown-item sort-option" data-sort="upload-oldest" href="#">Oldest Uploads</a></li>
                            <li><a class="dropdown-item sort-option" data-sort="order-desc" href="#">Display Order (High-Low)</a></li>
                            <li><a class="dropdown-item sort-option" data-sort="order-asc" href="#">Display Order (Low-High)</a></li>
                            <li><a class="dropdown-item sort-option" data-sort="newest" href="#">Year (Newest)</a></li>
                            <li><a class="dropdown-item sort-option" data-sort="oldest" href="#">Year (Oldest)</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Multi-select toolbar -->
            <div class="multi-select-toolbar mb-3" id="multiSelectToolbar">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-primary" id="selectedItemsCount">0 selected</span>
                        <button class="btn btn-sm btn-outline-secondary ms-2" id="selectAllBtn">Select All</button>
                        <button class="btn btn-sm btn-outline-secondary ms-2" id="clearSelectionBtn">Clear</button>
                    </div>
                    <div>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-success" id="batchSelectWorksBtn" title="Add to Select Works">
                                <i class="fas fa-star"></i>
                            </button>
                            <button class="btn btn-sm btn-info" id="batchCarouselBtn" title="Add to Carousel">
                                <i class="fas fa-film"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" id="batchDeleteBtn" title="Delete Selected">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="search-and-filters mb-4">
                <div class="row">
                    <div class="col-md-4 mb-3">
                        <div class="input-group">
                            <span class="input-group-text"><i class="fas fa-search"></i></span>
                            <input type="text" class="form-control" id="searchInput" placeholder="Search by name, medium, description...">
                        </div>
                    </div>
                    <div class="col-md-4 mb-3">
                        <select class="form-select" id="mediumFilter">
                            <option value="">All Mediums</option>
                            <option value="Fixed Motion">Fixed Motion</option>
                            <option value="Tape Diaries">Tape Diaries</option>
                            <option value="Force">Force</option>
                            <option value="Drip">Drip</option>
                            <option value="Where is my mind?">Where is my mind?</option>
                            <option value="Portraits">Portraits</option>
                            <option value="Leaves / Petals">Leaves / Petals</option>
                            <option value="Illustration">Illustration</option>
                            <option value="Mise en scene">Mise en scene</option>
                            <option value="Paris">Paris</option>
                            <option value="In conversation with a flower">In conversation with a flower</option>
                            <option value="Recyclart">Recyclart</option>
                            <option value="Bio">Bio</option>
                            <option value="Contact">Contact</option>
                            <option value="CV">CV</option>
                        </select>
                    </div>
                    <div class="col-md-4 mb-3">
                        <select class="form-select" id="projectsDropdown">
                            <option value="" selected disabled>Select a Project</option>
                        </select>
                    </div>
                </div>

                <div class="filter-tags mt-2">
                    <div class="filter-tag active" data-filter="all">All</div>
                    <div class="filter-tag" data-filter="select-works">Select Works</div>
                    <div class="filter-tag" data-filter="carousel">Carousel</div>
                    <div class="filter-tag" data-filter="color">Color</div>
                    <div class="filter-tag" data-filter="bw">Black & White</div>
                    <div class="filter-tag" data-filter="available">Available</div>
                </div>

                <div class="d-flex justify-content-between align-items-center mt-3">
                    <p class="mb-0 text-muted" id="resultsInfo">Showing all works</p>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="enableMultiSelect">
                        <label class="form-check-label" for="enableMultiSelect">Multi-select</label>
                    </div>
                </div>
            </div>

            <!-- Works grid -->
            <div class="row" id="worksContainer">
                <!-- Works will be loaded here dynamically -->
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2 text-muted">Loading works...</p>
                </div>
            </div>

            <!-- Empty state -->
            <div id="emptyState" class="text-center py-5" style="display: none;">
                <i class="fas fa-image fa-3x text-muted mb-3"></i>
                <h3 class="h5">No Works Found</h3>
                <p class="text-muted">Try adjusting your filters or search criteria</p>
            </div>
        </div>
    </div>
</div>

<!-- Edit Photo Modal -->
<div class="modal fade" id="photoUpdateModal" tabindex="-1" aria-labelledby="photoModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="photoModalLabel">Edit Work</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-4 text-center mb-3 mb-md-0">
                        <img id="previewImage" class="img-fluid rounded mb-2" src="" alt="Preview">
                        <div class="d-flex justify-content-center gap-1 flex-wrap">
                            <span class="badge bg-secondary" id="workIdBadge"></span>
                            <span class="badge badge-color text-white" id="colorBadge" style="display: none;">Color</span>
                            <span class="badge badge-bw text-white" id="bwBadge" style="display: none;">B&W</span>
                            <span class="badge badge-select-works text-white" id="selectWorksBadge" style="display: none;">Select Works</span>
                            <span class="badge badge-carousel text-white" id="carouselBadge" style="display: none;">Carousel</span>
                            <span class="badge badge-available text-white" id="availableBadge" style="display: none;">Available</span>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <!-- Tabs Navigation -->
                        <ul class="nav nav-tabs mb-3" id="workDetailsTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="details-tab" data-bs-toggle="tab" data-bs-target="#details-pane" type="button" role="tab" aria-controls="details-pane" aria-selected="true">Work Details</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="projects-tab" data-bs-toggle="tab" data-bs-target="#projects-pane" type="button" role="tab" aria-controls="projects-pane" aria-selected="false">Associated Projects</button>
                            </li>
                        </ul>

                        <!-- Tab Content -->
                        <div class="tab-content" id="workDetailsTabContent">
                            <!-- Work Details Tab -->
                            <div class="tab-pane fade show active" id="details-pane" role="tabpanel" aria-labelledby="details-tab">
                                <form id="updateWorkForm">
                                    <input type="hidden" id="photoId">

                                    <div class="mb-3">
                                        <label for="photoName" class="form-label">Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="photoName" required>
                                    </div>

                                    <div class="mb-3">
                                        <label for="photoMedium" class="form-label">Medium</label>
                                        <select class="form-select" id="photoMedium">
                                            <option value="Fixed Motion">Fixed Motion</option>
                                            <option value="Tape Diaries">Tape Diaries</option>
                                            <option value="Force">Force</option>
                                            <option value="Drip">Drip</option>
                                            <option value="Where is my mind?">Where is my mind?</option>
                                            <option value="Portraits">Portraits</option>
                                            <option value="Leaves / Petals">Leaves / Petals</option>
                                            <option value="Illustration">Illustration</option>
                                            <option value="Mise en scene">Mise en scene</option>
                                            <option value="Paris">Paris</option>
                                            <option value="In conversation with a flower">In conversation with a flower</option>
                                            <option value="Recyclart">Recyclart</option>
                                            <option value="Bio">Bio</option>
                                            <option value="Contact">Contact</option>
                                            <option value="CV">CV</option>
                                        </select>
                                    </div>

                                    <div class="mb-3">
                                        <label for="photoFirstDescription" class="form-label">Materials Description</label>
                                        <textarea class="form-control" id="photoFirstDescription" rows="2"></textarea>
                                    </div>

                                    <div class="mb-3">
                                        <label for="photoLongDescription" class="form-label">Long Description</label>
                                        <textarea class="form-control" id="photoLongDescription" rows="3"></textarea>
                                    </div>

                                    <div class="mb-3">
                                        <label for="photoSecondDescription" class="form-label">Optional Description (not displayed publicly)</label>
                                        <input type="text" class="form-control" id="photoSecondDescription">
                                    </div>

                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="photoCreationYear" class="form-label">Creation Year <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" id="photoCreationYear" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="updateOrderOfDisplay" class="form-label">Display Order</label>
                                                <input type="number" class="form-control" id="updateOrderOfDisplay">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label d-block">Image Type</label>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isColorEdit" id="colorYesEdit" value="true">
                                                    <label class="form-check-label" for="colorYesEdit">Color</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isColorEdit" id="colorNoEdit" value="false">
                                                    <label class="form-check-label" for="colorNoEdit">Black & White</label>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label d-block">Availability</label>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isAvailableEdit" id="availableYesEdit" value="true">
                                                    <label class="form-check-label" for="availableYesEdit">Available</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isAvailableEdit" id="availableNoEdit" value="false">
                                                    <label class="form-check-label" for="availableNoEdit">Unavailable</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label d-block">Select Works</label>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isSelectWorksEdit" id="selectWorksYesEdit" value="true">
                                                    <label class="form-check-label" for="selectWorksYesEdit">Include</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isSelectWorksEdit" id="selectWorksNoEdit" value="false">
                                                    <label class="form-check-label" for="selectWorksNoEdit">Don't include</label>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label d-block">Carousel</label>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isCarouselEdit" id="carouselYesEdit" value="true">
                                                    <label class="form-check-label" for="carouselYesEdit">Include</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isCarouselEdit" id="carouselNoEdit" value="false">
                                                    <label class="form-check-label" for="carouselNoEdit">Don't include</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <!-- Associated Projects Tab -->
                            <div class="tab-pane fade" id="projects-pane" role="tabpanel" aria-labelledby="projects-tab">
                                <div class="project-search-container mb-3 position-relative">
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="fas fa-search"></i></span>
                                        <input type="text" class="form-control" id="projectSearch" placeholder="Search projects...">
                                    </div>
                                </div>

                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" id="selectAllProjects">
                                    <label class="form-check-label" for="selectAllProjects">
                                        Select All Projects
                                    </label>
                                </div>

                                <div class="projects-container">
                                    <ul id="projectsList" class="list-group" style="max-height: 350px; overflow-y: auto;">
                                        <li class="list-group-item text-center py-4">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Loading projects...</span>
                                            </div>
                                            <p class="mt-2 text-muted">Loading projects...</p>
                                        </li>
                                    </ul>
                                </div>

                                <div class="d-flex justify-content-end mt-3">
                                    <button type="button" class="btn btn-primary" id="saveProjectAssociations">
                                        <i class="fas fa-save me-1"></i> Save Project Associations
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <div id="deleteOrRestore">
                    <button type="button" class="btn btn-danger" id="deleteWorkBtn">
                        <i class="fas fa-trash me-1"></i> Delete
                    </button>
                </div>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="updateWorkBtn">
                    <i class="fas fa-save me-1"></i> Save Changes
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Add New Photo Modal -->
<div class="modal fade" id="photoPostModal" tabindex="-1" aria-labelledby="photoPostModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="photoPostModalLabel">Add New Work</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-md-4 text-center mb-3 mb-md-0">
                        <div class="upload-preview-container">
                            <img id="uploadPreview" class="img-fluid rounded mb-3" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMThweCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTk5OTkiPlNlbGVjdCBJbWFnZTwvdGV4dD48L3N2Zz4=" alt="Upload Preview">
                            <div class="mb-3">
                                <label for="photoPostUpload" class="form-label">Select Image</label>
                                <input class="form-control" type="file" accept="image/*,.heic,.heif" name="photoPostUpload" id="photoPostUpload">
                                <div class="form-text">Any photo works. Large ones are resized automatically.</div>
                                <div class="form-text" id="uploadPrepNote"></div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-8">
                        <!-- Tabs Navigation -->
                        <ul class="nav nav-tabs mb-3" id="workCreateTabs" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active" id="create-details-tab" data-bs-toggle="tab" data-bs-target="#create-details-pane" type="button" role="tab" aria-controls="create-details-pane" aria-selected="true">Work Details</button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link" id="create-projects-tab" data-bs-toggle="tab" data-bs-target="#create-projects-pane" type="button" role="tab" aria-controls="create-projects-pane" aria-selected="false">Associated Projects</button>
                            </li>
                        </ul>

                        <!-- Tab Content -->
                        <div class="tab-content" id="workCreateTabContent">
                            <!-- Work Details Tab -->
                            <div class="tab-pane fade show active" id="create-details-pane" role="tabpanel" aria-labelledby="create-details-tab">
                                <form id="addWorkForm">
                                    <div class="mb-3">
                                        <label for="photoPostName" class="form-label">Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="photoPostName" required>
                                    </div>

                                    <div class="mb-3">
                                        <label for="photoPostMedium" class="form-label">Medium</label>
                                        <select class="form-select" id="photoPostMedium">
                                            <option value="Fixed Motion">Fixed Motion</option>
                                            <option value="Tape Diaries">Tape Diaries</option>
                                            <option value="Force">Force</option>
                                            <option value="Drip">Drip</option>
                                            <option value="Where is my mind?">Where is my mind?</option>
                                            <option value="Portraits">Portraits</option>
                                            <option value="Leaves / Petals">Leaves / Petals</option>
                                            <option value="Illustration">Illustration</option>
                                            <option value="Mise en scene">Mise en scene</option>
                                            <option value="Paris">Paris</option>
                                            <option value="In conversation with a flower">In conversation with a flower</option>
                                            <option value="Recyclart">Recyclart</option>
                                            <option value="Bio">Bio</option>
                                            <option value="Contact">Contact</option>
                                            <option value="CV">CV</option>
                                        </select>
                                    </div>

                                    <div class="mb-3">
                                        <label for="photoPostFirstDescription" class="form-label">Materials Description</label>
                                        <textarea class="form-control" id="photoPostFirstDescription" rows="2"></textarea>
                                    </div>

                                    <div class="mb-3">
                                        <label for="photoPostLongDescription" class="form-label">Long Description</label>
                                        <textarea class="form-control" id="photoPostLongDescription" rows="3"></textarea>
                                    </div>

                                    <div class="mb-3">
                                        <label for="photoPostSecondDescription" class="form-label">Optional Description (not displayed publicly)</label>
                                        <input type="text" class="form-control" id="photoPostSecondDescription">
                                    </div>

                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="photoPostCreationYear" class="form-label">Creation Year <span class="text-danger">*</span></label>
                                                <input type="text" class="form-control" id="photoPostCreationYear" required>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label for="postOrderOfDisplay" class="form-label">Display Order</label>
                                                <input type="number" class="form-control" id="postOrderOfDisplay">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label d-block">Image Type</label>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isColorPost" id="colorYesPost" value="true" checked>
                                                    <label class="form-check-label" for="colorYesPost">Color</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isColorPost" id="colorNoPost" value="false">
                                                    <label class="form-check-label" for="colorNoPost">Black & White</label>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label d-block">Availability</label>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isAvailablePost" id="availableYesPost" value="true" checked>
                                                    <label class="form-check-label" for="availableYesPost">Available</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isAvailablePost" id="availableNoPost" value="false">
                                                    <label class="form-check-label" for="availableNoPost">Unavailable</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label d-block">Select Works</label>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isSelectWorksPost" id="selectWorksYesPost" value="true">
                                                    <label class="form-check-label" for="selectWorksYesPost">Include</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isSelectWorksPost" id="selectWorksNoPost" value="false" checked>
                                                    <label class="form-check-label" for="selectWorksNoPost">Don't include</label>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label d-block">Carousel</label>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isCarouselPost" id="carouselYesPost" value="true">
                                                    <label class="form-check-label" for="carouselYesPost">Include</label>
                                                </div>
                                                <div class="form-check form-check-inline">
                                                    <input class="form-check-input" type="radio" name="isCarouselPost" id="carouselNoPost" value="false" checked>
                                                    <label class="form-check-label" for="carouselNoPost">Don't include</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <!-- Associated Projects Tab -->
                            <div class="tab-pane fade" id="create-projects-pane" role="tabpanel" aria-labelledby="create-projects-tab">
                                <div class="project-search-container mb-3 position-relative">
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="fas fa-search"></i></span>
                                        <input type="text" class="form-control" id="createProjectSearch" placeholder="Search projects...">
                                    </div>
                                </div>

                                <div class="form-check mb-3">
                                    <input class="form-check-input" type="checkbox" id="createSelectAllProjects">
                                    <label class="form-check-label" for="createSelectAllProjects" style="color: #ffffff;">
                                        Select All Projects
                                    </label>
                                </div>

                                <div class="projects-container">
                                    <ul id="createProjectsList" class="list-group" style="max-height: 350px; overflow-y: auto; background-color: #2c3e50; border: 1px solid #495057; border-radius: 8px;">
                                        <li class="list-group-item text-center" style="background-color: #343a40; color: #ffffff; border-color: #495057;">
                                            <p class="text-muted" style="color: #a8c7e0 !important;">Click the "Associated Projects" tab to load projects</p>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="uploadWorkButton">
                    <i class="fas fa-upload me-1"></i> Upload Work
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Confirmation Modal -->
<div class="modal fade" id="confirmationModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-sm">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="confirmationTitle">Confirm Action</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="confirmationMessage">
                Are you sure you want to perform this action?
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-danger" id="confirmActionBtn">Confirm</button>
            </div>
        </div>
    </div>
</div>

<!-- Toast container -->
<div class="toast-container"></div>

<!-- Custom JS -->
<script src="../js/imagePrep.js"></script>
<script src="../js/photoAdminFunctions.js"></script>

<script>
    document.addEventListener("DOMContentLoaded", function() {
        // Initialize the page with Select Works
        getAllWorks('Select Works');
    });
</script>
<script src="../js/adminSession.js"></script>
</body>
</html>