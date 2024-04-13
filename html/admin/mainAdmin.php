<?php
session_start();
if ($_SESSION["ambar"] != "connected")
{
  header("Location: ../signIn/signIn.php?status=needCredentials");
  die;
}

 ?>

 <!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="admin.css"> <!-- Link to your custom admin CSS -->
    <meta charset="utf-8">
    <link rel="icon" type="image/x-icon" href="../imgMid/transpLeafStack.ico">
    <title>Main Admin Page</title>
</head>
<body>

<div class="container admin-container my-5">
    <h1 class="admin-header text-center mb-4">Main Admin</h1>
    <div class="d-grid gap-3">
        <a href="pictureAdmin.php" class="btn btn-outline-primary btn-lg" role="button">Change Pictures</a>
        <a href="manageProjects.php" class="btn btn-outline-primary btn-lg" role="button">Manage Projects</a>
        <a href="aboutMeAdmin.php" class="btn btn-outline-primary btn-lg" role="button">Manage About</a>
        <a href="shopAdmin.php" class="btn btn-outline-primary btn-lg" role="button">Manage Shop</a>
    </div>
    <form action="../signIn/logout.php" method="post" class="mt-4">
        <button type="submit" class="btn btn-danger btn-lg">Logout</button>
    </form>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
