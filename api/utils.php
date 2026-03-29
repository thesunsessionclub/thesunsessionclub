<?php
function json_response($data, $status = 200) {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}

function ensure_dir($path) {
  if (!is_dir($path)) {
    mkdir($path, 0777, true);
  }
}

function safe_ext($name) {
  $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
  $allowed = ['jpg', 'jpeg', 'png', 'webp'];
  return in_array($ext, $allowed, true) ? $ext : null;
}

function create_image_resource($tmpPath, $ext) {
  if ($ext === 'jpg' || $ext === 'jpeg') return imagecreatefromjpeg($tmpPath);
  if ($ext === 'png') return imagecreatefrompng($tmpPath);
  if ($ext === 'webp') return imagecreatefromwebp($tmpPath);
  return null;
}

function save_image_resource($img, $dest, $ext, $quality = 82) {
  if ($ext === 'jpg' || $ext === 'jpeg') return imagejpeg($img, $dest, $quality);
  if ($ext === 'png') {
    imagesavealpha($img, true);
    return imagepng($img, $dest, 6);
  }
  if ($ext === 'webp') return imagewebp($img, $dest, $quality);
  return false;
}

function resize_image($tmpPath, $destPath, $maxW, $maxH, $ext, $quality = 82) {
  $src = create_image_resource($tmpPath, $ext);
  if (!$src) return false;
  $w = imagesx($src);
  $h = imagesy($src);
  $ratio = min($maxW / $w, $maxH / $h, 1);
  $newW = (int)($w * $ratio);
  $newH = (int)($h * $ratio);
  $dst = imagecreatetruecolor($newW, $newH);
  if ($ext === 'png' || $ext === 'webp') {
    imagealphablending($dst, false);
    imagesavealpha($dst, true);
  }
  imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $w, $h);
  $ok = save_image_resource($dst, $destPath, $ext, $quality);
  imagedestroy($src);
  imagedestroy($dst);
  return $ok;
}

function normalize_date($dateStr) {
  if (!$dateStr) return null;
  $ts = strtotime($dateStr);
  if (!$ts) return null;
  return date('Y-m-d', $ts);
}
