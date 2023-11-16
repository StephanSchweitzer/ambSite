<!DOCTYPE html>


<html lang="en" dir="ltr">
<head>
  <!-- IE 11 compatibility -->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-0evHe/X+R7YkIZDRvuzKMRqM+OrBnVFBL6DOitfPri4tjfHxaWutUpFmBp4vmVor" crossorigin="anonymous">
  <meta charset="utf-8">
  <link rel="icon" type="image/x-icon" href="../imgMid/transpLeafStack.ico">
  <title>Sign In</title>
</head>
<body>
  <br><br>
  <!-- <a href="createUser.php">Create user</a> -->

  <?php
  if(isset($_GET['status'])) {
    $status = htmlspecialchars($_GET["status"]);
    $message = "<div class='alert alert-danger' role='alert' style='text-align:center;'>
                ".$status."
                </div>";
    echo($message);
  }
   ?>

  <div class="container" style="background-color:white;">
    <br>
    <h1 class="display-1 text-primary" style="text-align:center;">Sign in</h1>
    <br>
    <form action="verifySignIn.php" method="post">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" class="form-control" id="username" name="username" placeholder="Username">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" class="form-control" name="password" id="password" placeholder="Password">
      </div>
      <br><br>
      <button type="submit" class="btn btn-primary">Submit</button>
    </form>


    <br><br>
  </div>
  <script type="text/javascript" href="../bootstrap/bootstrap-sncf.min.js"></script>
</body>
</html>
