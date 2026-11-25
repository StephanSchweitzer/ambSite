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
    <?php $ambPageTitle = 'Works Administration'; include __DIR__ . '/adminHead.php'; ?>
</head>
<body class="page-works">
<?php $ambAdminPage = 'works'; include __DIR__ . '/adminNav.php'; ?>

<!-- Loading Spinner -->
<div id="loadingSpinner">
    <div class="spinner-border text-light" role="status">
        <span class="visually-hidden">Loading...</span>
    </div>
</div>

<div class="d-flex admin-layout">
    <!-- Sidebar -->
    <div class="sidebar">
        <div class="admin-title">Works Admin</div>

        <div class="sidebar-actions">
            <button class="btn btn-light w-100 mb-4" id="addNewWorkBtn">
                <i class="fas fa-plus"></i> Add New Work
            </button>
        </div>

        <div class="section-title">View Options</div>
        <nav class="nav flex-column mb-4 view-options">
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
        <div class="stats-list">
        <div class="stats-card d-flex align-items-center" id="totalWorksCard" role="button" tabindex="0" title="Show all works">
            <i class="fas fa-photo-film"></i>
            <div>
                <small>Total Works</small>
                <p class="count" id="totalWorksCount">0</p>
            </div>
        </div>

        <div class="stats-card d-flex align-items-center" id="selectWorksCard" role="button" tabindex="0" title="Show Select Works">
            <i class="fas fa-star"></i>
            <div>
                <small>Select Works</small>
                <p class="count" id="selectWorksCount">0</p>
            </div>
        </div>

        <div class="stats-card d-flex align-items-center" id="carouselWorksCard" role="button" tabindex="0" title="Show works in the carousel">
            <i class="fas fa-film"></i>
            <div>
                <small>In Carousel</small>
                <p class="count" id="carouselWorksCount">0</p>
            </div>
        </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="content-area">
        <div class="main-content">

            <div class="page-title-row">
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
                                    <ul id="projectsList" class="list-group">
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
                                    <label class="form-check-label"for="createSelectAllProjects">
                                        Select All Projects
                                    </label>
                                </div>

                                <div class="projects-container">
                                    <ul id="createProjectsList" class="list-group">
                                        <li class="list-group-item text-center">
                                            <p class="text-muted mb-0">Click the "Associated Projects" tab to load projects</p>
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
<script src="../js/imagePrep.js?v=<?php echo filemtime(__DIR__ . '/../js/imagePrep.js'); ?>"></script>
<script src="../js/photoAdminFunctions.js?v=<?php echo filemtime(__DIR__ . '/../js/photoAdminFunctions.js'); ?>"></script>

<script>
    document.addEventListener("DOMContentLoaded", function() {
        // Initialize the page with Select Works
        getAllWorks('Select Works');
    });
</script>
</body>
</html>