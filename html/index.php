<?php
header('Content-Type: text/html; charset=UTF-8');
 ?>

<!DOCTYPE html>
<html lang="en" dir="ltr">
<link rel="stylesheet" href="ambar.css">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Cache-Control" content="no-cache">
  <title>Portfolio</title>
  <meta name="description" content="Artistic Portfolio of Ambar Velasco">
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.0/jquery.min.js"></script>
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">

  <link rel="icon" type="image/x-icon" href="imgMid/transpLeafStack.ico">
  <script src="js/photoFunctions.js"></script>
  <link rel="stylesheet" href="ambar.css">

</head>
<body>
  <h1 hidden>Portfolio</h1>
  <div id="whiteForTheTopMaybe">

  </div>
  <div class="headerNoMove" id="modifyZIndex">
    <div id="blockForHeader" class="blockForHeader">
      <a href="index.php"><img src="imgMid/colorAmbar.png" id="ambName" fetchpriority="high" class="ambarNamePic" ></img></a>
    </div>
  </div>

<div id="sideBySide">
  <div id="navLinksBox" class="navLinksBox">
    <a href="https://www.etsy.com/fr/shop/ARTBYAMBAR" target="_blank" class="mainLinkGenres">Shop</a>
    <br>
    <br>

    <a href="#" class="mainLinkGenres" onclick="getProjectsAndWorks(); toggleSublinks(event, 'selectWorkCategories')">Select Works</a>

    <div id="selectWorkCategories" class="hiddenLinkStuff">
      <br>
      <a href="#" onclick="goToSection('test')">2023</a>
      <br>
      <a href="#" onclick="goToSection('test')">2021-2022</a>
      <br>
      <a href="#" onclick="goToSection('test')">2019-2020</a>
    </div>

    <br><br>

    <a href="#" class="mainLinkGenres" onclick="toggleSublinks(event, 'hiddenAbout')">About</a>
    <br>
    <div id="hiddenAbout" class="hiddenLinkStuff">
      <br>
      <a href="#" onclick="openInfo()">Bio</a>
      <br>
      <a href="mailto: ambarvelasco3@yahoo.com">Contact</a>
      <br>
    </div>
    <br>

      <a class="mainLinkGenres" href="https://www.instagram.com/ambar_velasc0/" target="_blank">Instagram</a>

  </div>
  <div id="imagesAndContent" class="imagesAndContent">

  </div>



  <div class="modal fade bd-example-modal-sm" id="bigPicModal" tabindex="-1" role="dialog" aria-labelledby="myLargeModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg" >
      <div class="modal-content">
        <div class="centerLargePhoto">
          <img id="popUpImage" class="popUpImage" alt="largeImage">
        </div>
      </div>
    </div>
  </div>

  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

</body>
</html>

<!-- <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#bigPicModal">See big pic</button> -->
