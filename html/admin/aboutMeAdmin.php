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
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
    <title>About Me Admin Page</title>
    <style>
        body {
            background-color: #2c3e50;
            color: #ecf0f1;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .admin-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .card {
            background-color: #34495e;
            border: none;
            border-radius: 10px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            margin-bottom: 30px;
            overflow: hidden;
        }

        .card-header {
            background-color: #2980b9;
            color: white;
            font-weight: bold;
            border-bottom: none;
        }

        .content-box {
            background-color: #34495e;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            min-height: 100px;
        }

        .img-preview-container {
            position: relative;
            overflow: hidden;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            background-color: #2c3e50;
            margin-bottom: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 300px;
        }

        .img-preview-container img {
            max-width: 100%;
            max-height: 400px;
            object-fit: contain;
            transition: transform 0.3s ease;
        }

        .img-preview-container:hover img {
            transform: scale(1.03);
        }

        .custom-file-label {
            background-color: #34495e;
            color: #ecf0f1;
            border: 1px solid #7f8c8d;
        }

        .custom-file-label::after {
            background-color: #2980b9;
            color: white;
        }

        .btn-primary {
            background-color: #2980b9;
            border-color: #2980b9;
        }

        .btn-primary:hover {
            background-color: #3498db;
            border-color: #3498db;
        }

        .btn-info {
            background-color: #16a085;
            border-color: #16a085;
        }

        .btn-info:hover {
            background-color: #1abc9c;
            border-color: #1abc9c;
        }

        textarea {
            background-color: #34495e;
            color: #ecf0f1;
            border: 1px solid #7f8c8d;
            border-radius: 8px;
            min-height: 200px;
            resize: vertical;
        }

        textarea:focus {
            background-color: #2c3e50;
            color: #ecf0f1;
            border-color: #3498db;
            box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
        }

        .image-filename {
            font-size: 0.9rem;
            color: #bdc3c7;
            margin-top: 5px;
        }

        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        }

        .custom-toast {
            min-width: 250px;
        }

        .photo-actions {
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
        }

        .preview-section {
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
        }

        .preview-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #3498db;
        }

        .no-image-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #7f8c8d;
            font-size: 1.2rem;
            height: 300px;
        }

        .no-image-placeholder i {
            font-size: 4rem;
            margin-bottom: 15px;
        }

        .form-section {
            background-color: #2c3e50;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .divider {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin: 20px 0;
        }
    </style>
</head>
<body>

<div class="admin-container">
    <div class="container">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="display-4 text-white">About Me Admin</h1>
            <a href="mainAdmin.php" class="btn btn-info btn-lg">
                <i class="fas fa-arrow-left mr-2"></i> Main Admin Page
            </a>
        </div>

        <!-- Toast container for notifications -->
        <div class="toast-container"></div>

        <!-- Current About Me Preview Section -->
        <div class="card mb-4">
            <div class="card-header">
                <i class="fas fa-eye mr-2"></i> Current About Me Preview
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-5">
                        <h5 class="preview-title"><i class="fas fa-image mr-2"></i> Current Photo</h5>
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
                        <h5 class="preview-title"><i class="fas fa-file-alt mr-2"></i> Current Description</h5>
                        <div class="content-box">
                            <div id="currentAboutMe">
                                <!-- Current about me text will be loaded here -->
                                <div class="text-muted">Loading current content...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Update About Me Section (Unified) -->
        <div class="card">
            <div class="card-header">
                <i class="fas fa-edit mr-2"></i> Update About Me
            </div>
            <div class="card-body">
                <form id="updateAboutMeForm">
                    <div class="row">
                        <!-- Photo Section -->
                        <div class="col-md-5">
                            <div class="form-section">
                                <h5 class="mb-3"><i class="fas fa-camera mr-2"></i> Photo</h5>
                                <div class="form-group">
                                    <label for="aboutMePhoto">
                                        <i class="fas fa-upload mr-2"></i> Select New Photo (Optional)
                                    </label>
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
                        </div>

                        <!-- Description Section -->
                        <div class="col-md-7">
                            <div class="form-section">
                                <h5 class="mb-3"><i class="fas fa-paragraph mr-2"></i> Description</h5>
                                <div class="form-group">
                                    <textarea id="aboutMeText" class="form-control" rows="10" placeholder="Enter your 'About Me' text here..." required></textarea>
                                </div>

                                <div class="preview-section" id="textPreviewSection" style="display: none;">
                                    <h6 class="preview-title"><i class="fas fa-eye mr-2"></i> Preview</h6>
                                    <div id="textPreview" class="content-box"></div>
                                </div>

                                <div class="d-flex justify-content-between mt-3">
                                    <button type="button" class="btn btn-secondary" id="previewTextButton">
                                        <i class="fas fa-eye mr-1"></i> Preview Text
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <!-- Submit Button -->
                    <div class="d-flex justify-content-center mt-4">
                        <button type="submit" class="btn btn-primary btn-lg" id="updateAboutMeButton">
                            <i class="fas fa-save mr-2"></i> Update About Me
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.16.1/umd/popper.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.2/js/bootstrap.min.js"></script>
<script src="../js/imagePrep.js?v=<?php echo filemtime(__DIR__ . '/../js/imagePrep.js'); ?>"></script>
<script src="../js/aboutMe.js"></script>

<script src="../js/adminSession.js"></script>
</body>
</html>