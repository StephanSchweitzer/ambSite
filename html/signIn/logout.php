<?php
include_once __DIR__ . '/../database/session.php';

// Unset all session variables
$_SESSION = array();

// Destroy the session (if there was one: see session.php)
if (session_status() === PHP_SESSION_ACTIVE) {
    session_destroy();
}

  header("Location: signIn.php?status=needCredentials");
  die;
?>
