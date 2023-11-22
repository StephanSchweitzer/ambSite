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
   <!-- IE 11 compatibility -->
   <meta http-equiv="X-UA-Compatible" content="IE=edge">
   <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
   <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-0evHe/X+R7YkIZDRvuzKMRqM+OrBnVFBL6DOitfPri4tjfHxaWutUpFmBp4vmVor" crossorigin="anonymous">
   <meta charset="utf-8">
   <link rel="icon" type="image/x-icon" href="../imgMid/transpLeafStack.ico">
   <title>Main page</title>
 </head>
 <body>

   <div class="container" style="background-color:white;">
     <br>
     <h1 class="display-1 text-primary" style="text-align:center;">Main admin page</h1>
     <br>
     <a href="pictureAdmin.php"><button type="submit" class="btn btn-info">Change Pictures</button></a>
    <a href="manageProjects.php"><button type="submit" class="btn btn-info">Manage Projects</button></a>
    <a href="aboutMeAdmin.php"><button type="submit" class="btn btn-info">Manage About</button></a>
    <a href="shopAdmin.php"><button type="submit" class="btn btn-info">Manage Shop</button></a>

<br>




     <br><br>
   </div>

<div class="container" style="background-color:white;">
    <form action="../signIn/logout.php" method="post">
    <button type="submit">Logout</button>
</form>
</div>

     <br><br>
   </div>
   <script type="text/javascript" href="../bootstrap/bootstrap-sncf.min.js"></script>
 </body>
 </html>
