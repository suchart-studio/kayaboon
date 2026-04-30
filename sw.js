const CACHE_NAME = 'trash-fund-pwa-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// ติดตั้ง Service Worker และบันทึกไฟล์พื้นฐานลง Cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// ดึงข้อมูลจาก Cache มาใช้ถ้ามี เพื่อให้โหลดเร็วขึ้น
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // ถ้าเจอใน Cache ให้ส่งคืน ถ้าไม่เจอให้ไปดึงจาก Network ตามปกติ
        return response || fetch(event.request);
      })
  );
});