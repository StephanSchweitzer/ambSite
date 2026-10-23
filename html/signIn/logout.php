<?php
include_once __DIR__ . '/../database/session.php';

// Unset all session variables
$_SESSION = array();

// Destroy the session
session_destroy();

  header("Location: signIn.php?status=needCredentials");
  die;
?>
