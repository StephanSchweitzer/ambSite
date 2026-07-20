<?php

session_start();

include '../database/pdo.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET')
{

  $activity = $_GET['activity'];

  $statusCondition = "WHERE available = 1 AND visible = 1 ";

  if ($activity == "inactive")
  {
    $statusCondition = "WHERE available = 0 AND visible = 1 ";
  }

  if ($activity == "invisible")
  {
    $statusCondition = "WHERE visible = 0 ";
  }

  $query = "SELECT id, name, productOrder, available, buttonCode, visible
            FROM    shopItems $statusCondition
            ORDER BY productOrder DESC";

  $projectQuery = $conn->prepare($query);
  $projectQuery->execute();
  $result = $projectQuery->fetchAll();

  $data = array();

  for ($i=0; $i < count($result); $i++) {

    $singleEntry = array(
      'id' => $result[$i][0],
      'name' => $result[$i][1],
      'productOrder' => $result[$i][2],
      'available' => $result[$i][3],
      'buttonCode' => $result[$i][4],
      'visible' => $result[$i][5]
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

  $name = $_POST["name"];
  $productOrder = $_POST["productOrder"];
  $available = $_POST["available"];
  $buttonCode = $_POST["buttonCode"];
  $visible = $_POST["visible"];

  $query = "INSERT INTO shopItems (name, productOrder, available, buttonCode, visible)
          VALUES (?, ?, ?, ?, ?)";



  $theArray = array($name, $productOrder, $available, $buttonCode, $visible);

  // echo json_encode(array('query' => $query, 'data' => $theArray));
  //   die;

  try {
    $uploadQuery = $conn->prepare($query);
    $uploadQuery->execute($theArray);
    echo json_encode(array('status' => 'success', 'data' => $theArray));
  } catch (PDOException $e) {

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
  $name = $_PATCH['name'];
  $productOrder = $_PATCH['productOrder'];
  $available = $_PATCH['available'];
  $buttonCode = $_PATCH['buttonCode'];
  $visible = $_PATCH["visible"];

  $theQuery = "UPDATE shopItems SET name = ?, productOrder = ?, available = ?, buttonCode = ?, visible = ? WHERE id = ?";

  $theArray = array($name, $productOrder, $available, $buttonCode, $visible, $id);
  
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

  $theQuery = "UPDATE shopItems SET visible = 0 WHERE id = ?";
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
