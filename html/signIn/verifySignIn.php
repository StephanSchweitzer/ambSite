<?php

include '../database/pdo.php';

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
