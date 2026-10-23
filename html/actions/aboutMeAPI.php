<?php
global $conn;
session_start();
include '../database/pdo.php';
include_once __DIR__ . '/adminAuth.php';

// Handle GET request - no authentication required
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Fetch the most recent entry
    $stmt = $conn->prepare("SELECT * FROM aboutMe ORDER BY id DESC LIMIT 1");
    $stmt->execute();
    $mostRecentEntry = $stmt->fetch();

    // Output the most recent entry as JSON
    header('Content-Type: application/json');
    echo json_encode($mostRecentEntry);
    exit;
}

// For POST requests, check authentication
requireAdminApi();

// Handle POST request for About Me updates
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validate required description
    if (!isset($_POST['description']) || trim($_POST['description']) === '') {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Description is required']);
        exit;
    }

    $description = $_POST['description'];
    $dbPath = null;

    // Check if a new photo was uploaded
    if (isset($_FILES['photo']) && !empty($_FILES['photo']['name'])) {
        $uploadDir = '../baseImages/';

        // Create directory if it doesn't exist
        if (!file_exists($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                http_response_code(500);
                echo json_encode(['status' => 'error', 'message' => 'Failed to create upload directory']);
                exit;
            }
        }

        $file = $_FILES['photo'];

        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file['type'], $allowedTypes)) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid file type. Only JPG, PNG, GIF and WEBP are allowed.']);
            exit;
        }

        // Generate a unique filename to prevent overwriting
        $filename = time() . '_' . basename($file['name']);
        $targetPath = $uploadDir . $filename;

        // Move uploaded file to target directory
        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            // Database path should be relative to the root
            $dbPath = 'baseImages/' . $filename;
        } else {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to upload file: ' . error_get_last()['message']]);
            exit;
        }
    } else if (isset($_POST['currentPictureLocation']) && !empty($_POST['currentPictureLocation'])) {
        // Use the existing photo location
        $dbPath = $_POST['currentPictureLocation'];
    } else {
        // No picture provided at all
        $dbPath = 'unavailable';
    }

    try {
        // Start transaction
        $conn->beginTransaction();

        // Insert new record with description and photo location (if available)
        $stmt = $conn->prepare("INSERT INTO aboutMe (description, pictureLocation) VALUES (?, ?)");
        $stmt->execute([$description, $dbPath]);

        // Commit the transaction
        $conn->commit();

        // Return success response
        header('Content-Type: application/json');
        echo json_encode([
            'status' => 'success',
            'message' => 'About Me information updated successfully',
            'data' => [
                'description' => $description,
                'pictureLocation' => $dbPath
            ]
        ]);
    } catch (PDOException $e) {
        // Rollback the transaction in case of error
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }

        // Log the error for server-side debugging
        error_log('Database error in aboutMeAPI.php: ' . $e->getMessage());

        // Send error response
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

// If not a valid request
http_response_code(400);
echo json_encode(['status' => 'error', 'message' => 'Invalid request']);