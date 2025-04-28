<?php
error_reporting(E_ALL);
global $conn;
session_start();


include '../database/pdo.php';


if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
    if (!isset($_GET["projectId"])) {
        http_response_code(400);
        echo json_encode(array('status' => 'error', 'message' => 'Project ID is required'));
        die;
    }

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

    die;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST')
{
	if ($_SESSION["ambar"] != "connected")
	{
		header("Location: signIn/signIn.php?status=needCredentials");
		die;
	}
	
	$projectId = $_POST["projectId"];
	$workIds = $_POST["workIds"];

	$query = "DELETE FROM worksInProjects WHERE projectId = ?";
	$theArray = array($projectId);

	try {
		$uploadQuery = $conn->prepare($query);
		$uploadQuery->execute($theArray);
	} catch (PDOException $e) {
		http_response_code(500);
		echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
	}

	$query = "INSERT INTO worksInProjects (projectId, workId)
	VALUES (?, ?)";

	foreach ($workIds as $workId) 
	{
		$theArray = array($projectId, $workId);

		try {
			$uploadQuery = $conn->prepare($query);
			$uploadQuery->execute($theArray);
		} catch (PDOException $e) {
			http_response_code(500);
			echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
		}

	}

	echo json_encode(array('status' => 'success', 'ids' => $workIds));


	die;
}

?>