<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="../admin/admin.css?v=<?php echo filemtime(__DIR__ . '/../admin/admin.css'); ?>">
  <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
  <title>Sign In</title>
</head>
<body>

<div class="signin-page">
  <div class="main-content signin-box">
    <div class="signin-brand">Ambar Velasco</div>
    <h1 class="admin-title">Sign In</h1>

    <!-- Status message, if any -->
    <?php
      $messages = array(
        'needCredentials' => 'Please sign in to continue.',
        'incorrect' => 'That username or password is not right. Please try again.',
        'blocked' => 'Too many tries in a row. Please wait an hour, then try again.',
      );
      $status = $_GET['status'] ?? '';
      if (isset($messages[$status])) {
        echo "<div class='alert alert-danger text-center' role='alert'>" . $messages[$status] . "</div>";
      }
    ?>

    <div class="signin-form">
      <form action="verifySignIn.php" method="post">
        <div class="form-group mb-3">
          <label for="username" class="form-label">Username</label>
          <input type="text" class="form-control" id="username" name="username" placeholder="Username" autocomplete="username">
        </div>
        <div class="form-group mb-4">
          <label for="password" class="form-label">Password</label>
          <input type="password" class="form-control" name="password" id="password" placeholder="Password" autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary btn-lg w-100">Submit</button>
      </form>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-kenU1KFdBIe4zVF0s0G1M5b4hcpxyD9F7jL+jjXkk+Q2h455rYXK/7HAuoJl+0I4" crossorigin="anonymous"></script>
</body>
</html>

