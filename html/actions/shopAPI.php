<?php

session_start();

include '../database/pdo.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
  $query = "SELECT id, name, order, available, buttonCode
            FROM    projects WHERE available = 1
            ORDER BY order DESC";

  $projectQuery = $conn->prepare($query);
  $projectQuery->execute();
  $result = $projectQuery->fetchAll();

  $data = array();

  for ($i=0; $i < count($result); $i++) {

    $singleEntry = array(
      'id' => $result[$i][0],
      'name' => $result[$i][1],
      'order' => $result[$i][2],
      'available' => $result[$i][3],
      'buttonCode' => $result[$i][4]
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
  $order = $_POST["order"];
  $available = $_POST["available"];
  $buttonCode = $_POST["buttonCode"];

  $query = "INSERT INTO shopItems; (name, order, available, buttonCode)
          VALUES (?, ?, ?, ?)";

  $theArray = array($name, $order, $available, $buttonCode);

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
  $order = $_PATCH['order'];
  $available = $_PATCH['available'];
  $active = $_PATCH['active'];
  $buttonCode = $_PATCH['buttonCode'];



  $theQuery = "UPDATE shopItems SET name = ?, order = ?, active = ?, available = ?, buttonCode = ? WHERE id = ?";

  $theArray = array($name, $order, $active, $available, $buttonCode, $id);
  
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

  $theQuery = "UPDATE shopItems SET active = 0 WHERE id = ?";
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
