<?php
$host= "localhost";
$dbusername= "bubbersUserStuff2023";
$dbpassword = "goodCoffeeIsNice!AmbarDrinks2?3?";
$dbname = "ambSite";

try
{
  $conn = new PDO("mysql:host=$host;dbname=$dbname", $dbusername, $dbpassword);
} catch (PDOException $pe)
{
  echo($pe);
  //header("Location: signIn.php?status=badConnection");
  die;
}
 ?>
