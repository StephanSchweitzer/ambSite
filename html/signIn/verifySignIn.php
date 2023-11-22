<?php

error_reporting(E_ALL);

// Display errors on the page
ini_set('display_errors', 1);

include '../database/pdo.php';

// Function to record a failed login attempt
function recordFailedLogin($ip_address) {
    global $conn;
    // Check if the IP address is already in the database
    $stmt = $conn->prepare("SELECT attempts FROM login_attempts WHERE ip_address = :ip_address");
    $stmt->bindParam(":ip_address", $ip_address, PDO::PARAM_STR);
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        // If exists, increment the attempts
        $attempts = $result['attempts'] + 1;
        $updateStmt = $conn->prepare("UPDATE login_attempts SET attempts = :attempts, attempt_time = NOW() WHERE ip_address = :ip_address");
        $updateStmt->bindParam(":attempts", $attempts, PDO::PARAM_INT);
        $updateStmt->bindParam(":ip_address", $ip_address, PDO::PARAM_STR);
        $updateStmt->execute();
    } else {
        // Otherwise, insert a new record
        $insertStmt = $conn->prepare("INSERT INTO login_attempts (ip_address, attempts) VALUES (:ip_address, 1)");
        $insertStmt->bindParam(":ip_address", $ip_address, PDO::PARAM_STR);
        $insertStmt->execute();
    }
}

// Function to check if the IP address is blocked
function isIpBlocked($ip_address) {
    global $conn;
    $maxAttempts = 5; // Set your threshold here

    $stmt = $conn->prepare("SELECT attempts FROM login_attempts WHERE ip_address = :ip_address AND attempt_time > (NOW() - INTERVAL 1 HOUR)");

    // Bind the parameter using bindValue
    $stmt->bindValue(':ip_address', $ip_address, PDO::PARAM_STR);

    $stmt->execute();

    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        return $result['attempts'] >= $maxAttempts;
    }

    return false;
}



  $user_ip = $_SERVER['REMOTE_ADDR'];

if (isIpBlocked($user_ip)) {
    die("Your IP has been temporarily blocked due to too many failed login attempts.");
}


$username = $_POST['username'];
$password =  $_POST['password'];
$login = FALSE;

$success = $conn->prepare("SELECT username, password
    FROM users
    WHERE username = ?");

$success->execute([$username]);

$row = $success->fetch(PDO::FETCH_ASSOC);

if (is_array($row))
{

  if (password_verify($password, $row['password']))
  {
    $login = TRUE;
  }
}

if(!$login)
{

  recordFailedLogin($user_ip);
  
  header("Location: signIn.php?status=Incorrect login");
  die;
}

else if ($login) {
  //session_destroy();
  session_start();
  $_SESSION["ambar"] = "connected";
  header("Location: ../admin/mainAdmin.php");
  // die;
}
?>
