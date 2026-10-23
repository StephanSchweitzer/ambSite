<?php
include_once __DIR__ . '/../database/session.php';
include '../database/pdo.php';

// Failed sign-ins are counted per IP address. Five within an hour blocks
// that address until the hour has passed; a successful sign-in clears it.
const MAX_FAILED_ATTEMPTS = 5;

function recordFailedLogin($ip_address)
{
    global $conn;
    $stmt = $conn->prepare("SELECT attempts, attempt_time > (NOW() - INTERVAL 1 HOUR) AS recent
                            FROM login_attempts WHERE ip_address = ?");
    $stmt->execute(array($ip_address));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        // Mistakes from more than an hour ago no longer count
        $attempts = $row['recent'] ? $row['attempts'] + 1 : 1;
        $conn->prepare("UPDATE login_attempts SET attempts = ?, attempt_time = NOW() WHERE ip_address = ?")
             ->execute(array($attempts, $ip_address));
    } else {
        $conn->prepare("INSERT INTO login_attempts (ip_address, attempts, attempt_time) VALUES (?, 1, NOW())")
             ->execute(array($ip_address));
    }
}

function isIpBlocked($ip_address)
{
    global $conn;
    $stmt = $conn->prepare("SELECT attempts FROM login_attempts
                            WHERE ip_address = ? AND attempt_time > (NOW() - INTERVAL 1 HOUR)");
    $stmt->execute(array($ip_address));
    $attempts = $stmt->fetchColumn();
    return $attempts !== false && $attempts >= MAX_FAILED_ATTEMPTS;
}

function clearFailedLogins($ip_address)
{
    global $conn;
    $conn->prepare("DELETE FROM login_attempts WHERE ip_address = ?")->execute(array($ip_address));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header("Location: signIn.php");
    die;
}

$user_ip = $_SERVER['REMOTE_ADDR'];

if (isIpBlocked($user_ip)) {
    header("Location: signIn.php?status=blocked");
    die;
}

$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

$stmt = $conn->prepare("SELECT username, password FROM users WHERE username = ?");
$stmt->execute(array($username));
$row = $stmt->fetch(PDO::FETCH_ASSOC);

if (!is_array($row) || !password_verify($password, $row['password'])) {
    recordFailedLogin($user_ip);
    header("Location: signIn.php?status=incorrect");
    die;
}

clearFailedLogins($user_ip);

// A fresh session ID at sign-in, so an ID picked up before signing in is useless
session_regenerate_id(true);
$_SESSION["ambar"] = "connected";

header("Location: ../admin/mainAdmin.php");
die;
