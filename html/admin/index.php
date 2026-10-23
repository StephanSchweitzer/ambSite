<?php
session_start();
if (($_SESSION["ambar"] ?? null) != "connected")
{
  header("Location: ../signIn/signIn.php?status=needCredentials");
  die;
}
else
{
  header("Location: mainAdmin.php");
}

 ?>
