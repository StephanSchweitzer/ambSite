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
 <!-- IE 11 compatibility -->
 <meta charset="utf-8">
 <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
 <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
 <!-- <link rel="stylesheet" href="../ambar.css"> -->

 <script src="../js/aboutMe.js"></script>



 <meta charset="utf-8">
 <link rel="icon" type="image/x-icon" href="../imgMid/transpLeafStack.ico">
 <title>About Me Admin Page</title>

 <style>
   .card {
     cursor: pointer;
   }

 </style>
</head>
<body>
 <!-- <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.4/jquery.min.js"></script> -->

 <div class="container" style="background-color:white;">
   <br>
   <h1 class="display-1 text-primary" style="text-align:center;">About Me Admin Page</h1>
   <br>
   <a href="mainAdmin.php"><button type="submit" class="btn btn-info">Main Admin Page</button></a>

   <br><br>
 </div>

 <div style="width:75%; text-align: center; margin: auto;">
  <h2>Current About Me</h2>
  <div id ="currentAboutMe"></div>
</div>
<br><br>

<div style="width:75%; text-align: center; margin: auto;">
  <h2>New About Me</h2>
  <textarea class="form-control" aria-label="With textarea" id="aboutMeText"></textarea>
  <br>
  <button id="uploadWorkButton" type="button" class="btn btn-primary" onclick="postNewAboutMe()">Upload Work</button>

</div>


<script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

</script>

</body>
</html>
