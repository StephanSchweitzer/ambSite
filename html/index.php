<?php
header('Content-Type: text/html; charset=UTF-8');
?>

<!DOCTYPE html>
<html lang="en" dir="ltr">
<link rel="stylesheet" href="ambar.css">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Cache-Control" content="no-cache">
    <title>Ambar Velasco Portfolio</title>
    <meta name="description" content="Professional Website, Artistic Portfolio, and E-Shop of Ambar Velasco">
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.0/jquery.min.js"></script>
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">

    <link rel="icon" type="image/x-icon" href="imgMid/transpLeafStack.ico">
    <script src="js/navLinksFunctions.js" defer></script>
    <script src="js/photoFunctions.js" defer></script>
    <script src="js/shopFunctions.js" defer></script>
    <link rel="stylesheet" href="ambar.css">
    <meta name="viewport" content="width=device-width, initial-scale=1">

</head>
<body>
<h1 hidden>Ambar Velasco's Portfolio</h1>
<div id="whiteForTheTopMaybe">

</div>
<div class="headerNoMove" id="modifyZIndex">
    <div id="blockForHeader" class="blockForHeader">
        <a href="index.php"><img src="imgMid/colorAmbarNew.png" id="ambName" fetchpriority="high" class="ambarNamePic"
                                 alt="Ambar Velasco Logo"></img></a>
    </div>
</div>

<div id="sideBySide">
    <div id="navLinksBox" class="navLinksBox">

        <!-- <a href="https://www.etsy.com/fr/shop/ARTBYAMBAR" target="_blank" class="mainLinkGenres" onclick="selectWorksAreShown = false;">Shop</a> -->
        <a href="#" class="mainLinkGenres" onclick="selectWorksAreShown = false; loadShop()">Shop</a>
        <br>
        <br>

        <a href="#" class="mainLinkGenres"
           onclick="getProjectsAndWorks(); toggleSublinks(event, 'selectProjectCategories'); selectWorksAreShown = true;">Select
            Works</a>

        <div id="selectProjectCategories" class="hiddenLinkStuff">
        </div>

        <div id="breaksForTitles">
            <br>
        </div>

        <a href="#" class="mainLinkGenres" onclick="openInfo(); selectWorksAreShown = false">About</a>
        <br>
        <br>

        <a class="mainLinkGenres" href="https://www.instagram.com/ambar_velasc0/" target="_blank">Instagram</a>

    </div>
    <div id="imagesAndContent" class="imagesAndContent">

    </div>


    <div class="modal fade bd-example-modal-sm" id="bigPicModal" tabindex="-1" role="dialog"
         aria-labelledby="myLargeModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="centerLargePhoto">
                    <img id="popUpImage" class="popUpImage" alt="largeImage">
                </div>
                <div id="imageInfo" class="imageInfo">
                    <h2 id="imageTitle">fs</h2>
                    <p id="imageDescription">test</p>
                </div>
            </div>
        </div>
    </div>


    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

</body>
</html>

<!-- <button type="button" class="btn btn-primary" data-toggle="modal" data-target="#bigPicModal">See big pic</button> -->
