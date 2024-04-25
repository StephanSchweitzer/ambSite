<?php

session_start();

include '../database/pdo.php';
include 'createThumbnails.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
  $theYear = "";
  $theYear = $_GET['theYear'];
  $yearCondition = "WHERE visible = 1 and isSelectWork = 0";

  // if($theYear == 0)
  // {
  //   $yearCondition = "WHERE visible = 1";
  // }

  // echo "$theYear";
  // die;

  if($theYear == 'invisible')
  {
    $yearCondition = "WHERE visible = 0";
  }

  if($theYear == 'Select Works')
  {
    $yearCondition = "WHERE visible = 1 AND isSelectWork  = 1";
  }

  if($theYear == '2020')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Illustration' AND (year = 2020 OR year = 2019)";
  }

  if($theYear == '2021')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Illustration' AND (year = 2021 OR year = 2022)";
  }

  if($theYear == '2022')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Illustration' AND (year = 2021 OR year = 2022)";
  }

  if($theYear == '2023')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Illustration' AND (year = 2023)";
  }

  if($theYear == 'Fixed Motion')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Fixed Motion'";
  }

  if($theYear == 'Tape Diaries')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Tape Diaries'";
  }

  if($theYear == 'Force')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Force'";
  }

  if($theYear == 'Drip')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Drip'";
  }

  if($theYear == 'Leaves / Petals')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Leaves / Petals'";
  }

  if($theYear == 'Where is my mind?')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Where is my mind?'";
  }

  if($theYear == 'Portraits')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Portraits'";
  }

  if($theYear == 'Illustration')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Illustration'";
  }

  if($theYear == 'Mise en scene')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Mise en scene'";
  }

  if($theYear == 'Paris')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Paris'";
  }

  if($theYear == 'In conversation with a flower')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'In conversation with a flower'";
  }

  if($theYear == 'Recyclart')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Recyclart'";
  }

  if($theYear == 'Bio')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Bio'";
  }

  if($theYear == 'Contact')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'Contact'";
  }

  if($theYear == 'CV')
  {
    $yearCondition = "WHERE visible = 1 AND medium = 'CV'";
  }

  $query = "SELECT workId, fileLocation, name,
                    desc2, desc3, medium,
                    color, isAvailable, year,
                    orderOfDisplay, carousel,
                    isSelectWork, visible
            FROM    allWorks $yearCondition
            ORDER BY orderOfDisplay DESC";

  if($theYear == 'carousel')
  {
    $query = "SELECT
                      workId, fileLocation, name,
                      desc2, desc3, medium,
                      color, isAvailable, year,
                      orderOfDisplay, isSelectWork, visible
              FROM    allWorks
              WHERE carousel = 1
              ORDER BY orderOfDisplay DESC";
  }

  if ($theYear == 'projectsAPI')
  {
        $query = "SELECT
                      workId, fileLocation, name,
                      desc2, desc3, medium,
                      color, isAvailable, year,
                      orderOfDisplay, isSelectWork, visible
              FROM    allWorks
              WHERE isSelectWork = 1
              ORDER BY name ASC";
  }

  $pictureQuery = $conn->prepare($query);
  $pictureQuery->execute();
  $result = $pictureQuery->fetchAll();

  $data = array();

  for ($i=0; $i < count($result); $i++) {

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
      'isSelectWork' => $result[$i][11],
      'visible' => $result[$i][12]
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

  $photo = $_FILES['photo'];

  $locationName = $photo['name'];

  $fileLocation = $locationName;
  $name = $_POST["name"];
  $desc2 = $_POST["firstDescription"];
  $desc3 = $_POST["secondDescription"];
  $medium = $_POST["medium"];
  $color = $_POST["isColor"];
  $isAvailable = $_POST["availability"];
  $year = $_POST["creationYear"];
  $orderOfDisplay = $_POST["orderOfDisplay"];
  $carousel = $_POST["carousel"];
  $selectWork = $_POST["selectWork"];

  // Check if a photo was uploaded successfully
  if ($photo['error'] === UPLOAD_ERR_OK) {
      $tempFilePath = $photo['tmp_name'];

      $destination = '../baseImages/' . $photo['name'];
      $thumbnailDirectory = '../thumbnails/';
      move_uploaded_file($tempFilePath, $destination);
      $thumbString = createThumbnail($destination, $thumbnailDirectory, $photo['name']);
    }

  $query = "INSERT INTO allWorks (fileLocation, name, desc2,
                    desc3, medium, color,
                    isAvailable, year, OrderOfDisplay,
                    carousel, isSelectWork)
            VALUES (?, ?, ?, 
                    ?, ?, ?, 
                    ?, ?, ?, 
                    ?, ?
            )";

  $theArray = array($fileLocation, $name, $desc2, 
    $desc3, $medium, $color, 
    $isAvailable, $year, $orderOfDisplay, 
    $carousel, $selectWork,);

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
  $name = $_PATCH['name'];
  $firstDescription = $_PATCH['firstDescription'];
  $secondDescription = $_PATCH['secondDescription'];
  $medium = $_PATCH['medium'];
  $isColor = $_PATCH['isColor'];
  $availability = $_PATCH['availability'];
  $creationYear = $_PATCH['creationYear'];
  $orderOfDisplay = $_PATCH['orderOfDisplay'];
  $carousel = $_PATCH['carousel'];
  $selectWork = $_PATCH['selectWork'];

  $restoreTest = $_PATCH['restore'];

  if ($restoreTest == "restore")
  {
    $theQuery = "UPDATE allWorks SET visible = 1 WHERE workID = ?";
    $theArray = array($id);
    $updateQuery = $conn->prepare($theQuery);

    if ($updateQuery->execute($theArray)) {
        echo "Work restored successfully!";
    } else {
        echo "Error: ";
    }
    die;
  }

  $theQuery = "UPDATE allWorks SET name = ?, desc2 = ?, desc3 = ?, medium = ?, color = ?, isAvailable = ?, year = ?, orderOfDisplay = ?, carousel = ?, isSelectWork = ? WHERE workID = ?";

  $theArray = array($name, $firstDescription, $secondDescription, $medium, $isColor, $availability, $creationYear, $orderOfDisplay, $carousel, $selectWork, $id,);
  
  // echo json_encode($theArray);
  // die;

  $updateQuery = $conn->prepare($theQuery);

  if ($updateQuery->execute($theArray)) {
      echo "Data updated successfully!";
  } else {
      echo "Error: ";
  }

  if ($selectWork == 0)
  {
    $theQuery = "DELETE FROM worksInProjects WHERE workId = ?";
    $theArray = array($id);

      $updateQuery = $conn->prepare($theQuery);

  if ($updateQuery->execute($theArray)) {
      echo "Deleted from projects!";
  } else {
      echo "Error: ";
  }

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

  $theQuery = "UPDATE allWorks SET visible = 0 WHERE workID = ?";
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
