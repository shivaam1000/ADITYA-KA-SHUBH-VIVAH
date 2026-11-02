// Baraat Live — small offline shell. Network first; cached copy if offline. Live data/maps always need network.
const C='baraat-v1';
const SHELL=['./','./index.html','./live.js','./config.js','./assets/logo.png','./assets/corner.png','./assets/doha.png','./assets/pin-home.png','./assets/pin-dhaba.png','./assets/pin-venue.png','./assets/teb.png','./assets/dhol.png','./assets/sky.jpg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL).catch(()=>{})));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin || e.request.method!=='GET') return; // maps, firebase, osrm: untouched
  if(u.pathname.endsWith('.mp4')||u.pathname.endsWith('.mp3')) return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request).then(m=>m||caches.match('./index.html'))));
});
