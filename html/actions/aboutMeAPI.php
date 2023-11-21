<?php
session_start();

include '../database/pdo.php';

// Check if it's a POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') 
{

    if ($_SESSION["ambar"] != "connected")
    {
        header("Location: signIn/signIn.php?status=needCredentials");
        die;
    }

    // Retrieve the description from the POST data
    $description = isset($_POST['description']) ? $_POST['description'] : '';

    //echo json_encode($description);

    // Set the picture location as "unavailable"
    $pictureLocation = "unavailable";

    $theArray = array($description, $pictureLocation);

    try {
    $stmt = $conn->prepare("INSERT INTO aboutMe (description, pictureLocation) VALUES (?, ?)");

    $stmt->execute($theArray);
    echo json_encode(array('status' => 'success', 'data' => $theArray));
    } catch (PDOException $e) {
    // Handle the error appropriately
    http_response_code(500);
    echo json_encode(array('status' => 'error', 'message' => $e->getMessage()));
  }
  die;
}


if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
    $stmt = $conn->prepare("SELECT * FROM aboutMe ORDER BY id DESC LIMIT 1");

// Execute the query
    $stmt->execute();

// Fetch the most recent entry
    $mostRecentEntry = $stmt->fetch();

// Output the most recent entry as JSON
    header('Content-Type: application/json');
    echo json_encode($mostRecentEntry);

}

?>
