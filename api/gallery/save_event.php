<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils.php';

$event_id = isset($_POST['event_id']) ? (int)$_POST['event_id'] : 0;
$title = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$location = trim($_POST['location'] ?? '');
$event_date = normalize_date($_POST['event_date'] ?? '');
$category = trim($_POST['category'] ?? '');
$photographer = trim($_POST['photographer'] ?? '');
$tags = trim($_POST['tags'] ?? '');

if ($title === '') {
  json_response(['error' => 'Title required'], 400);
}

$uploadDir = __DIR__ . '/../../uploads/gallery/';
$thumbDir = __DIR__ . '/../../uploads/gallery/thumbs/';
ensure_dir($uploadDir);
ensure_dir($thumbDir);

$existing_map = json_decode($_POST['existing_images'] ?? '{}', true);
if (!is_array($existing_map)) $existing_map = [];

$order_keys = json_decode($_POST['order_keys'] ?? '[]', true);
if (!is_array($order_keys)) $order_keys = [];

$cover_key = $_POST['cover_key'] ?? '';
$videos = json_decode($_POST['videos'] ?? '[]', true);
if (!is_array($videos)) $videos = [];

$key_to_path = $existing_map;
$maxSize = 8 * 1024 * 1024;

if (!empty($_FILES['images']) && is_array($_FILES['images']['name'])) {
  $image_keys = $_POST['image_keys'] ?? [];
  $count = count($_FILES['images']['name']);
  for ($i = 0; $i < $count; $i++) {
    $name = $_FILES['images']['name'][$i] ?? '';
    $tmp = $_FILES['images']['tmp_name'][$i] ?? '';
    $size = (int)($_FILES['images']['size'][$i] ?? 0);
    $err = (int)($_FILES['images']['error'][$i] ?? 0);
    $key = $image_keys[$i] ?? ('upload_'.$i);
    if ($err !== UPLOAD_ERR_OK || !$tmp) continue;
    if ($size > $maxSize) continue;
    $ext = safe_ext($name);
    if (!$ext) continue;
    $filename = uniqid('gallery_', true) . '.' . $ext;
    $fullRel = 'uploads/gallery/' . $filename;
    $fullAbs = $uploadDir . $filename;
    $thumbAbs = $thumbDir . $filename;
    $ok = resize_image($tmp, $fullAbs, 1920, 1920, $ext, 82);
    if (!$ok) {
      move_uploaded_file($tmp, $fullAbs);
    }
    resize_image($tmp, $thumbAbs, 600, 600, $ext, 80);
    $key_to_path[$key] = $fullRel;
  }
}

// Determine ordered paths
$ordered_paths = [];
if (!empty($order_keys)) {
  foreach ($order_keys as $k) {
    if (isset($key_to_path[$k])) {
      $ordered_paths[] = $key_to_path[$k];
    }
  }
} else {
  foreach ($key_to_path as $p) $ordered_paths[] = $p;
}

if (empty($ordered_paths)) {
  json_response(['error' => 'At least one image is required'], 400);
}

$cover_image = '';
if ($cover_key && isset($key_to_path[$cover_key])) {
  $cover_image = $key_to_path[$cover_key];
} else {
  $cover_image = $ordered_paths[0];
}

if ($event_id > 0) {
  $stmt = $mysqli->prepare("UPDATE gallery_events SET title=?, description=?, location=?, event_date=?, category=?, cover_image=?, photographer=?, tags=? WHERE id=?");
  $stmt->bind_param('ssssssssi', $title, $description, $location, $event_date, $category, $cover_image, $photographer, $tags, $event_id);
  $stmt->execute();
} else {
  $stmt = $mysqli->prepare("INSERT INTO gallery_events (title, description, location, event_date, category, cover_image, photographer, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())");
  $stmt->bind_param('ssssssss', $title, $description, $location, $event_date, $category, $cover_image, $photographer, $tags);
  $stmt->execute();
  $event_id = $stmt->insert_id;
}

// Fetch existing images to delete removed ones
$existing_db = [];
if ($event_id > 0) {
  $imgRes = $mysqli->query("SELECT image_path FROM gallery_images WHERE event_id = {$event_id}");
  while ($r = $imgRes->fetch_assoc()) $existing_db[] = $r['image_path'];
}

// Replace images
$mysqli->query("DELETE FROM gallery_images WHERE event_id = {$event_id}");
foreach ($ordered_paths as $idx => $path) {
  $is_cover = ($path === $cover_image) ? 1 : 0;
  $order = $idx + 1;
  $stmt = $mysqli->prepare("INSERT INTO gallery_images (event_id, image_path, is_cover, sort_order) VALUES (?, ?, ?, ?)");
  $stmt->bind_param('isii', $event_id, $path, $is_cover, $order);
  $stmt->execute();
}

// Delete removed files
$to_keep = array_unique($ordered_paths);
foreach ($existing_db as $old) {
  if (!in_array($old, $to_keep, true)) {
    $full = __DIR__ . '/../../' . $old;
    $thumb = __DIR__ . '/../../' . str_replace('uploads/gallery/', 'uploads/gallery/thumbs/', $old);
    if (file_exists($full)) @unlink($full);
    if (file_exists($thumb)) @unlink($thumb);
  }
}

// Replace videos
$mysqli->query("DELETE FROM gallery_videos WHERE event_id = {$event_id}");
foreach ($videos as $v) {
  $url = trim($v);
  if ($url === '') continue;
  $stmt = $mysqli->prepare("INSERT INTO gallery_videos (event_id, video_url) VALUES (?, ?)");
  $stmt->bind_param('is', $event_id, $url);
  $stmt->execute();
}

json_response(['ok' => true, 'event_id' => $event_id]);
