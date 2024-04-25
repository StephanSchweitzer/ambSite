<?php
function createThumbnail($filePath, $targetDirectory, $fileName, $newWidth = 400) {
    // Get the original image's dimensions and type
    list($width, $height, $type) = getimagesize($filePath);

    // Calculate new dimensions to maintain aspect ratio
    $ratio = $newWidth / $width;
    $newHeight = $height * $ratio;

    // Create image resource of the original image based on its type
    switch ($type) {
        case IMAGETYPE_JPEG:
            $srcImage = imagecreatefromjpeg($filePath);
            break;
        case IMAGETYPE_PNG:
            $srcImage = imagecreatefrompng($filePath);
            break;
        case IMAGETYPE_GIF:
            $srcImage = imagecreatefromgif($filePath);
            break;
        default:
            die("Unsupported file type");
    }

    // Create a new true color image
    $thumbImage = imagecreatetruecolor($newWidth, $newHeight);

    // Copy and resize the old image into the new image
    imagecopyresampled($thumbImage, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

    // Save the resized image to the target directory with the original file name
    $savePath = $targetDirectory . $fileName;
    imagejpeg($thumbImage, $savePath, 90); // Adjust compression quality as needed

    // Clear memory
    imagedestroy($srcImage);
    imagedestroy($thumbImage);

    return "Thumbnail created at: " . $savePath;
}

