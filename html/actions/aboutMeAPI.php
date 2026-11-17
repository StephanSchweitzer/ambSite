<?php
global $conn;
include_once __DIR__ . '/aboutMeCache.php';

// Reading the About content: public, and answered from the cached copy
// (aboutMeCache.php) whenever there is one, without touching the database or
// starting a sign-in session (which would tell browsers never to keep it).
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    include __DIR__ . '/../database/env.php';
    $cache = ambReadAboutCache();
    if ($cache === null) {
        $pdoSoftFail = true;
        include __DIR__ . '/../database/pdo.php';
        $cache = ambRefreshAboutCache($conn);
    }
    if ($cache === null) {
        http_response_code(500);
        header('Content-Type: application/json');
        header('Cache-Control: no-store');
        echo json_encode(array('status' => 'error', 'message' => 'The About information could not be loaded.'));
        exit;
    }

    // Asked for by its current version (?v=...): browsers keep it a week, and
    // a change gets a new version, so no one is left with the old text.
    // Asked for without one (the admin page), browsers check every time but
    // get a tiny "unchanged" answer when it is.
    $etag = '"about-' . $cache['version'] . '"';
    header('Content-Type: application/json');
    header('ETag: ' . $etag);
    if (isset($_GET['v']) && $_GET['v'] === $cache['version']) {
        header('Cache-Control: public, max-age=604800');
    } else {
        header('Cache-Control: no-cache');
    }

    // Apache adds "-gzip" to the tag when it compresses the reply, so the
    // browser sends it back that way
    $sent = isset($_SERVER['HTTP_IF_NONE_MATCH']) ? explode(',', $_SERVER['HTTP_IF_NONE_MATCH']) : array();
    foreach ($sent as $tag) {
        $tag = preg_replace('#^W/#', '', trim($tag));
        $tag = preg_replace('#-(gzip|br|deflate)"$#', '"', $tag);
        if ($tag === $etag || $tag === '*') {
            http_response_code(304);
            exit;
        }
    }

    // false when nothing has been saved yet, as the page expects
    echo json_encode($cache['about'] ?: false, JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

include_once __DIR__ . '/../database/session.php';
include '../database/pdo.php';
include_once __DIR__ . '/adminAuth.php';

// Saving needs the admin to be signed in
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

        $tooLarge = uploadTooLargeMessage($file['tmp_name']);
        if ($tooLarge !== null) {
            http_response_code(413);
            echo json_encode(['status' => 'error', 'message' => $tooLarge]);
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

        // Visitors see the new text and photo straight away
        ambRefreshAboutCache($conn);

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