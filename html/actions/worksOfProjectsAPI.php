<?php
global $conn;
include_once __DIR__ . '/../database/session.php';

include '../database/pdo.php';
include_once __DIR__ . '/projectOrderFunctions.php';

// GET method with two different behaviors:
// 1. When projectId is provided, return all works for that project
// 2. When workId is provided, return all projects for that work
if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
    if (isset($_GET["projectId"])) {
        // All works for a project, in the order the Works page shows them
        $projectId = $_GET["projectId"];

        $query = "SELECT wip.workId FROM worksInProjects wip
                  LEFT JOIN allWorks w ON w.workId = wip.workId
                  WHERE wip.projectId = ?
                  ORDER BY " . ambProjectWorksOrderBy($conn);
        $theArray = array($projectId);

        try {
            $getWorkIdsQuery = $conn->prepare($query);
            $getWorkIdsQuery->execute($theArray);
            $result = $getWorkIdsQuery->fetchAll(PDO::FETCH_COLUMN, 0); // Fetch just the first column

            // Return the array of work IDs directly
            echo json_encode($result);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
        }
    }
    elseif (isset($_GET["workId"])) {
        // New functionality: Get all projects for a work
        $workId = $_GET["workId"];

        // Query to get all projectIds associated with this work
        $query = "SELECT projectId FROM worksInProjects WHERE workId = ?";
        $theArray = array($workId);

        try {
            $getProjectIdsQuery = $conn->prepare($query);
            $getProjectIdsQuery->execute($theArray);
            $result = $getProjectIdsQuery->fetchAll(PDO::FETCH_COLUMN, 0); // Fetch just the first column

            // Return the array of project IDs directly
            echo json_encode($result);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
        }
    }
    else {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Either projectId or workId is required'));
    }

    die;
}

// Saves a set of links in one transaction, so a failure partway through
// leaves the old links in place instead of a half-emptied project.
// $ownerColumn is the side being edited ('projectId' or 'workId').
//
// From a project: the works, in the order given, replace its whole set, and
// that order is kept (sortOrder 0, 1, 2...).
// From a work: only the projects added or removed change. Its place in the
// projects it stays in is kept, and a project it joins gets it at the end.
function replaceLinks($conn, $ownerColumn, $ownerId, $otherIds)
{
    $ordered = ambProjectOrderReady($conn);

    $conn->beginTransaction();
    try {
        if ($ownerColumn === 'projectId') {
            $conn->prepare("DELETE FROM worksInProjects WHERE projectId = ?")->execute(array($ownerId));
            $insert = $ordered
                ? $conn->prepare("INSERT INTO worksInProjects (projectId, workId, sortOrder) VALUES (?, ?, ?)")
                : $conn->prepare("INSERT INTO worksInProjects (projectId, workId) VALUES (?, ?)");
            foreach (array_values($otherIds) as $index => $workId) {
                $insert->execute($ordered ? array($ownerId, $workId, $index) : array($ownerId, $workId));
            }
        } else {
            $current = $conn->prepare("SELECT DISTINCT projectId FROM worksInProjects WHERE workId = ?");
            $current->execute(array($ownerId));
            $current = array_map('intval', $current->fetchAll(PDO::FETCH_COLUMN, 0));

            $remove = $conn->prepare("DELETE FROM worksInProjects WHERE workId = ? AND projectId = ?");
            foreach (array_diff($current, $otherIds) as $projectId) {
                $remove->execute(array($ownerId, $projectId));
            }

            // At the end of a project that has been arranged; in the old
            // order (no sortOrder) in one that hasn't
            $insert = $ordered
                ? $conn->prepare("INSERT INTO worksInProjects (workId, projectId, sortOrder)
                                  SELECT ?, ?, MAX(sortOrder) + 1 FROM worksInProjects WHERE projectId = ?")
                : $conn->prepare("INSERT INTO worksInProjects (workId, projectId) VALUES (?, ?)");
            foreach (array_diff($otherIds, $current) as $projectId) {
                $insert->execute($ordered ? array($ownerId, $projectId, $projectId) : array($ownerId, $projectId));
            }
        }
        $conn->commit();
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
}

// Reads a list of IDs sent either as a JSON string ("[1,2]") or as a form
// array, keeping only whole numbers, without duplicates
function readIdList($value)
{
    if (is_string($value)) {
        $value = json_decode($value, true);
    }
    if (!is_array($value)) {
        return null;
    }
    $ids = array();
    foreach ($value as $id) {
        if (filter_var($id, FILTER_VALIDATE_INT) === false) {
            return null;
        }
        $ids[(int) $id] = true;
    }
    return array_keys($ids);
}

// POST replaces links, from either side:
// 1. projectId + workIds: set which works are in a project
// 2. workId + projectIds: set which projects a work is in
if ($_SERVER['REQUEST_METHOD'] === 'POST')
{
    header('Content-Type: application/json');

    if (($_SESSION["ambar"] ?? null) != "connected")
    {
        http_response_code(401);
        echo json_encode(array('status' => 'error', 'message' => 'Unauthorized'));
        die;
    }

    if (isset($_POST["projectId"], $_POST["workIds"])) {
        $ownerColumn = 'projectId';
        $ownerId = filter_var($_POST["projectId"], FILTER_VALIDATE_INT);
        $otherIds = readIdList($_POST["workIds"]);
    } elseif (isset($_POST["workId"], $_POST["projectIds"])) {
        $ownerColumn = 'workId';
        $ownerId = filter_var($_POST["workId"], FILTER_VALIDATE_INT);
        $otherIds = readIdList($_POST["projectIds"]);
    } else {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Invalid parameters. Either projectId+workIds or workId+projectIds must be provided.'));
        die;
    }

    if ($ownerId === false || $otherIds === null) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'IDs must be whole numbers'));
        die;
    }

    try {
        replaceLinks($conn, $ownerColumn, $ownerId, $otherIds);
    } catch (Exception $e) {
        error_log('worksOfProjectsAPI: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(array('status' => 'error', 'message' => 'Could not save; nothing was changed'));
        die;
    }

    echo json_encode(array('status' => 'success', 'ids' => $otherIds));
    die;
}
