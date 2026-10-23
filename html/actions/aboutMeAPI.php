<?php
global $conn;
include_once __DIR__ . '/../database/session.php';
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

    if (isset($_FILES['photo']) && !empty($_FILES['photo']['name'])) {
        // A new photo. It goes through the same steps as artwork uploads:
        // decoded and re-saved as a JPEG under a name chosen here, so
        // whatever the file was called or claimed to be, only a real
        // picture with a .jpeg name ever lands in the public folder.
        include_once __DIR__ . '/imageManipulationFunctions.php';

        $uploadDir = '../baseImages/';
        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Failed to create upload directory']);
            exit;
        }

        $file = $_FILES['photo'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'The picture did not arrive. Please try again.']);
            exit;
        }

        $filename = 'about-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.jpeg';
        try {
            convertToProgressiveJPEGAndUpload($file['tmp_name'], $uploadDir . $filename);
        } catch (Throwable $e) {
            @unlink($uploadDir . $filename);
            http_response_code(415);
            echo json_encode(['status' => 'error', 'message' => 'This picture could not be read. Please use a JPEG, PNG or GIF.']);
            exit;
        }

        // The page shows the web-sized copy, made on first view by webImage.php
        $dbPath = 'baseImages/web/' . $filename;
    } else {
        // No new photo: keep the one currently shown. Read from the
        // database, not from the page, so the path can't be made up.
        $current = $conn->query("SELECT pictureLocation FROM aboutMe ORDER BY id DESC LIMIT 1")->fetchColumn();
        $dbPath = $current ?: 'unavailable';
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