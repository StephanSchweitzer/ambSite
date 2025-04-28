<?php

global $conn;
session_start();

include '../database/pdo.php';

function makeNewCurrentProject($id)
{
    global $conn;

    $theQuery = "UPDATE projects SET isCurrentProject = 0";
    $updateQuery = $conn->prepare($theQuery);
    $updateQuery->execute();

    $theQuery = "UPDATE projects SET isCurrentProject = 1 WHERE id = ?";
    $updateQuery = $conn->prepare($theQuery);
    $updateQuery->execute([$id]);
}


if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
  $activity = "";
  $activity = $_GET['activity'];
  
  $activityCondition = "WHERE active = 1 ";

  if($activity == 'inactive')
  {
    $activityCondition = "WHERE deleted = 0 and active = 0 ";
  }

  if($activity == 'deleted')
  {
    $activityCondition = "WHERE deleted = 1 ";
  }

  if($activity == 'currentProject')
  {
    $activityCondition = "WHERE isCurrentProject = 1 ";
  }

  if($activity == 'all')
  {
    $activityCondition = ""; // No condition to get all projects
  }


  $query = "SELECT id, title, description, orderOfDisplay, active, deleted, isCurrentProject
            FROM    projects $activityCondition
            ORDER BY orderOfDisplay DESC";

  $projectQuery = $conn->prepare($query);
  $projectQuery->execute();
  $result = $projectQuery->fetchAll();

  $data = array();

  for ($i=0; $i < count($result); $i++) {

    $singleEntry = array(
      'id' => $result[$i][0],
      'title' => $result[$i][1],
      'description' => $result[$i][2],
      'orderOfDisplay' => $result[$i][3],
      'active' => $result[$i][4],
      'deleted' => $result[$i][5],
      'isCurrentProject' => $result[$i][6]
    );

    array_push($data, $singleEntry);
  }

  header('Content-Type: application/json');
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

  $title = $_POST["title"];
  $description = $_POST["description"];
  $active = $_POST["active"];
  $orderOfDisplay = $_POST["orderOfDisplay"];
  $isCurrentProject = $_POST["isCurrentProject"];

  $query = "INSERT INTO projects (title, description, active, orderOfDisplay)
            VALUES (?, ?, ?, ?)";

  $theArray = array($title, $description, $active, $orderOfDisplay);


  //echo json_encode($theArray);
  // die;

  // $uploadQuery = $conn->prepare($query);
  // $uploadQuery->execute($theArray);

  try {
    $uploadQuery = $conn->prepare($query);
    $uploadQuery->execute($theArray);

    if ($isCurrentProject == 1)
    {
      $lastId = $conn->lastInsertId();
      makeNewCurrentProject($lastId);
    }

    echo json_encode(array('status' => 'success', 'data' => $theArray));

  } catch (PDOException $e) {
    // Handle the error appropriately
    http_response_code(500);
    echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
  }

  die;
}


if ($_SERVER['REQUEST_METHOD'] === 'PATCH')
{

  if ($_SESSION["ambar"] != "connected")
  {
    header("Location: signIn/signIn.php?status=needCredentials");
    die;
  }

  $rawData = file_get_contents('php://input');
  parse_str($rawData, $_PATCH);

  $id = $_PATCH['id'];
  $title = $_PATCH['title'];
  $description = $_PATCH['description'];
  $orderOfDisplay = $_PATCH['orderOfDisplay'];
  $active = $_PATCH['active'];
  $isCurrentProject = $_PATCH['isCurrentProject'];
  $restore = $_PATCH['restore'];

  if ($restore == "restore")
  {
    $query = "UPDATE projects SET deleted = 0 WHERE id = ?";
    $restoreQuery = $conn->prepare($query);
    $restoreQuery->execute([$id]);
  }

  $theQuery = "UPDATE projects SET title = ?, description = ?, active = ?, orderOfDisplay = ?, isCurrentProject = ? WHERE id = ?";
  $theArray = array($title, $description, $active, $orderOfDisplay, $isCurrentProject, $id);
  
  // echo json_encode($theArray);
  // die;

  $updateQuery = $conn->prepare($theQuery);

  try
  {
    $updateQuery->execute($theArray);

    if ($isCurrentProject == 1)
    {
      makeNewCurrentProject($id);
    }

    echo json_encode(array('status' => 'success', 'data' => $theArray));

  } catch (PDOException $e)
  {
    http_response_code(500);
    echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
  }

  die;
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE')
{

  if ($_SESSION["ambar"] != "connected")
  {
    header("Location: signIn/signIn.php?status=needCredentials");
    die;
  }

  $rawData = file_get_contents('php://input');
  parse_str($rawData, $_DELETE);

  //echo($rawData);
  // var_dump($_PATCH);
  // die;

  $id = $_DELETE['id'];

  $theQuery = "UPDATE projects SET deleted = 1, active = 0 WHERE id = ?";
  //echo $theQuery;

  $theArray = array($id);
  //var_dump($theArray);
  //die;

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
