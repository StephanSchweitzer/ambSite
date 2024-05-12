<?php

global $conn;
session_start();
include '../database/pdo.php';

// Set a response type of JSON
header('Content-Type: application/json');

// Function to handle errors in a consistent manner
function sendError($message, $code = 500) {
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    die;
}

// Check the request method and handle accordingly
try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // Fetch all entries, ordered by the displayedOrder field
            $query = "SELECT ID, displayedText, linkRedirection, displayedOrder, isChangeable, onclick, isNewTab FROM navLinks ORDER BY displayedOrder ASC";
            $stmt = $conn->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['status' => 'success', 'data' => $data]);
            break;

        case 'POST':
            // Ensure user is authenticated before modifying data
            if ($_SESSION['ambar'] !== true) {
                sendError('Unauthorized', 401);
            }

            // Retrieve POST data
            $displayedText = $_POST['displayedText'] ?? '';
            $linkRedirection = $_POST['linkRedirection'] ?? '';
            $displayedOrder = $_POST['displayedOrder'] ?? 0;

            // Validate and insert new entry
            if (empty($displayedText) || empty($linkRedirection)) {
                sendError('Missing required fields', 400);
            }

            $query = "INSERT INTO navLinks (displayedText, linkRedirection, displayedOrder) VALUES (?, ?, ?)";
            $stmt = $conn->prepare($query);
            $stmt->execute([$displayedText, $linkRedirection, (int)$displayedOrder]);

            echo json_encode(['status' => 'success', 'message' => 'Entry created successfully']);
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
            // Ensure user is authenticated before modifying data
            if ($_SESSION['ambar'] !== true) {
                sendError('Unauthorized', 401);
            }

            // Retrieve raw data and parse into the `_DELETE` array
            parse_str(file_get_contents('php://input'), $_DELETE);

            $id = $_DELETE['ID'] ?? null;

            if (!$id) {
                sendError('Invalid input', 400);
            }

            // Delete the entry by ID
            $query = "DELETE FROM navLinks WHERE ID = ?";
            $stmt = $conn->prepare($query);
            $stmt->execute([(int)$id]);

            echo json_encode(['status' => 'success', 'message' => 'Entry deleted successfully']);
            break;

        default:
            sendError('Method Not Allowed', 405);
            break;
    }
} catch (PDOException $e) {
    sendError($e->getMessage());
}

?>
