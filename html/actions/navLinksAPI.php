<?php

global $conn;
session_start();
include '../database/pdo.php';

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

function sendError($message, $code = 500)
{
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    die;
}

function treatAndInsertLinks($links)
{
    global $conn;
    foreach ($links as $link) {
        $id = $link['id'];
        $displayedText = $link['displayedText'];
        $linkRedirection = $link['linkRedirection'];
        $order = $link['order'];

        // Check if the link already exists in the database
        $query = $conn->prepare("SELECT * FROM navLinks WHERE id = :id");
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);

        if (!$result)
        {
            $insertQuery = $conn->prepare("INSERT INTO navLinks (displayedText, linkRedirection, displayedOrder, isChangeable, onclick, isNewTab) VALUES (:displayedText, :linkRedirection, :displayedOrder, 1, '', 1)");
            $insertQuery->bindParam(':displayedText', $displayedText, PDO::PARAM_STR);
            $insertQuery->bindParam(':linkRedirection', $linkRedirection, PDO::PARAM_STR);
            $insertQuery->bindParam(':displayedOrder', $order, PDO::PARAM_INT);
            $insertQuery->execute();
            continue;
        }

        $isChangeable = $result['isChangeable'];

        if ($isChangeable == 0)
        {
            $updateQuery = $conn->prepare("UPDATE navLinks SET displayedText = :displayedText, displayedOrder = :displayedOrder WHERE id = :id");
            $updateQuery->bindParam(':displayedText', $displayedText, PDO::PARAM_STR);
            $updateQuery->bindParam(':displayedOrder', $order, PDO::PARAM_INT);
            $updateQuery->bindParam(':id', $id, PDO::PARAM_INT);
            $updateQuery->execute();
            continue;
        }

        if ($isChangeable != 0)
        {
            $updateQuery = $conn->prepare("UPDATE navLinks SET displayedText = :displayedText, linkRedirection = :linkRedirection, displayedOrder = :displayedOrder WHERE id = :id");
            $updateQuery->bindParam(':displayedText', $displayedText, PDO::PARAM_STR);
            $updateQuery->bindParam(':linkRedirection', $linkRedirection, PDO::PARAM_STR);
            $updateQuery->bindParam(':displayedOrder', $order, PDO::PARAM_INT);
            $updateQuery->bindParam(':id', $id, PDO::PARAM_INT);
            $updateQuery->execute();
            continue;
        }
    }
}

function deleteLinks($ids)
    {
    global $conn;
    foreach ($ids as $id) {

        // Check if the link already exists in the database
        $query = $conn->prepare("SELECT * FROM navLinks WHERE id = :id");
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);

        if (!$result)
        {
            continue;
        }

        if ($result['isChangeable'] == 0)
        {
            continue;
        }

        $query = $conn->prepare("DELETE FROM navLinks WHERE id = :id");
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
    }
}

// Check the request method and handle accordingly
try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // Fetch all entries, ordered by the displayedOrder field
            $query = "SELECT ID, displayedText, linkRedirection, displayedOrder, isChangeable, onclick, isNewTab, attachedFollowingDiv FROM navLinks ORDER BY displayedOrder ASC";
            $stmt = $conn->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['status' => 'success', 'data' => $data]);
            break;

        case 'POST':
            if ($_SESSION["ambar"] != "connected")
            {
                sendError('Unauthorized', 401);
            }

            $json_str = file_get_contents('php://input');
            $links = json_decode($json_str, true);
            $updateLinks = $links['createOrUpdate'];
            $deleteIds = $links['delete'];

            if (!is_array($links))
            {
                sendError('Empty array received', 400);
            }

            treatAndInsertLinks($updateLinks);
            deleteLinks($deleteIds);

            echo json_encode(['status' => 'success', 'message' => 'Links successfully updated']);
            break;

        case 'PATCH':
            // Ensure user is authenticated before modifying data
            if ($_SESSION['ambar'] !== true) {
                sendError('Unauthorized', 401);
            }

            // Retrieve raw data and parse into the `_PATCH` array
            parse_str(file_get_contents('php://input'), $_PATCH);

            $id = $_PATCH['ID'] ?? null;
            $displayedText = $_PATCH['displayedText'] ?? '';
            $linkRedirection = $_PATCH['linkRedirection'] ?? '';
            $displayedOrder = $_PATCH['displayedOrder'] ?? 0;

            // Validate input data and update the corresponding entry
            if (!$id || empty($displayedText) || empty($linkRedirection)) {
                sendError('Invalid input', 400);
            }

            $query = "UPDATE navLinks SET displayedText = ?, linkRedirection = ?, displayedOrder = ? WHERE ID = ?";
            $stmt = $conn->prepare($query);
            $stmt->execute([$displayedText, $linkRedirection, (int)$displayedOrder, (int)$id]);

            echo json_encode(['status' => 'success', 'message' => 'Entry updated successfully']);
            break;

        case 'DELETE':
            sendError('Method Not Allowed', 405);
            break;
    }
} catch (PDOException $e) {
    sendError($e->getMessage());
}

?>
