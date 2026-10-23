<!DOCTYPE html>


<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="../admin/admin.css"> <!-- Path to your admin CSS file -->
  <link rel="icon" type="image/x-icon" href="../miscIcons/favicon.ico">
  <title>Sign In</title>
</head>
<body>

<div class="container vh-100">
  <div class="row h-100 justify-content-center align-items-center" >
    <div class="col-sm-12 col-md-8 col-lg-6" style="margin-top: -30vh">
      <div class="admin-container my-5 bg-dark text-white p-4 rounded">
        <!-- Status message, if any -->
        <?php
          if(isset($_GET['status'])) {
            $status = htmlspecialchars($_GET["status"]);
            echo "<div class='alert alert-danger text-center' role='alert'>".$status."</div>";
          }
        ?>

        <h1 class="admin-header text-center mb-4">Sign In</h1>
        <div class="signin-form">
          <form action="verifySignIn.php" method="post">
            <div class="form-group mb-3">
              <label for="username" class="form-label">Username</label>
              <input type="text" class="form-control" id="username" name="username" placeholder="Username">
            </div>
            <div class="form-group mb-3">
              <label for="password" class="form-label">Password</label>
              <input type="password" class="form-control" name="password" id="password" placeholder="Password">
            </div>
              <br>
            <button type="submit" class="btn btn-outline-light btn-lg">Submit</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>

