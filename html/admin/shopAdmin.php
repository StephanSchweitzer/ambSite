<?php
include_once __DIR__ . '/../database/session.php';
if (($_SESSION["ambar"] ?? null) != "connected")
{
  header("Location: ../signIn/signIn.php?status=needCredentials");
  die;
}
// The shop, all in one place: orders to send, the items for sale, delivery
// prices, promo codes and settings. Everything in the panel is drawn by
// js/shopAdminFunctions.js from actions/shopAdminAPI.php.
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
  <title>Shop - Admin</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css">
  <link rel="stylesheet" href="admin.css?v=<?php echo filemtime(__DIR__ . '/admin.css'); ?>">
  <link rel="stylesheet" href="shopAdmin.css?v=<?php echo filemtime(__DIR__ . '/shopAdmin.css'); ?>">
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min.js" integrity="sha384-ZvpUoO/+PpLXR1lu4jmpXWu80pZlYUAfxl5NsBMWOEPSjUn/6Z/hRTt8+pR6L4N2" crossorigin="anonymous"></script>
  <script src="../js/imagePrep.js"></script>
  <script src="../js/shopAdminFunctions.js?v=<?php echo filemtime(__DIR__ . '/../js/shopAdminFunctions.js'); ?>"></script>
</head>
<body>
<?php $ambAdminPage = 'shop'; include __DIR__ . '/adminNav.php'; ?>

<div class="admin-layout">
  <!-- Sidebar -->
  <div class="sidebar">
    <div class="admin-title">Shop Admin</div>

    <div class="sidebar-actions">
      <a href="/shop" target="_blank" rel="noopener" class="sa-button sa-light">
        <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> See the shop
      </a>
    </div>

    <nav class="sa-tabs view-options" id="tabs" aria-label="Shop sections" hidden>
      <div class="section-title">Sections</div>
      <button type="button" data-tab="orders" class="is-current"><i class="fas fa-box" aria-hidden="true"></i> Orders <span class="sa-count" id="toSendCount" hidden></span></button>
      <button type="button" data-tab="items"><i class="fas fa-tags" aria-hidden="true"></i> Items for sale</button>
      <button type="button" data-tab="delivery"><i class="fas fa-truck" aria-hidden="true"></i> Delivery</button>
      <button type="button" data-tab="promos"><i class="fas fa-percent" aria-hidden="true"></i> Promo codes</button>
      <button type="button" data-tab="emails"><i class="fas fa-envelope" aria-hidden="true"></i> Emails</button>
      <button type="button" data-tab="settings"><i class="fas fa-gear" aria-hidden="true"></i> Settings</button>
    </nav>
  </div>

  <!-- Main Content -->
  <div class="content-area">
    <div class="main-content">
      <div class="page-title-row">
        <h1 class="h3">Shop Administration</h1>
      </div>

      <!-- What still needs doing before the shop can take orders -->
      <div id="setup" class="sa-setup" hidden></div>

      <main id="panel" class="sa-panel"><p class="sa-muted">Loading&hellip;</p></main>
    </div>
  </div>
</div>

<!-- Picking a picture from the works, or the countries of a destination -->
<div id="overlay" class="sa-overlay" hidden>
  <div class="sa-sheet" role="dialog" aria-modal="true" aria-labelledby="overlayTitle">
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
