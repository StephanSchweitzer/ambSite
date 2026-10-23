<?php

global $conn;
session_start();
include '../database/pdo.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
    $worksIds = isset($_GET['projectIds']) && is_array($_GET['projectIds']) ? $_GET['projectIds'] : array();

    // Visitors only ever see visible works; the admin pages also need the
    // hidden/trashed ones, so the filter is dropped for a signed-in admin.
    $isAdmin = ($_SESSION["ambar"] ?? null) == "connected";
    $visibleCondition = $isAdmin ? "" : " AND visible = 1";

    $query = "SELECT workId, fileLocation, name, desc2, desc3, medium,
              color, isAvailable, year, orderOfDisplay, carousel, isSelectWork,
              long_description
              FROM allWorks
              WHERE workId = ?" . $visibleCondition;
    $pictureQuery = $conn->prepare($query);

    $data = array();

    foreach ($worksIds as $workId) {
        $pictureQuery->execute(array($workId));
        $row = $pictureQuery->fetch();

        if ($row) {
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
                'isSelectWork' => $row['isSelectWork'],
                'long_description' => $row['long_description']
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
