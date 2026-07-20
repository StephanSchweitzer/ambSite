<?php
global $conn;
session_start();

include '../database/pdo.php';

// GET method with two different behaviors:
// 1. When projectId is provided, return all works for that project
// 2. When workId is provided, return all projects for that work
if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
    if (isset($_GET["projectId"])) {
        // Original functionality: Get all works for a project
        $projectId = $_GET["projectId"];

        // Simplified query - just get the workIds directly
        $query = "SELECT workId FROM worksInProjects WHERE projectId = ?";
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

// POST method with two different behaviors:
// 1. When projectId and workIds are provided, update project-works associations
// 2. When workId and projectIds are provided, update work-projects associations
if ($_SERVER['REQUEST_METHOD'] === 'POST')
{
    if ($_SESSION["ambar"] != "connected")
    {
        header("Location: signIn/signIn.php?status=needCredentials");
        die;
    }

    // Original functionality: Associate multiple works with a project
    if (isset($_POST["projectId"]) && isset($_POST["workIds"])) {
        $projectId = $_POST["projectId"];

        // Handle stringified array input
        if (is_string($_POST["workIds"]) && strpos($_POST["workIds"], '[') === 0) {
            $workIds = json_decode($_POST["workIds"]);
        } else {
            $workIds = $_POST["workIds"];
        }

        // Ensure workIds is an array, even if empty
        if (!is_array($workIds)) {
            $workIds = [];
        }

        // First delete all existing associations for this project
        $query = "DELETE FROM worksInProjects WHERE projectId = ?";
        $theArray = array($projectId);

        try {
            $uploadQuery = $conn->prepare($query);
            $uploadQuery->execute($theArray);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
            die;
        }

        // If we have works to add, insert them
        if (count($workIds) > 0) {
            $query = "INSERT INTO worksInProjects (projectId, workId) VALUES (?, ?)";

            foreach ($workIds as $workId)
            {
                $theArray = array($projectId, $workId);

                try {
                    $uploadQuery = $conn->prepare($query);
                    $uploadQuery->execute($theArray);
                } catch (PDOException $e) {
                    http_response_code(500);
                    echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
                    die;
                }
            }
        }

        echo json_encode(array('status' => 'success', 'ids' => $workIds));
    }
    // New functionality: Associate multiple projects with a work
    elseif (isset($_POST["workId"]) && isset($_POST["projectIds"])) {
        $workId = $_POST["workId"];

        // Handle stringified array input
        if (is_string($_POST["projectIds"]) && strpos($_POST["projectIds"], '[') === 0) {
            $projectIds = json_decode($_POST["projectIds"]);
        } else {
            $projectIds = $_POST["projectIds"];
        }

        // Ensure projectIds is an array, even if empty
        if (!is_array($projectIds)) {
            $projectIds = [];
        }

        // First delete all existing associations for this work
        $query = "DELETE FROM worksInProjects WHERE workId = ?";
        $theArray = array($workId);

        try {
            $deleteQuery = $conn->prepare($query);
            $deleteQuery->execute($theArray);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
            die;
        }

        // If we have projects to add, insert them
        $insertResults = [];
        if (count($projectIds) > 0) {
            $query = "INSERT INTO worksInProjects (projectId, workId) VALUES (?, ?)";

            foreach ($projectIds as $projectId)
            {
                $theArray = array($projectId, $workId);

                try {
                    $insertQuery = $conn->prepare($query);
                    $insertQuery->execute($theArray);
                    $insertResults[] = $projectId;
                } catch (PDOException $e) {
                    http_response_code(500);
                    echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
                    die;
                }
            }
        }

        echo json_encode(array('status' => 'success', 'projectIds' => $insertResults));
    }
    else {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Invalid parameters. Either projectId+workIds or workId+projectIds must be provided.'));
    }

    die;
}
?>