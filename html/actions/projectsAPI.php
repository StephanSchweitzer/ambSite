<?php

session_start();

include '../database/pdo.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
  $activity = "";
  $activity = $_GET['activity'];
  
  $activityCondition = "WHERE active = 1";

  if($activity == 'active')
  {
    $activityCondition = "WHERE visible = 1";
  }

  if($activity == 'invisible')
  {
    $activityCondition = "WHERE active = 0";
  }


  $query = "SELECT id, title, description,
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

  // Check if a photo was uploaded successfully
  if ($photo['error'] === UPLOAD_ERR_OK) {
      $tempFilePath = $photo['tmp_name'];

      // Move the uploaded photo to a desired location
      $destination = '../baseImages/' . $photo['name'];
      move_uploaded_file($tempFilePath, $destination);
    }

  $query = "INSERT INTO projects (title, description, active)
            VALUES (?, ?, ?
            )";

  $theArray = array($title, $description, $active);

  // echo json_encode($theArray);
  // die;

  $uploadQuery = $conn->prepare($query);
  $uploadQuery->execute($theArray);

  echo json_encode("success");
  //$uploadQuery->close();
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
  $active = $_PATCH['active'];

  $theQuery = "UPDATE projects SET title = ?, description = ?, active = ? WHERE id = ?";

  $theArray = array($title, $description, $active, $id);
  
  // echo json_encode($theArray);
  // die;

  $updateQuery = $conn->prepare($theQuery);

  if ($updateQuery->execute($theArray)) {
      echo "Data updated successfully!";
  } else {
      echo "Error: ";
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

  $theQuery = "UPDATE projects SET active = 0 WHERE id = ?";
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
