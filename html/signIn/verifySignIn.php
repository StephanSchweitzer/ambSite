<?php

include '../database/pdo.php';

// Function to record a failed login attempt
function recordFailedLogin($ip_address) {
    global $conn; // Assuming $conn is your database connection variable

    // Check if the IP address is already in the database
    $stmt = $conn->prepare("SELECT attempts FROM login_attempts WHERE ip_address = ?");
    $stmt->bind_param("s", $ip_address);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // If exists, increment the attempts
        $row = $result->fetch_assoc();
        $attempts = $row['attempts'] + 1;
        $updateStmt = $conn->prepare("UPDATE login_attempts SET attempts = ?, attempt_time = NOW() WHERE ip_address = ?");
        $updateStmt->bind_param("is", $attempts, $ip_address);
        $updateStmt->execute();
    } else {
        // Otherwise, insert a new record
        $insertStmt = $conn->prepare("INSERT INTO login_attempts (ip_address, attempts) VALUES (?, 1)");
        $insertStmt->bind_param("s", $ip_address);
        $insertStmt->execute();
    }
}

// Function to check if the IP address is blocked
function isIpBlocked($ip_address) {
    global $conn;
    $maxAttempts = 5; // Set your threshold here

    $stmt = $conn->prepare("SELECT attempts FROM login_attempts WHERE ip_address = ? AND attempt_time > (NOW() - INTERVAL 1 HOUR)");
    $stmt->bind_param("s", $ip_address);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        return $row['attempts'] >= $maxAttempts;
    }

    return false;
}

if (isIpBlocked($user_ip)) {
    die("Your IP has been temporarily blocked due to too many failed login attempts.");
}

// Your existing login logic here...
// If login fails, call recordFailedLogin
// recordFailedLogin($user_ip);


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
  $user_ip = $_SERVER['REMOTE_ADDR'];
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
