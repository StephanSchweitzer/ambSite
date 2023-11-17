<?php
  
include '../database/pdo.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET')
{

  $worksIds = $_GET['worksIds'];

  $query = "SELECT workId, fileLocation, name,
                    desc2, desc3, medium,
                    color, isAvailable, year,
                    orderOfDisplay, carousel,
                    isSelectWork
            FROM    allWorks
            WHERE id = ?
            ORDER BY orderOfDisplay DESC";

   $data = array();

  for ($i=0; $i < count($worksIds); $i++) {

  $pictureQuery = $conn->prepare($query);
  $pictureQuery->execute(array($worksIds[$i]);
  $result = $pictureQuery->fetchAll();

    $singleEntry = array(
      'id' => $result[$i][0],
      'location' => $result[$i][1],
      'name' => $result[$i][2],
      'firstDescription' => $result[$i][3],
      'secondDescription' => $result[$i][4],
      'medium' => $result[$i][5],
      'isColor' => $result[$i][6],
      'availability' => $result[$i][7],
      'creationYear' => $result[$i][8],
      'orderOfDisplay' => $result[$i][9],
      'carousel' => $result[$i][10],
      'isSelectWork' => $result[$i][11]
    );

    array_push($data, $singleEntry);
  }


  header('Content-Type: application/json');
  echo json_encode($data);

  die;
 }
?>