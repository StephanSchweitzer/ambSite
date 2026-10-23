<?php
global $conn;
session_start();

include '../database/pdo.php';
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
              WHERE isSelectWork = 1
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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check session
    if (($_SESSION["ambar"] ?? null) != "connected") {
        header('Content-Type: application/json');
        echo json_encode(array("success" => false, "message" => "Authentication required"));
        die;
    }

    // Check if photo was uploaded
    if (!isset($_FILES['photo']) || $_FILES['photo']['error'] !== UPLOAD_ERR_OK) {
        header('Content-Type: application/json');
        echo json_encode(array(
            "success" => false,
            "message" => "File upload error",
            "error_code" => isset($_FILES['photo']) ? $_FILES['photo']['error'] : 'No file uploaded'
        ));
        die;
    }

    // Check required fields
    $requiredFields = ['name', 'medium', 'isColor', 'availability', 'creationYear', 'orderOfDisplay', 'carousel', 'selectWork'];
    $missingFields = [];

    foreach ($requiredFields as $field) {
        if (!isset($_POST[$field]) || $_POST[$field] === '') {
            $missingFields[] = $field;
        }
    }

    if (count($missingFields) > 0) {
        header('Content-Type: application/json');
        echo json_encode(array(
            "success" => false,
            "message" => "Missing required fields",
            "missing" => $missingFields
        ));
        die;
    }

    // Get photo and form data
    $photo = $_FILES['photo'];
    $locationName = $photo['name'];
    $fileLocation = $locationName;

    $name = $_POST["name"];
    $desc2 = isset($_POST["firstDescription"]) ? $_POST["firstDescription"] : '';
    $desc3 = isset($_POST["secondDescription"]) ? $_POST["secondDescription"] : '';
    $medium = $_POST["medium"];
    $color = $_POST["isColor"];
    $isAvailable = $_POST["availability"];
    $year = $_POST["creationYear"];
    $orderOfDisplay = $_POST["orderOfDisplay"];
    $carousel = $_POST["carousel"];
    $selectWork = $_POST["selectWork"];
    $long_description = isset($_POST["long_description"]) ? $_POST["long_description"] : '';

    // Check if destination directories exist
    $baseImageDir = '../baseImages/';
    $thumbnailDir = '../thumbnails/';

    if (!file_exists($baseImageDir)) {
        if (!mkdir($baseImageDir, 0755, true)) {
            header('Content-Type: application/json');
            echo json_encode(array("success" => false, "message" => "Base image directory doesn't exist and couldn't be created"));
            die;
        }
    } else if (!is_writable($baseImageDir)) {
        header('Content-Type: application/json');
        echo json_encode(array("success" => false, "message" => "Base image directory not writable"));
        die;
    }

    if (!file_exists($thumbnailDir)) {
        if (!mkdir($thumbnailDir, 0755, true)) {
            header('Content-Type: application/json');
            echo json_encode(array("success" => false, "message" => "Thumbnail directory doesn't exist and couldn't be created"));
            die;
        }
    } else if (!is_writable($thumbnailDir)) {
        header('Content-Type: application/json');
        echo json_encode(array("success" => false, "message" => "Thumbnail directory not writable"));
        die;
    }

    // Process the image
    if ($photo['error'] === UPLOAD_ERR_OK) {
        $tempFilePath = $photo['tmp_name'];

        // Generate a new destination path with the JPEG extension
        $fileExtension = pathinfo($photo['name'], PATHINFO_EXTENSION);
        $baseName = basename($photo['name'], "." . $fileExtension);
        $newFileName = $baseName . ".jpeg";
        $destination = $baseImageDir . $newFileName;

        try {
            // Convert and upload the image
            convertToProgressiveJPEGAndUpload($tempFilePath, $destination);
            $fileLocation = $newFileName;

            // Create thumbnail
            createAndSaveThumbnail($destination, $thumbnailDir, $newFileName);

            // Make the web-sized copy the public site shows now, replacing
            // any older copy left by an earlier upload with the same name. If
            // this fails, webImage.php makes it on the first visit instead.
            $webDir = $baseImageDir . 'web/';
            $webCopy = $webDir . $newFileName;
            if (is_file($webCopy)) {
                @unlink($webCopy);
            }
            try {
                if (is_dir($webDir) || @mkdir($webDir, 0755, true)) {
                    createWebImage($destination, $webCopy);
                }
            } catch (Throwable $webError) {
                error_log('Web copy not made at upload for ' . $newFileName . ': ' . $webError->getMessage());
            }
        } catch (Exception $e) {
            header('Content-Type: application/json');
            echo json_encode(array(
                "success" => false,
                "message" => "Image processing error",
                "error" => $e->getMessage()
            ));
            die;
        }
    }

    // Insert into database
    try {
        $query = "INSERT INTO allWorks (fileLocation, name, desc2,
                    desc3, medium, color,
                    isAvailable, year, OrderOfDisplay,
                    carousel, isSelectWork, long_description)
            VALUES (?, ?, ?, 
                    ?, ?, ?, 
                    ?, ?, ?, 
                    ?, ?, ?
            )";

        $theArray = array($fileLocation, $name, $desc2,
            $desc3, $medium, $color,
            $isAvailable, $year, $orderOfDisplay,
            $carousel, $selectWork, $long_description);

        $uploadQuery = $conn->prepare($query);
        $uploadQuery->execute($theArray);

        $newId = $conn->lastInsertId();

        header('Content-Type: application/json');
        echo json_encode(array(
            "success" => true,
            "message" => "Image uploaded successfully",
            "id" => $newId,
            "filename" => $fileLocation
        ));
    } catch (PDOException $e) {
        header('Content-Type: application/json');
        echo json_encode(array(
            "success" => false,
            "message" => "Database error",
            "error" => $e->getMessage()
        ));
    }

    die;
}


if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    if (($_SESSION["ambar"] ?? null) != "connected") {
        header("Location: signIn/signIn.php?status=needCredentials");
        die;
    }

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
    if (($_SESSION["ambar"] ?? null) != "connected") {
        header("Location: signIn/signIn.php?status=needCredentials");
        die;
    }

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

        $theQuery = "UPDATE allWorks 
                    SET visible = 0, 
                        carousel = 0, 
                        isSelectWork = 0, 
                        isAvailable = 0 
                    WHERE workID IN ($placeholders)";

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
            foreach (array('../baseImages/', '../baseImages/web/', '../thumbnails/') as $dir) {
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

    $theQuery = "UPDATE allWorks
                SET visible = 0,
                    carousel = 0,
                    isSelectWork = 0,
                    isAvailable = 0
                WHERE workID = ?";

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