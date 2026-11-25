// The script inlined in index.html's <head> (by the Vite plugin in vite.config.ts) that picks the
// homepage's first photo before any of the app has loaded, and asks for it at once: a preload
// with the same srcset and sizes the page will use, so the browser fetches the one size it needs
// in parallel with the JavaScript instead of after it. The app reads the choice from
// window.__FIRST_PHOTO__, so both agree. Only on the homepage; other pages pick their photo
// from the race they show.

/** @param {{ id: string, sizes: { width: number }[] }[]} manifest */
export function firstPhotoScript(manifest) {
  const list = manifest.map((b) => [b.id, b.sizes.map((s) => s.width)]);
  if (!list.length) return '';
  return `(function(){if(location.pathname!=="/")return;var l=${JSON.stringify(list)};`
    + `var p=l[Math.floor(Math.random()*l.length)];window.__FIRST_PHOTO__=p[0];`
    + `var s=function(f){return p[1].map(function(w){return"/backgrounds/"+p[0]+"-"+w+"."+f+" "+w+"w"}).join(", ")};`
    + `var k=document.createElement("link");k.rel="preload";k.as="image";k.type="image/avif";k.setAttribute("imagesrcset",s("avif"));`
    + `k.setAttribute("imagesizes","100vw");k.setAttribute("fetchpriority","high");document.head.appendChild(k);`
    + `document.documentElement.dataset.firstPhoto=p[0]})()`;
}
