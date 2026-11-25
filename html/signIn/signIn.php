<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
    <?php $ambKeepSignedIn = false; $ambPageTitle = 'Sign in'; include __DIR__ . '/../admin/adminHead.php'; ?>
</head>
<body class="page-signin">

<div class="signin-page">
  <div class="main-content signin-box">
    <div class="signin-brand">Ambar Velasco</div>
    <h1 class="admin-title">Sign in</h1>

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
        <button type="submit" class="btn btn-primary btn-lg w-100">Sign in</button>
      </form>
    </div>
  </div>
</div>
</body>
</html>

