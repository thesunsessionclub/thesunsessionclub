<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../utils.php';

$sql = "SELECT e.*, COUNT(i.id) AS photo_count
        FROM gallery_events e
        LEFT JOIN gallery_images i ON i.event_id = e.id
        GROUP BY e.id
        ORDER BY e.event_date DESC, e.id DESC";
$res = $mysqli->query($sql);
if (!$res) {
  json_response(['error' => 'Query failed'], 500);
}

$rows = [];
while ($row = $res->fetch_assoc()) {
  $cover = $row['cover_image'] ?: '';
  $thumb = $cover ? str_replace('uploads/gallery/', 'uploads/gallery/thumbs/', $cover) : '';
  $rows[] = [
    'id' => (int)$row['id'],
    'title' => $row['title'],
    'description' => $row['description'],
    'location' => $row['location'],
    'event_date' => $row['event_date'],
    'category' => $row['category'],
    'cover_image' => $cover,
    'cover_thumb' => $thumb,
    'photographer' => $row['photographer'],
    'tags' => $row['tags'],
    'photo_count' => (int)$row['photo_count'],
    'created_at' => $row['created_at']
  ];
}

json_response($rows);
