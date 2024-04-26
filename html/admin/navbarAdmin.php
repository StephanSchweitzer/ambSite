<?php
session_start();
if ($_SESSION["ambar"] != "connected")
{
  header("Location: ../signIn/signIn.php?status=needCredentials");
  die;
}

?>
<html lang="en" dir="ltr">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="admin.css">  <!-- Ensure this path is correct -->
    <link rel="icon" type="image/x-icon" href="../imgMid/transpLeafStack.ico">
    <title>Navbar Admin Page</title>
</head>
<body>

<div class="admin-container" style="align-content: center;">
   <div class="container">
     <br>
     <h1 class="display-1" style="text-align:center; color: white;">Navbar Admin</h1>
     <br>
     <a href="mainAdmin.php"><button type="submit" class="btn btn-info">Main Admin Page</button></a>
      <br>
      <br>
   </div>
    <br>
   <div style="max-width: 70vw; margin: 0 auto; ">
      <div id="allLinks" class="content-box" style="color: white"></div>
      <div class="content-section">
      <ul id="navbar">
          <li draggable="true" id="shopLinkRow">Shop</li>
          <li draggable="true" id="selectWorksLinkRow">Select Works</li>
          <li draggable="true" id="allWorksLinkRow">All Works</li>
          <li draggable="true" id="aboutMeLinkRow">About</li>
          <li draggable="true" id="instagramLinkRow">Instagram</li>
      </ul>
      <button id="uploadWorkButton" class="btn btn-primary" onclick="updateLinks()">Update </button>
      </div>
   </div>
</div>

<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
 <script src="../js/navbarAdmin.js"></script>

</body>
</html>