<?php
include_once __DIR__ . '/../database/session.php';
if (($_SESSION["ambar"] ?? null) != "connected")
{
  header("Location: ../signIn/signIn.php?status=needCredentials");
  die;
}
// The shop, all in one place: orders to send, the items for sale, delivery
// prices and settings. Everything on the page is drawn by
// js/shopAdminFunctions.js from actions/shopAdminAPI.php.
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
  <title>Shop - Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Cormorant+Garamond:wght@500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="shopAdmin.css?v=<?php echo filemtime(__DIR__ . '/shopAdmin.css'); ?>">
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js"></script>
  <script src="../js/imagePrep.js"></script>
  <script src="../js/shopAdminFunctions.js?v=<?php echo filemtime(__DIR__ . '/../js/shopAdminFunctions.js'); ?>"></script>
</head>
<body>
<div class="sa-page">
  <header class="sa-top">
    <a href="mainAdmin.php" class="sa-back">&larr; Main admin page</a>
    <h1>Shop</h1>
    <a href="/shop" target="_blank" rel="noopener" class="sa-back">See the shop &rarr;</a>
  </header>

  <!-- What still needs doing before the shop can take orders -->
  <div id="setup" class="sa-setup" hidden></div>

  <nav class="sa-tabs" id="tabs" hidden>
    <button type="button" data-tab="orders" class="is-current">Orders <span class="sa-count" id="toSendCount" hidden></span></button>
    <button type="button" data-tab="items">Items for sale</button>
    <button type="button" data-tab="delivery">Delivery</button>
    <button type="button" data-tab="settings">Settings</button>
  </nav>

  <main id="panel" class="sa-panel"><p class="sa-muted">Loading&hellip;</p></main>
</div>

<!-- Picking a picture from the works, or the countries of a destination -->
<div id="overlay" class="sa-overlay" hidden>
  <div class="sa-sheet" role="dialog" aria-modal="true">
    <div class="sa-sheet-head">
      <h2 id="overlayTitle"></h2>
      <button type="button" class="sa-button sa-quiet" id="overlayClose">Close</button>
    </div>
    <div id="overlayBody" class="sa-sheet-body"></div>
    <div id="overlayFoot" class="sa-sheet-foot" hidden></div>
  </div>
</div>

<div id="toasts" class="sa-toasts" aria-live="polite"></div>

<script src="../js/adminSession.js"></script>
</body>
</html>
