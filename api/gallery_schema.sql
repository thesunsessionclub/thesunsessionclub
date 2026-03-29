CREATE TABLE IF NOT EXISTS gallery_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  event_date DATE,
  category VARCHAR(120),
  cover_image VARCHAR(255),
  photographer VARCHAR(255),
  tags VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gallery_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  is_cover TINYINT(1) DEFAULT 0,
  sort_order INT DEFAULT 0,
  FOREIGN KEY (event_id) REFERENCES gallery_events(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gallery_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  video_url VARCHAR(500) NOT NULL,
  FOREIGN KEY (event_id) REFERENCES gallery_events(id) ON DELETE CASCADE
);
