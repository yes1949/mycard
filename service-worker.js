// service-worker.js

// 步骤 1: 定义缓存名称
// 每次您部署应用的新版本（例如，修改了HTML/CSS/JS）时，都应该更改此名称。
// 这将触发 Service Worker 的更新流程，确保用户能获取到最新版本。
// 例如，从 'mycards-cache-v1' 改为 'mycards-cache-v2'。
const CACHE_NAME = 'mycards-cache-v2.9';

// 需要缓存的核心文件列表
const urlsToCache = [
  './', // 缓存根路径，通常是 index.html
  './index.html',
  './manifest.json',
  // 如果您有图标，也请取消注释并添加它们
  // './icon-192.png',
  // './icon-512.png'
];


// 安装事件：当新的 Service Worker 被浏览器解析和安装时触发
self.addEventListener('install', event => {
  // self.skipWaiting() 会强制新的 Service Worker 立即进入激活状态，跳过等待。
  self.skipWaiting();
  
  // 等待缓存操作完成
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        // 将核心文件添加到缓存中
        // addAll 会自动从网络获取这些文件并缓存
        return cache.addAll(urlsToCache);
      })
  );
});


// 激活事件：当新的 Service Worker 被激活并开始控制页面时触发
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]; // 定义缓存白名单，只保留当前版本的缓存
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 如果缓存名称不在白名单中，说明是旧的缓存，就删除它
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // self.clients.claim() 让新的 Service Worker 立即控制所有打开的客户端（页面），
      // 无需用户刷新页面。
      return self.clients.claim();
    })
  );
});


// 抓取事件：拦截应用的所有网络请求
self.addEventListener('fetch', event => {
  // 对于导航请求（例如，请求 HTML 页面），我们使用 "网络优先" 策略
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // 1. 尝试从网络获取
      fetch(event.request)
        .then(response => {
          // 如果获取成功，将其存入缓存并返回
          return caches.open(CACHE_NAME).then(cache => {
            // 注意：需要克隆响应，因为响应流只能被消费一次
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // 2. 如果网络请求失败（例如，离线），则从缓存中返回
          return caches.match(event.request);
        })
    );
    return;
  }

  // 对于非导航请求（如CSS, JS, 图片），我们可以使用 "缓存优先" 策略以获得更快的加载速度
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存中有，则返回缓存的资源
        if (response) {
          return response;
        }
        // 否则，从网络获取资源，并将其加入缓存
        return fetch(event.request).then(networkResponse => {
            return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            });
        });
      })
  );
});


