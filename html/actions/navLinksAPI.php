<?php

global $conn;
include_once __DIR__ . '/../database/session.php';
include '../database/pdo.php';

header('Content-Type: application/json');

/**
 * Send an error response
 * @param string $message Error message
 * @param int $code HTTP status code
 */
function sendError($message, $code = 500)
{
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    die;
}

/**
 * Process and insert/update links
 * @param array $links Array of link data
 */
function treatAndInsertLinks($links)
{
    global $conn;
    foreach ($links as $link) {
        $id = $link['id'];
        $displayedText = $link['displayedText'];
        $linkRedirection = isset($link['linkRedirection']) ? $link['linkRedirection'] : '';
        $order = $link['order'];
        $isNewTab = isset($link['isNewTab']) ? $link['isNewTab'] : 0;
        $onclick = isset($link['onclick']) ? $link['onclick'] : '';
        $attachedFollowingDiv = isset($link['attachedFollowingDiv']) ? $link['attachedFollowingDiv'] : null;

        // Check if the link already exists in the database
        $query = $conn->prepare("SELECT * FROM navLinks WHERE id = :id");
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);

        if (!$result)
        {
            // Insert new link
            $insertQuery = $conn->prepare("INSERT INTO navLinks (displayedText, linkRedirection, displayedOrder, isChangeable, onclick, isNewTab, attachedFollowingDiv) 
                                         VALUES (:displayedText, :linkRedirection, :displayedOrder, 1, :onclick, :isNewTab, :attachedFollowingDiv)");
            $insertQuery->bindParam(':displayedText', $displayedText, PDO::PARAM_STR);
            $insertQuery->bindParam(':linkRedirection', $linkRedirection, PDO::PARAM_STR);
            $insertQuery->bindParam(':displayedOrder', $order, PDO::PARAM_INT);
            $insertQuery->bindParam(':onclick', $onclick, PDO::PARAM_STR);
            $insertQuery->bindParam(':isNewTab', $isNewTab, PDO::PARAM_INT);
            $insertQuery->bindParam(':attachedFollowingDiv', $attachedFollowingDiv, PDO::PARAM_STR);
            $insertQuery->execute();
            continue;
        }

        $isChangeable = $result['isChangeable'];

        if ($isChangeable == 0)
        {
            // Update unchangeable link (only display text and order)
            $updateQuery = $conn->prepare("UPDATE navLinks SET displayedText = :displayedText, displayedOrder = :displayedOrder WHERE id = :id");
            $updateQuery->bindParam(':displayedText', $displayedText, PDO::PARAM_STR);
            $updateQuery->bindParam(':displayedOrder', $order, PDO::PARAM_INT);
            $updateQuery->bindParam(':id', $id, PDO::PARAM_INT);
            $updateQuery->execute();
        }
        else
        {
            // Update changeable link (all fields)
            $updateQuery = $conn->prepare("UPDATE navLinks 
                SET displayedText = :displayedText, 
                    linkRedirection = :linkRedirection, 
                    displayedOrder = :displayedOrder, 
                    isNewTab = :isNewTab,
                    onclick = :onclick" .
                ($attachedFollowingDiv !== null ? ", attachedFollowingDiv = :attachedFollowingDiv" : "") .
                " WHERE id = :id");

            $updateQuery->bindParam(':displayedText', $displayedText, PDO::PARAM_STR);
            $updateQuery->bindParam(':linkRedirection', $linkRedirection, PDO::PARAM_STR);
            $updateQuery->bindParam(':displayedOrder', $order, PDO::PARAM_INT);
            $updateQuery->bindParam(':isNewTab', $isNewTab, PDO::PARAM_INT);
            $updateQuery->bindParam(':onclick', $onclick, PDO::PARAM_STR);
            $updateQuery->bindParam(':id', $id, PDO::PARAM_INT);

            if ($attachedFollowingDiv !== null) {
                $updateQuery->bindParam(':attachedFollowingDiv', $attachedFollowingDiv, PDO::PARAM_STR);
            }

            $updateQuery->execute();
        }
    }
}

/**
 * Delete links by ID
 * @param array $ids Array of link IDs to delete
 */
function deleteLinks($ids)
{
    global $conn;
    foreach ($ids as $id) {
        // Check if the link exists and is changeable
        $query = $conn->prepare("SELECT * FROM navLinks WHERE id = :id");
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
        $result = $query->fetch(PDO::FETCH_ASSOC);

        if (!$result || $result['isChangeable'] == 0)
        {
            continue; // Skip if link doesn't exist or is not changeable
        }

        // Delete the link
        $query = $conn->prepare("DELETE FROM navLinks WHERE id = :id");
        $query->bindParam(':id', $id, PDO::PARAM_INT);
        $query->execute();
    }
}

// Handle different HTTP methods
try {
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // Fetch all visible navigation links
            $query = "SELECT ID, displayedText, linkRedirection, displayedOrder, isChangeable, onclick, isNewTab, attachedFollowingDiv FROM navLinks WHERE visible = 1 ORDER BY displayedOrder ASC";
            $stmt = $conn->prepare($query);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['status' => 'success', 'data' => $data]);
            break;

        case 'POST':
            // Verify authentication
            if (($_SESSION["ambar"] ?? null) != "connected")
            {
                sendError('Unauthorized', 401);
            }

            // Parse the input data
            $json_str = file_get_contents('php://input');
            $links = json_decode($json_str, true);

            if (!is_array($links))
            {
                sendError('Invalid data format', 400);
            }

            $updateLinks = $links['createOrUpdate'];
            $deleteIds = $links['delete'];

            // Process the links
            treatAndInsertLinks($updateLinks);
            deleteLinks($deleteIds);

            echo json_encode(['status' => 'success', 'message' => 'Links successfully updated']);
            break;

        case 'PATCH':
            // Ensure user is authenticated before modifying data
            if (($_SESSION["ambar"] ?? null) != "connected") {
                sendError('Unauthorized', 401);
            }

            // Retrieve raw data and parse into the `_PATCH` array
            parse_str(file_get_contents('php://input'), $_PATCH);

            $id = $_PATCH['ID'] ?? null;
            $displayedText = $_PATCH['displayedText'] ?? '';
            $linkRedirection = $_PATCH['linkRedirection'] ?? '';
            $displayedOrder = $_PATCH['displayedOrder'] ?? 0;
            $isNewTab = $_PATCH['isNewTab'] ?? 0;
            $onclick = $_PATCH['onclick'] ?? '';
            $attachedFollowingDiv = isset($_PATCH['attachedFollowingDiv']) ? $_PATCH['attachedFollowingDiv'] : null;

            // Validate input data
            if (!$id || empty($displayedText)) {
                sendError('Invalid input: ID and displayedText are required', 400);
            }

            // Check if the link exists and if it's changeable
            $checkQuery = $conn->prepare("SELECT isChangeable FROM navLinks WHERE ID = ?");
            $checkQuery->execute([(int)$id]);
            $linkInfo = $checkQuery->fetch(PDO::FETCH_ASSOC);

            if (!$linkInfo) {
                sendError('Link not found', 404);
            }

            // If link is not changeable, only update the text and order
            if ($linkInfo['isChangeable'] == 0) {
                $query = "UPDATE navLinks SET displayedText = ?, displayedOrder = ? WHERE ID = ?";
                $stmt = $conn->prepare($query);
                $stmt->execute([$displayedText, (int)$displayedOrder, (int)$id]);
            } else {
                // For changeable links, update all fields
                // Build the query dynamically based on whether attachedFollowingDiv is provided
                $sql = "UPDATE navLinks SET 
                        displayedText = ?, 
                        linkRedirection = ?, 
                        displayedOrder = ?, 
                        isNewTab = ?,
                        onclick = ?";

                $params = [
                    $displayedText,
                    $linkRedirection,
                    (int)$displayedOrder,
                    (int)$isNewTab,
                    $onclick
                ];

                // Add attachedFollowingDiv if provided
                if ($attachedFollowingDiv !== null) {
                    $sql .= ", attachedFollowingDiv = ?";
                    $params[] = $attachedFollowingDiv;
                }

                $sql .= " WHERE ID = ?";
                $params[] = (int)$id;

                $stmt = $conn->prepare($sql);
                $stmt->execute($params);
            }

            echo json_encode(['status' => 'success', 'message' => 'Link updated successfully']);
            break;

        case 'DELETE':
            sendError('Method Not Allowed. Use POST with delete parameter instead', 405);
            break;

        default:
            sendError('Method not allowed', 405);
            break;
    }
} catch (PDOException $e) {
    sendError($e->getMessage());
}