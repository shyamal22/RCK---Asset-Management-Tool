/* KRE Assets service worker.
 * One job for now: with no signal, show our own "No signal / Try again" screen instead of Safari's
 * "not connected" page (an installed iPhone app has no reload button). Nothing is cached, so nothing
 * goes stale. Only full-page GET loads are touched; data requests, server actions and photos are not.
 * The pre-start offline queue (PLAN.md) will extend this file later. */
const OFFLINE_HTML = `<!doctype html><html lang="en-NZ"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0b10"><title>No signal · KRE Assets</title>
<style>
  html,body{margin:0;height:100%}
  body{min-height:100dvh;display:grid;place-items:center;text-align:center;color:#fff;
    background:linear-gradient(150deg,#0b0b10 0%,#2a0a6e 55%,#6f00ff 115%);
    font-family:Calibri,Carlito,system-ui,-apple-system,sans-serif;-webkit-tap-highlight-color:transparent}
  .dot{display:inline-block;width:.6rem;height:.6rem;border-radius:50%;background:#ff7a1a;margin-right:.4rem}
  h1{font-size:1.75rem;margin:.75rem 0 .25rem} p{margin:0 0 1.5rem;opacity:.75;font-size:1.1rem}
  a{display:inline-block;padding:1rem 2.25rem;border-radius:999px;background:#fff;color:#0b0b10;font-weight:700;font-size:1.1rem;text-decoration:none}
  a:active{transform:scale(.97)}
</style></head><body><main>
<div><span class="dot"></span><b>KRE</b> Asset Management Tool</div>
<h1>No signal</h1><p>It'll load again as soon as you're back online.</p>
<a href="">Try again</a>
</main><script>addEventListener('online',function(){location.reload()})</script></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate" || req.method !== "GET") return;
  event.respondWith(
    fetch(req).catch(() => new Response(OFFLINE_HTML, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } })),
  );
});
