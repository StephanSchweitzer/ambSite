<?php

session_start();

  if ($_SESSION["ambar"] != "connected")
  {
    header("Location: signIn/signIn.php?status=needCredentials");
    die;
  }

include '../database/pdo.php';

  $project = "";
  $project = $_GET['project'];
  
  //$activityCondition = "WHERE title =  ";


  $query = "SELECT id, title, description, orderOfDisplay, active, deleted
            FROM projects 
            WHERE title = ? AND deleted != 0
            ORDER BY orderOfDisplay DESC";

  $theArray = array($project);

  $projectQuery = $conn->prepare($query);
  $projectQuery->execute($theArray);
  $result = $projectQuery->fetchAll();
  
  $data = array();

  for ($i=0; $i < count($result); $i++) {

    $singleEntry = array(
      'id' => $result[$i][0],
      'title' => $result[$i][1],
      'description' => $result[$i][2],
      'orderOfDisplay' => $result[$i][3],
      'active' => $result[$i][4],
      'deleted' => $result[$i][5]
    );

    array_push($data, $singleEntry);
  }

  header('Content-Type: application/json');
  echo json_encode($data);

  die;

?>