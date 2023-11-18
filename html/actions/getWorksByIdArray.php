<?php
  
include '../database/pdo.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET')
{

  $worksIds = $_GET['projectIds'];

  // echo json_encode($worksIds);
  // die;

  $query = "SELECT workId, fileLocation, name,
                    desc2, desc3, medium,
                    color, isAvailable, year,
                    orderOfDisplay, carousel,
                    isSelectWork
            FROM    allWorks
            WHERE workId = ?";

   $data = array();

  foreach ($worksIds as $workId) {
        $query = "SELECT workId, fileLocation, name, desc2, desc3, medium,
                  color, isAvailable, year, orderOfDisplay, carousel, isSelectWork
                  FROM allWorks
                  WHERE workId = ?";
        
        $pictureQuery = $conn->prepare($query);
        $pictureQuery->execute(array($workId));
        $result = $pictureQuery->fetchAll();

        // Assuming each query returns only one row, access it directly
        if (!empty($result)) {
            $row = $result[0]; // Fetch the first row
            $singleEntry = array(
                'id' => $row['workId'],
                'location' => $row['fileLocation'],
                'name' => $row['name'],
                'firstDescription' => $row['desc2'],
                'secondDescription' => $row['desc3'],
                'medium' => $row['medium'],
                'isColor' => $row['color'],
                'availability' => $row['isAvailable'],
                'creationYear' => $row['year'],
                'orderOfDisplay' => $row['orderOfDisplay'],
                'carousel' => $row['carousel'],
                'isSelectWork' => $row['isSelectWork']
            );
            array_push($data, $singleEntry);
        }
    }

    usort($data, function($a, $b) {
    // Compare the orderOfDisplay attributes
    return $b['orderOfDisplay'] <=> $a['orderOfDisplay'];
});

  header('Content-Type: application/json');
  echo json_encode($data);

  die;
 }
?>