<?php
// Admin pages call this every few minutes. It keeps the sign-in alive while
// a page is open, and tells the page when it has ended.
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store');
echo json_encode(array('signedIn' => ($_SESSION["ambar"] ?? null) === "connected"));
