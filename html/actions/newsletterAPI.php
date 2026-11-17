<?php

global $conn;
include_once __DIR__ . '/../database/session.php';
include '../database/pdo.php';

header('Content-Type: application/json');

function sendError($message, $code = 500)
{
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    die;
}

// Check the request method and handle accordingly
try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // The subscriber list is private — only the admin may read it
            if (($_SESSION["ambar"] ?? null) != "connected") {
                sendError('Unauthorized', 401);
            }

            // Fetch all active subscriptions, ordered alphabetically by email
            $query = "SELECT id, email, subscriptionDate, active FROM newsletterEmailList ORDER BY email ASC";
            $stmt = $conn->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['status' => 'success', 'data' => $data]);
            break;

        case 'POST':
            // Get the email from the request body
            $json_str = file_get_contents('php://input');
            $data = json_decode($json_str, true);

            // Validate email
            if (!isset($data['email']) || empty($data['email'])) {
                sendError('Email is required', 400);
            }

            $email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
            if (!$email) {
                sendError('Invalid email format', 400);
            }

            // Check if email already exists
            $checkQuery = "SELECT id FROM newsletterEmailList WHERE email = :email";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':email', $email, PDO::PARAM_STR);
            $checkStmt->execute();

            if ($checkStmt->rowCount() > 0) {
                // Email exists, check if it's active
                $existingRow = $checkStmt->fetch(PDO::FETCH_ASSOC);
                $updateQuery = "UPDATE newsletterEmailList SET active = 1, subscriptionDate = CURRENT_TIMESTAMP WHERE id = :id";
                $updateStmt = $conn->prepare($updateQuery);
                $updateStmt->bindParam(':id', $existingRow['id'], PDO::PARAM_INT);
                $updateStmt->execute();

                echo json_encode(['status' => 'success', 'message' => 'Subscription reactivated']);
            } else {
                // Insert new subscription
                $insertQuery = "INSERT INTO newsletterEmailList (email) VALUES (:email)";
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->bindParam(':email', $email, PDO::PARAM_STR);
                $insertStmt->execute();

                echo json_encode(['status' => 'success', 'message' => 'Subscription added successfully']);
            }
            break;

        case 'PUT':
            // Require authentication for modification
            if (($_SESSION["ambar"] ?? null) != "connected") {
                sendError('Unauthorized', 401);
            }

            // Get data from request body
            $json_str = file_get_contents('php://input');
            $data = json_decode($json_str, true);

            // Validate required fields
            if (!isset($data['id']) || empty($data['id'])) {
                sendError('ID is required', 400);
            }

            $id = filter_var($data['id'], FILTER_VALIDATE_INT);
            if (!$id) {
                sendError('Invalid ID format', 400);
            }

            // Check if subscription exists
            $checkQuery = "SELECT id FROM newsletterEmailList WHERE id = :id";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();

            if ($checkStmt->rowCount() === 0) {
                sendError('Subscription not found', 404);
            }

            // Update fields
            $updateFields = [];
            $params = [':id' => $id];

            if (isset($data['email']) && !empty($data['email'])) {
                $email = filter_var($data['email'], FILTER_VALIDATE_EMAIL);
                if (!$email) {
                    sendError('Invalid email format', 400);
                }
                $updateFields[] = "email = :email";
                $params[':email'] = $email;
            }

            if (isset($data['active'])) {
                $active = filter_var($data['active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($active === null) {
                    sendError('Invalid active value', 400);
                }
                $updateFields[] = "active = :active";
                $params[':active'] = $active ? 1 : 0;
            }

            if (empty($updateFields)) {
                sendError('No fields to update', 400);
            }

            // Perform update
            $updateQuery = "UPDATE newsletterEmailList SET " . implode(", ", $updateFields) . " WHERE id = :id";
            $updateStmt = $conn->prepare($updateQuery);

            foreach ($params as $key => $value) {
                $updateStmt->bindValue($key, $value);
            }

            $updateStmt->execute();

            echo json_encode(['status' => 'success', 'message' => 'Subscription updated successfully']);
            break;

        case 'DELETE':
            // Require authentication for deletion
            if (($_SESSION["ambar"] ?? null) != "connected") {
                sendError('Unauthorized', 401);
            }

            // Get ID from request body
            $json_str = file_get_contents('php://input');
            $data = json_decode($json_str, true);

            // Validate ID
            if (!isset($data['id']) || empty($data['id'])) {
                sendError('ID is required', 400);
            }

            $id = filter_var($data['id'], FILTER_VALIDATE_INT);
            if (!$id) {
                sendError('Invalid ID format', 400);
            }

            // Check if subscription exists
            $checkQuery = "SELECT id FROM newsletterEmailList WHERE id = :id";
            $checkStmt = $conn->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $checkStmt->execute();

            if ($checkStmt->rowCount() === 0) {
                sendError('Subscription not found', 404);
            }

            // Delete subscription
            $deleteQuery = "DELETE FROM newsletterEmailList WHERE id = :id";
            $deleteStmt = $conn->prepare($deleteQuery);
            $deleteStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $deleteStmt->execute();

            echo json_encode(['status' => 'success', 'message' => 'Subscription deleted successfully']);
            break;

        default:
            sendError('Method Not Allowed', 405);
            break;
    }
} catch (PDOException $e) {
    sendError($e->getMessage());
}
?>