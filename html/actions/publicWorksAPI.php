<?php
// Everything the public pages need about the artwork, in one request each:
//   ?view=projects        Works page: active projects, each with its works
//   ?view=currentProject  the Current Project page
//   ?view=carousel        the home page slideshow
//   ?view=work&id=N       one work, for a shared /work/N link
// Read-only, and only ever returns visible works.

global $conn;
include '../database/pdo.php';
include_once 'publicWorksFunctions.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(array('status' => 'error', 'message' => 'Method not allowed'));
    die;
}

$view = isset($_GET['view']) ? $_GET['view'] : 'projects';

try {
    if ($view === 'work') {
        $work = ambGetPublicWork($conn, isset($_GET['id']) ? $_GET['id'] : 0);
        if (!$work) {
            http_response_code(404);
            echo json_encode(array('status' => 'error', 'message' => 'Work not found'));
            die;
        }
        echo json_encode(array('status' => 'success', 'work' => $work));
    } elseif ($view === 'carousel') {
        echo json_encode(array('status' => 'success', 'works' => ambGetCarouselWorks($conn)));
    } elseif ($view === 'currentProject') {
        echo json_encode(array('status' => 'success', 'projects' => ambGetProjectsWithWorks($conn, 'currentProject')));
    } else {
        echo json_encode(array('status' => 'success', 'projects' => ambGetProjectsWithWorks($conn, 'active')));
    }
} catch (PDOException $e) {
    error_log('publicWorksAPI.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(array('status' => 'error', 'message' => 'Could not load works'));
}
die;
