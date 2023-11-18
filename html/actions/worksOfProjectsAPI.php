<?php 

session_start();

include '../database/pdo.php';


if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
	$projectId = $_GET["projectId"];

	$query = "SELECT workId FROM worksInProjects WHERE projectId = ?";
	$theArray = array($projectId);

	try {
		$getWorkIdsQuery = $conn->prepare($query);
		$getWorkIdsQuery->execute($theArray);
	} catch (PDOException $e) {
		http_response_code(500);
		echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
	}

	$result = $getWorkIdsQuery->fetchAll();

	$data = array();

  for ($i=0; $i < count($result); $i++) {

    array_push($data, $result[$i][0]);
  }

	echo json_encode($data);

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