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
    <?php $ambPageTitle = 'About Administration'; include __DIR__ . '/adminHead.php'; ?>
</head>
<body class="page-about">
<?php $ambAdminPage = 'about'; include __DIR__ . '/adminNav.php'; ?>

<div class="content-area is-narrow">
    <div class="main-content">
        <div class="page-title-row">
            <div>
                <h1 class="h3">About Administration</h1>
                <p class="page-subtitle">The photo and words on your About page.</p>
            </div>
            <a href="/about" target="_blank" rel="noopener" class="btn btn-outline-light">
                <i class="fas fa-arrow-up-right-from-square me-1"></i> See it on your site
            </a>
        </div>

        <!-- Toast container for notifications -->
        <div class="toast-container"></div>

        <!-- Current About Me Preview Section -->
        <div class="panel-box">
            <h2 class="panel-box-title"><i class="fas fa-eye"></i> Current About Me</h2>
            <div class="row">
                <div class="col-md-5">
                    <h3 class="preview-title">Current Photo</h3>
                    <div class="img-preview-container" id="currentPhotoContainer">
                        <div id="currentAboutMePicture" class="text-center">
                            <!-- Current photo will be loaded here -->
                            <div class="no-image-placeholder">
                                <i class="fas fa-image"></i>
                                <p>No image currently set</p>
                            </div>
                        </div>
                    </div>
                    <div id="currentPhotoFilename" class="image-filename text-center"></div>
                </div>
                <div class="col-md-7">
                    <h3 class="preview-title">Current Description</h3>
                    <div class="content-box">
                        <div id="currentAboutMe">
                            <!-- Current about me text will be loaded here -->
                            <div class="text-muted">Loading current content...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Update About Me Section (Unified) -->
        <div class="panel-box mb-0">
            <h2 class="panel-box-title"><i class="fas fa-edit"></i> Update About Me</h2>
            <form id="updateAboutMeForm">
                <div class="row">
                    <!-- Photo Section -->
                    <div class="col-md-5 mb-3 mb-md-0">
                        <h3 class="preview-title">Photo</h3>
                        <div class="mb-3">
                            <label class="form-label" for="aboutMePhoto">Select New Photo (Optional)</label>
                            <input type="file" class="form-control" id="aboutMePhoto" accept="image/*,.heic,.heif" onchange="previewNewPhoto(this)">
                        </div>

                        <div class="img-preview-container mt-3" id="newPhotoPreview" style="display: none;">
                            <!-- New photo preview will be shown here -->
                        </div>

                        <div class="d-flex justify-content-end mt-3">
                            <button type="button" class="btn btn-secondary" id="cancelPhotoButton" style="display: none;">
                                <i class="fas fa-times me-1"></i> Cancel Photo
                            </button>
                        </div>
                    </div>

                    <!-- Description Section -->
                    <div class="col-md-7">
                        <h3 class="preview-title">Description</h3>
                        <div class="mb-3">
                            <label for="aboutMeText" class="visually-hidden">Description</label>
                            <textarea id="aboutMeText" class="form-control" rows="10" placeholder="Enter your 'About Me' text here..." required></textarea>
                        </div>

                        <div class="preview-section" id="textPreviewSection" style="display: none;">
                            <h4 class="preview-title"><i class="fas fa-eye me-2"></i> Preview</h4>
                            <div id="textPreview" class="content-box"></div>
                        </div>

                        <div class="mt-3">
                            <button type="button" class="btn btn-outline-light" id="previewTextButton">
                                <i class="fas fa-eye me-1"></i> Preview Text
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Submit Button -->
                <div class="form-actions mt-4">
                    <button type="submit" class="btn btn-primary btn-lg" id="updateAboutMeButton">
                        <i class="fas fa-save me-2"></i> Update About Me
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="../js/imagePrep.js?v=<?php echo filemtime(__DIR__ . '/../js/imagePrep.js'); ?>"></script>
<script src="../js/aboutMe.js?v=<?php echo filemtime(__DIR__ . '/../js/aboutMe.js'); ?>"></script>
</body>
</html>
