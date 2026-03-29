<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils.php';

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
  json_response(['error' => 'Missing id'], 400);
}

$stmt = $mysqli->prepare("SELECT * FROM gallery_events WHERE id = ?");
$stmt->bind_param('i', $id);
$stmt->execute();
$eventRes = $stmt->get_result();
$event = $eventRes->fetch_assoc();
if (!$event) {
  json_response(['error' => 'Not found'], 404);
}

$imgRes = $mysqli->query("SELECT id, image_path, is_cover, sort_order FROM gallery_images WHERE event_id = {$id} ORDER BY sort_order ASC");
$images = [];
while ($img = $imgRes->fetch_assoc()) {
  $path = $img['image_path'];
  $images[] = [
    'id' => (int)$img['id'],
    'image_path' => $path,
    'thumb_path' => str_replace('uploads/gallery/', 'uploads/gallery/thumbs/', $path),
    'is_cover' => (int)$img['is_cover'] === 1,
    'sort_order' => (int)$img['sort_order']
  ];
}

$vidRes = $mysqli->query("SELECT id, video_url FROM gallery_videos WHERE event_id = {$id}");
$videos = [];
while ($v = $vidRes->fetch_assoc()) {
  $videos[] = [
    'id' => (int)$v['id'],
    'video_url' => $v['video_url']
  ];
}

json_response([
  'event' => [
    'id' => (int)$event['id'],
    'title' => $event['title'],
    'description' => $event['description'],
    'location' => $event['location'],
    'event_date' => $event['event_date'],
    'category' => $event['category'],
    'cover_image' => $event['cover_image'],
    'photographer' => $event['photographer'],
    'tags' => $event['tags'],
    'created_at' => $event['created_at']
  ],
  'images' => $images,
  'videos' => $videos
]);
