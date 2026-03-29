<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils.php';

$id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
if ($id <= 0) {
  json_response(['error' => 'Missing id'], 400);
}

$imgRes = $mysqli->query("SELECT image_path FROM gallery_images WHERE event_id = {$id}");
while ($r = $imgRes->fetch_assoc()) {
  $path = $r['image_path'];
  $full = __DIR__ . '/../../' . $path;
  $thumb = __DIR__ . '/../../' . str_replace('uploads/gallery/', 'uploads/gallery/thumbs/', $path);
  if (file_exists($full)) @unlink($full);
  if (file_exists($thumb)) @unlink($thumb);
}

$mysqli->query("DELETE FROM gallery_images WHERE event_id = {$id}");
$mysqli->query("DELETE FROM gallery_videos WHERE event_id = {$id}");
$mysqli->query("DELETE FROM gallery_events WHERE id = {$id}");

json_response(['ok' => true]);
