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
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css">
    <link rel="stylesheet" href="admin.css?v=<?php echo filemtime(__DIR__ . '/admin.css'); ?>">
    <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
    <title>About Me Admin Page</title>
    <style>
        /* Only what is particular to the About page; the panel, fields,
           buttons and colours come from admin.css */
        .content-box {
            background-color: var(--amb-sidebar);
            border: 1px solid var(--amb-line);
            border-radius: var(--amb-radius-sm);
            padding: 20px;
            min-height: 100px;
        }

        .img-preview-container {
            position: relative;
            overflow: hidden;
            border-radius: var(--amb-radius-sm);
            border: 1px solid var(--amb-line);
            background-color: var(--amb-sidebar);
            margin-bottom: 12px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 300px;
        }

        .img-preview-container img {
            max-width: 100%;
            max-height: 400px;
            object-fit: contain;
        }

        textarea.form-control {
            min-height: 200px;
            resize: vertical;
        }

        .image-filename {
            font-size: 0.9rem;
            color: var(--amb-muted);
            margin-top: 5px;
        }

        .custom-toast {
            min-width: 250px;
        }

        .preview-section {
            margin-top: 20px;
        }

        .preview-title {
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.1rem;
            color: var(--amb-highlight);
            font-weight: 500;
            margin-bottom: 10px;
        }

        .no-image-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: var(--amb-muted);
            font-size: 1.1rem;
            height: 300px;
        }

        .no-image-placeholder i {
            font-size: 3.5rem;
            margin-bottom: 15px;
        }

        .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            padding-top: 20px;
            border-top: 1px solid var(--amb-line);
        }

        @media (max-width: 767.98px) {
            .form-actions .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
<?php $ambAdminPage = 'about'; include __DIR__ . '/adminNav.php'; ?>

<div class="content-area is-narrow">
    <div class="main-content">
        <div class="page-title-row">
            <div>
                <h1 class="h3">About Administration</h1>
                <p class="page-subtitle">The photo and words on your About page.</p>
            </div>
            <a href="/about" target="_blank" rel="noopener" class="btn btn-outline-light">
                <i class="fas fa-arrow-up-right-from-square mr-1"></i> See it on your site
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
                        <div class="form-group">
                            <label for="aboutMePhoto">Select New Photo (Optional)</label>
                            <div class="custom-file">
                                <input type="file" class="custom-file-input" id="aboutMePhoto" accept="image/*,.heic,.heif" onchange="previewNewPhoto(this)">
                                <label class="custom-file-label" for="aboutMePhoto">Choose file...</label>
                            </div>
                        </div>

                        <div class="img-preview-container mt-3" id="newPhotoPreview" style="display: none;">
                            <!-- New photo preview will be shown here -->
                        </div>

                        <div class="d-flex justify-content-end mt-3">
                            <button type="button" class="btn btn-secondary" id="cancelPhotoButton" style="display: none;">
                                <i class="fas fa-times mr-1"></i> Cancel Photo
                            </button>
                        </div>
                    </div>

                    <!-- Description Section -->
                    <div class="col-md-7">
                        <h3 class="preview-title">Description</h3>
                        <div class="form-group">
                            <label for="aboutMeText" class="sr-only">Description</label>
                            <textarea id="aboutMeText" class="form-control" rows="10" placeholder="Enter your 'About Me' text here..." required></textarea>
                        </div>

                        <div class="preview-section" id="textPreviewSection" style="display: none;">
                            <h4 class="preview-title"><i class="fas fa-eye mr-2"></i> Preview</h4>
                            <div id="textPreview" class="content-box"></div>
                        </div>

                        <div class="mt-3">
                            <button type="button" class="btn btn-outline-light" id="previewTextButton">
                                <i class="fas fa-eye mr-1"></i> Preview Text
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Submit Button -->
                <div class="form-actions mt-4">
                    <button type="submit" class="btn btn-primary btn-lg" id="updateAboutMeButton">
                        <i class="fas fa-save mr-2"></i> Update About Me
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js" integrity="sha384-ZvpUoO/+PpLXR1lu4jmpXWu80pZlYUAfxl5NsBMWOEPSjUn/6Z/hRTt8+pR6L4N2" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.16.1/umd/popper.min.js" integrity="sha384-9/reFTGAW83EW2RDu2S0VKaIzap3H66lZH81PoYlFhbGU+6BZp6G7niu735Sk7lN" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/js/bootstrap.min.js" integrity="sha384-+sLIOodYLS7CIrQpBjl+C7nPvqq+FbNUBDunl/OZv93DB7Ln/533i8e/mZXLi/P+" crossorigin="anonymous"></script>
<script src="../js/imagePrep.js?v=<?php echo filemtime(__DIR__ . '/../js/imagePrep.js'); ?>"></script>
<script src="../js/aboutMe.js"></script>

<script src="../js/adminSession.js"></script>
</body>
</html>
