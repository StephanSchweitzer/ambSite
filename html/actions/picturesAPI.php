<?php
global $conn;
include_once __DIR__ . '/../database/session.php';

include '../database/pdo.php';
include_once __DIR__ . '/adminAuth.php';
include 'imageManipulationFunctions.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $theYear = $_GET['theYear'] ?? '';

    // These views include hidden/trashed works and are only for the admin
    // pages. Everything else filters on visible = 1 and stays public.
    $adminOnlyViews = array('everything', 'invisible', 'stats', 'projectsAPI');
    if (in_array($theYear, $adminOnlyViews, true) && ($_SESSION["ambar"] ?? null) != "connected") {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(array('status' => 'error', 'message' => 'Unauthorized'));
        die;
    }

    // One canonical column list for every allWorks query below. Keeping it in a
    // single place means no branch can silently omit a column — the mismatch
    // that made $result[$i][13] undefined. Read back by name (FETCH_ASSOC), so
    // reordering the SELECT can't break the JSON either.
    $allWorksCols = "workId, fileLocation, name, desc2, desc3, medium, "
                  . "color, isAvailable, year, orderOfDisplay, carousel, "
                  . "isSelectWork, visible, long_description";

    // New statistics endpoint
    if ($theYear == 'stats') {
        try {
            // Get total works count
            $totalQuery = $conn->prepare("SELECT COUNT(*) FROM allWorks WHERE visible = 1");
            $totalQuery->execute();
            $totalCount = $totalQuery->fetchColumn();

            // Get select works count
            $selectWorksQuery = $conn->prepare("SELECT COUNT(*) FROM allWorks WHERE visible = 1 AND isSelectWork = 1");
            $selectWorksQuery->execute();
            $selectWorksCount = $selectWorksQuery->fetchColumn();

            // Get carousel works count
            $carouselQuery = $conn->prepare("SELECT COUNT(*) FROM allWorks WHERE visible = 1 AND carousel = 1");
            $carouselQuery->execute();
            $carouselCount = $carouselQuery->fetchColumn();

            // Return stats
            $stats = array(
                'total' => (int)$totalCount,
                'selectWorks' => (int)$selectWorksCount,
                'carousel' => (int)$carouselCount
            );

            header('Content-Type: application/json');
            echo json_encode(array('stats' => $stats));
        } catch (Exception $e) {
            header('Content-Type: application/json');
            echo json_encode(array('error' => $e->getMessage()));
        }
        die;
    }

    if ($theYear == 'everything') {
        $query = "SELECT $allWorksCols FROM allWorks
               ORDER BY orderOfDisplay DESC";

        $pictureQuery = $conn->prepare($query);
        $pictureQuery->execute();
        $result = $pictureQuery->fetchAll(PDO::FETCH_ASSOC);

        $data = array();

        for ($i = 0; $i < count($result); $i++) {
            $singleEntry = array(
                'id' => $result[$i]['workId'],
                'location' => $result[$i]['fileLocation'],
                'name' => $result[$i]['name'],
                'firstDescription' => $result[$i]['desc2'],
                'secondDescription' => $result[$i]['desc3'],
                'medium' => $result[$i]['medium'],
                'isColor' => $result[$i]['color'],
                'availability' => $result[$i]['isAvailable'],
                'creationYear' => $result[$i]['year'],
                'orderOfDisplay' => $result[$i]['orderOfDisplay'],
                'carousel' => $result[$i]['carousel'],
                'isSelectWork' => $result[$i]['isSelectWork'],
                'visible' => $result[$i]['visible'],
                'long_description' => $result[$i]['long_description']
            );

            array_push($data, $singleEntry);
        }

        header('Content-Type: application/json');
        echo json_encode($data);
        die;
    }

    $yearCondition = "WHERE visible = 1 and isSelectWork = 0";

    if ($theYear == 'invisible') {
        $yearCondition = "WHERE visible = 0";
    }

    if ($theYear == 'Select Works') {
        $yearCondition = "WHERE visible = 1 AND isSelectWork  = 1";
    }

    if ($theYear == '2020') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Illustration' AND (year = 2020 OR year = 2019)";
    }

    if ($theYear == '2021') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Illustration' AND (year = 2021 OR year = 2022)";
    }

    if ($theYear == '2022') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Illustration' AND (year = 2021 OR year = 2022)";
    }

    if ($theYear == '2023') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Illustration' AND (year = 2023)";
    }

    if ($theYear == 'Fixed Motion') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Fixed Motion'";
    }

    if ($theYear == 'Tape Diaries') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Tape Diaries'";
    }

    if ($theYear == 'Force') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Force'";
    }

    if ($theYear == 'Drip') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Drip'";
    }

    if ($theYear == 'Leaves / Petals') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Leaves / Petals'";
    }

    if ($theYear == 'Where is my mind?') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Where is my mind?'";
    }

    if ($theYear == 'Portraits') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Portraits'";
    }

    if ($theYear == 'Illustration') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Illustration'";
    }

    if ($theYear == 'Mise en scene') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Mise en scene'";
    }

    if ($theYear == 'Paris') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Paris'";
    }

    if ($theYear == 'In conversation with a flower') {
        $yearCondition = "WHERE visible = 1 AND medium = 'In conversation with a flower'";
    }

    if ($theYear == 'Recyclart') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Recyclart'";
    }

    if ($theYear == 'Bio') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Bio'";
    }

    if ($theYear == 'Contact') {
        $yearCondition = "WHERE visible = 1 AND medium = 'Contact'";
    }

    if ($theYear == 'CV') {
        $yearCondition = "WHERE visible = 1 AND medium = 'CV'";
    }

    $query = "SELECT $allWorksCols FROM allWorks $yearCondition
            ORDER BY orderOfDisplay DESC";

    if ($theYear == 'carousel') {
        $query = "SELECT $allWorksCols FROM allWorks
              WHERE carousel = 1 AND visible = 1
              ORDER BY orderOfDisplay DESC";
    }

    if ($theYear == 'projectsAPI') {
        $query = "SELECT $allWorksCols FROM allWorks
              WHERE isSelectWork = 1 AND visible = 1
              ORDER BY name ASC";
    }

    $pictureQuery = $conn->prepare($query);
    $pictureQuery->execute();
    $result = $pictureQuery->fetchAll(PDO::FETCH_ASSOC);

    $data = array();

    for ($i = 0; $i < count($result); $i++) {

        $singleEntry = array(
            'id' => $result[$i]['workId'],
            'location' => $result[$i]['fileLocation'],
            'name' => $result[$i]['name'],
            'firstDescription' => $result[$i]['desc2'],
            'secondDescription' => $result[$i]['desc3'],
            'medium' => $result[$i]['medium'],
            'isColor' => $result[$i]['color'],
            'availability' => $result[$i]['isAvailable'],
            'creationYear' => $result[$i]['year'],
            'orderOfDisplay' => $result[$i]['orderOfDisplay'],
            'carousel' => $result[$i]['carousel'],
            'isSelectWork' => $result[$i]['isSelectWork'],
            'visible' => $result[$i]['visible'],
            'long_description' => $result[$i]['long_description']
        );

        array_push($data, $singleEntry);
    }

    header('Content-Type: application/json');
    echo json_encode($data);

    die;
}

// Upload answers. Failures carry a real HTTP error code, so the admin page
// can never mistake one for a success.
function uploadFail($message, $code = 400, $extra = array())
{
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(array_merge(array("success" => false, "message" => $message), $extra));
    die;
}

// A file name for a new upload that no other work is using. Re-using a name
// would silently replace that other work's image, thumbnail and web copy.
function uniqueArtworkFileName($conn, $originalName, $dirs)
{
    $base = pathinfo($originalName, PATHINFO_FILENAME);
    $base = trim(preg_replace('/[^A-Za-z0-9_-]+/', '-', $base), '-');
    if ($base === '') {
        $base = 'artwork';
    }
    $base = substr($base, 0, 80);

    $inUse = $conn->prepare("SELECT COUNT(*) FROM allWorks WHERE fileLocation = ?");
    for ($n = 1; ; $n++) {
        $candidate = $base . ($n > 1 ? '-' . $n : '') . '.jpeg';
        $taken = false;
        foreach ($dirs as $dir) {
            if (file_exists($dir . $candidate)) {
                $taken = true;
                break;
            }
        }
        if (!$taken) {
            $inUse->execute(array($candidate));
            $taken = $inUse->fetchColumn() > 0;
        }
        if (!$taken) {
            return $candidate;
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (($_SESSION["ambar"] ?? null) != "connected") {
        uploadFail("You have been signed out. Please sign in again.", 401, array("signedOut" => true));
    }

    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        $errorCode = isset($_FILES['photo']) ? $_FILES['photo']['error'] : UPLOAD_ERR_NO_FILE;
        $tooBig = in_array($errorCode, array(UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE), true);
        uploadFail($tooBig ? "The picture is too large for the server." : "The picture did not arrive. Please try again.",
            $tooBig ? 413 : 400, array("error_code" => $errorCode));
    }

    $requiredFields = ['name', 'medium', 'isColor', 'availability', 'creationYear', 'orderOfDisplay', 'carousel', 'selectWork'];
    $missingFields = [];
    foreach ($requiredFields as $field) {
        if (!isset($_POST[$field]) || $_POST[$field] === '') {
            $missingFields[] = $field;
        }
    }
    if (count($missingFields) > 0) {
        uploadFail("Missing required fields: " . implode(', ', $missingFields), 400, array("missing" => $missingFields));
    }

    $photo = $_FILES['photo'];

    $tooLarge = uploadTooLargeMessage($photo['tmp_name']);
    if ($tooLarge !== null) {
        uploadFail($tooLarge, 413);
    }

    $name = $_POST["name"];
    $desc2 = $_POST["firstDescription"] ?? '';
    $desc3 = $_POST["secondDescription"] ?? '';
    $medium = $_POST["medium"];
    $color = $_POST["isColor"];
    $isAvailable = $_POST["availability"];
    $year = $_POST["creationYear"];
    $orderOfDisplay = $_POST["orderOfDisplay"];
    $carousel = $_POST["carousel"];
    $selectWork = $_POST["selectWork"];
    $long_description = $_POST["long_description"] ?? '';

    $baseImageDir = '../baseImages/';
    $thumbnailDir = '../thumbnails/';
    $webDir = $baseImageDir . 'web/';

    foreach (array($baseImageDir, $thumbnailDir) as $dir) {
        if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
            uploadFail("Image folder is missing and couldn't be created", 500);
        }
        if (!is_writable($dir)) {
            uploadFail("Image folder is not writable", 500);
        }
    }

    $newFileName = uniqueArtworkFileName($conn, $photo['name'], artworkImageDirs());
    $destination = $baseImageDir . $newFileName;

    try {
        convertToProgressiveJPEGAndUpload($photo['tmp_name'], $destination);
        createAndSaveThumbnail($destination, $thumbnailDir, $newFileName);
    } catch (Throwable $e) {
        @unlink($destination);
        @unlink($thumbnailDir . $newFileName);
        error_log('Upload image processing failed: ' . $e->getMessage());
        uploadFail("This picture could not be read. Please use a JPEG, PNG or GIF.", 415);
    }

    // The web-sized copies the public site shows. If this fails, webImage.php
    // makes them on the first visit instead.
    try {
        if (is_dir($webDir) || @mkdir($webDir, 0755, true)) {
            createWebImage($destination, $webDir . $newFileName);
            createWebImageVariants($webDir . $newFileName, $webDir, $newFileName);
        }
    } catch (Throwable $webError) {
        error_log('Web copy not made at upload for ' . $newFileName . ': ' . $webError->getMessage());
    }

    try {
        $query = "INSERT INTO allWorks (fileLocation, name, desc2,
                    desc3, medium, color,
                    isAvailable, year, orderOfDisplay,
                    carousel, isSelectWork, long_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $uploadQuery = $conn->prepare($query);
        $uploadQuery->execute(array($newFileName, $name, $desc2,
            $desc3, $medium, $color,
            $isAvailable, $year, $orderOfDisplay,
            $carousel, $selectWork, $long_description));
    } catch (PDOException $e) {
        // Don't leave image files behind for a work that doesn't exist
        foreach (artworkImageDirs() as $dir) {
            @unlink($dir . $newFileName);
        }
        error_log('Upload database error: ' . $e->getMessage());
        uploadFail("The work could not be saved. Please try again.", 500);
    }

    header('Content-Type: application/json');
    echo json_encode(array(
        "success" => true,
        "message" => "Image uploaded successfully",
        "id" => $conn->lastInsertId(),
        "filename" => $newFileName
    ));
    die;
}


if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    requireAdminApi();

    $rawData = file_get_contents('php://input');
    parse_str($rawData, $_PATCH);

    // Check if this is a batch update request
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    if ($action === 'batch') {
        // Handle batch update
        $ids = json_decode($_PATCH['ids'], true);

        if (!is_array($ids) || empty($ids)) {
            header('Content-Type: application/json');
            echo json_encode(array("success" => false, "message" => "Invalid or empty batch IDs"));
            die;
        }

        $updateField = '';
        $updateValue = '';

        if (isset($_PATCH['selectWork'])) {
            $updateField = 'isSelectWork';
            $updateValue = $_PATCH['selectWork'];
        } elseif (isset($_PATCH['carousel'])) {
            $updateField = 'carousel';
            $updateValue = $_PATCH['carousel'];
        } else {
            header('Content-Type: application/json');
            echo json_encode(array("success" => false, "message" => "No valid update field specified"));
            die;
        }

        // Create placeholders for IN clause
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $query = "UPDATE allWorks SET $updateField = ? WHERE workID IN ($placeholders)";

        // First parameter is the update value, followed by all IDs
        $params = array_merge([$updateValue], $ids);

        $updateQuery = $conn->prepare($query);

        if ($updateQuery->execute($params)) {
            header('Content-Type: application/json');
            echo json_encode(array(
                "success" => true,
                "message" => "Batch update successful",
                "updated" => count($ids),
                "field" => $updateField,
                "value" => $updateValue
            ));
        } else {
            header('Content-Type: application/json');
            echo json_encode(array(
                "success" => false,
                "message" => "Failed to perform batch update",
                "error" => $updateQuery->errorInfo()
            ));
        }

        die;
    }

    // Regular single-item update starts here...
    $id = $_PATCH['id'];

    // Check for special single-field updates - these use a special parameter to indicate single-field intent
    if (isset($_PATCH['fieldUpdate']) && $_PATCH['fieldUpdate'] === 'single') {
        if (isset($_PATCH['selectWork'])) {
            $query = "UPDATE allWorks SET isSelectWork = ? WHERE workID = ?";
            $params = array($_PATCH['selectWork'], $id);

            $updateQuery = $conn->prepare($query);
            if ($updateQuery->execute($params)) {
                header('Content-Type: application/json');
                echo json_encode(array("success" => true, "message" => "Select Work status updated successfully"));
            } else {
                header('Content-Type: application/json');
                echo json_encode(array("success" => false, "message" => "Failed to update Select Work status"));
            }
            die;
        }

        if (isset($_PATCH['carousel'])) {
            $query = "UPDATE allWorks SET carousel = ? WHERE workID = ?";
            $params = array($_PATCH['carousel'], $id);

            $updateQuery = $conn->prepare($query);
            if ($updateQuery->execute($params)) {
                header('Content-Type: application/json');
                echo json_encode(array("success" => true, "message" => "Carousel status updated successfully"));
            } else {
                header('Content-Type: application/json');
                echo json_encode(array("success" => false, "message" => "Failed to update Carousel status"));
            }
            die;
        }
    }

    // Check for restore operation
    $restoreTest = isset($_PATCH['restore']) ? $_PATCH['restore'] : '';

    if ($restoreTest == "restore") {
        $theQuery = "UPDATE allWorks SET visible = 1 WHERE workID = ?";
        $theArray = array($id);
        $updateQuery = $conn->prepare($theQuery);

        if ($updateQuery->execute($theArray)) {
            echo "Work restored successfully!";
        } else {
            echo "Error: ";
        }
        die;
    }

    // Full update with all fields
    // Check if we have required fields for a full update
    if (!isset($_PATCH['name']) || !isset($_PATCH['medium'])) {
        header('Content-Type: application/json');
        echo json_encode(array("success" => false, "message" => "Required fields missing for full update"));
        die;
    }

    $name = $_PATCH['name'];
    $firstDescription = $_PATCH['firstDescription'];
    $secondDescription = $_PATCH['secondDescription'];
    $medium = $_PATCH['medium'];
    $isColor = $_PATCH['isColor'];
    $availability = $_PATCH['availability'];
    $creationYear = $_PATCH['creationYear'];
    $orderOfDisplay = $_PATCH['orderOfDisplay'];
    $carousel = $_PATCH['carousel'];
    $selectWork = $_PATCH['selectWork'];
    $long_description = $_PATCH["long_description"];

    $theQuery = "UPDATE allWorks SET name = ?, desc2 = ?, desc3 = ?, medium = ?, color = ?, isAvailable = ?, year = ?, orderOfDisplay = ?, carousel = ?, isSelectWork = ?, long_description = ? WHERE workID = ?";

    $theArray = array($name, $firstDescription, $secondDescription, $medium, $isColor, $availability, $creationYear, $orderOfDisplay, $carousel, $selectWork, $long_description, $id);

    $updateQuery = $conn->prepare($theQuery);

    if ($updateQuery->execute($theArray)) {
        echo "Data updated successfully!";
    } else {
        echo "Error: ";
    }

    if ($selectWork == 0) {
        $theQuery = "DELETE FROM worksInProjects WHERE workId = ?";
        $theArray = array($id);

        $updateQuery = $conn->prepare($theQuery);

        if ($updateQuery->execute($theArray)) {
            echo "Deleted from projects!";
        } else {
            echo "Error: ";
        }
    }

    die;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    requireAdminApi();

    $rawData = file_get_contents('php://input');
    parse_str($rawData, $_DELETE);

    // Check if this is a batch delete request
    $action = isset($_GET['action']) ? $_GET['action'] : '';

    if ($action === 'batch') {
        // Handle batch delete
        $ids = json_decode($_DELETE['ids'], true);

        if (!is_array($ids) || empty($ids)) {
            header('Content-Type: application/json');
            echo json_encode(array("success" => false, "message" => "Invalid or empty batch IDs"));
            die;
        }

        // Create placeholders for IN clause
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        // Deleting only hides the works. Their Select Works, Carousel and
        // For Sale settings are kept (every public query also checks
        // visible), so restoring brings them back exactly as they were.
        $theQuery = "UPDATE allWorks SET visible = 0 WHERE workID IN ($placeholders)";

        $updateQuery = $conn->prepare($theQuery);

        if ($updateQuery->execute($ids)) {
            header('Content-Type: application/json');
            echo json_encode(array(
                "success" => true,
                "message" => "Batch delete successful",
                "deleted" => count($ids)
            ));
        } else {
            header('Content-Type: application/json');
            echo json_encode(array(
                "success" => false,
                "message" => "Failed to perform batch delete",
                "error" => $updateQuery->errorInfo()
            ));
        }

        die;
    }

    // Hard delete: removes the image files (base image + thumbnail) from the
    // server and the row from the database. Used by the admin trash view's
    // "Delete Permanently" button — regular delete below stays reversible.
    if (isset($_DELETE['mode']) && $_DELETE['mode'] === 'hard') {
        $id = $_DELETE['id'];

        $fetchQuery = $conn->prepare("SELECT fileLocation FROM allWorks WHERE workID = ?");
        $fetchQuery->execute(array($id));
        $work = $fetchQuery->fetch(PDO::FETCH_ASSOC);

        if (!$work) {
            header('Content-Type: application/json');
            echo json_encode(array("success" => false, "message" => "Work not found"));
            die;
        }

        // basename() so a tampered fileLocation can never reach outside the image dirs
        $fileName = basename($work['fileLocation']);

        // Another row may reference the same file (re-uploads with the same
        // name) — only remove the files when this row is the last reference
        $sharedQuery = $conn->prepare("SELECT COUNT(*) FROM allWorks WHERE fileLocation = ? AND workID != ?");
        $sharedQuery->execute(array($work['fileLocation'], $id));
        $isShared = $sharedQuery->fetchColumn() > 0;

        try {
            $conn->prepare("DELETE FROM worksInProjects WHERE workId = ?")->execute(array($id));
            $conn->prepare("DELETE FROM allWorks WHERE workID = ?")->execute(array($id));
        } catch (PDOException $e) {
            header('Content-Type: application/json');
            echo json_encode(array("success" => false, "message" => "Database error", "error" => $e->getMessage()));
            die;
        }

        $deletedFiles = array();
        if (!$isShared && $fileName !== '') {
            foreach (artworkImageDirs() as $dir) {
                $path = $dir . $fileName;
                if (is_file($path) && unlink($path)) {
                    $deletedFiles[] = $path;
                }
            }
        }

        header('Content-Type: application/json');
        echo json_encode(array(
            "success" => true,
            "message" => "Work permanently deleted",
            "filesDeleted" => count($deletedFiles),
            "fileKept" => $isShared
        ));
        die;
    }

    // Regular single-item delete starts here...
    $id = $_DELETE['id'];

    // Only hides the work; see the batch delete above
    $theQuery = "UPDATE allWorks SET visible = 0 WHERE workID = ?";

    $theArray = array($id);

    // Prepare the SQL statement
    $updateQuery = $conn->prepare($theQuery);

    // Execute the prepared statement
    if ($updateQuery->execute($theArray)) {
        echo "Post deleted successfully!";
    } else {
        echo "Error: ";
    }

    die;
}
?>