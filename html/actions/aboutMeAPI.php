<?php
// db.php should contain database connection code.
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

    // Set the picture location as "unavailable"
    $pictureLocation = "unavailable";

    // Prepare the SQL statement to avoid SQL injection
    $stmt = $conn->prepare("INSERT INTO aboutMe (description, pictureLocation) VALUES (?, ?)");

    // Bind the parameters to the SQL query
    $stmt->bind_param("ss", $description, $pictureLocation);

    // Execute the query
    if ($stmt->execute()) {
        // If successful, send a JSON response
        echo json_encode(array('status' => 'success'));
    } else {
        // If an error occurs, send a JSON error message
        echo json_encode(array('status' => 'error', 'message' => 'Failed to insert data'));
    }

    // Close the statement
    $stmt->close();

    // Close the DB connection
    $conn->close();
}


if ($_SERVER['REQUEST_METHOD'] === 'GET')
{
    $stmt = $conn->prepare("SELECT * FROM aboutMe ORDER BY id DESC LIMIT 1");

// Execute the query
    $stmt->execute();

// Fetch the most recent entry
    $mostRecentEntry = $stmt->fetch();

// Close the statement
    $stmt->close();

// Output the most recent entry as JSON
    header('Content-Type: application/json');
    echo json_encode($mostRecentEntry);

// Close the DB connection
    $conn->close();
}

?>
