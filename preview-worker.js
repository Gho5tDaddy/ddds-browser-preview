'use strict';
// Static-host transport only. Unity's URLs (and browser save identity) stay stable.
// There is no application/save cache here; the browser owns persistent game data.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),base=new URL(self.registration.scope);
  if(event.request.method!=='GET' || url.origin!==base.origin ||
    !url.pathname.startsWith(base.pathname+'Build/') || !/\.(data|wasm)$/.test(url.pathname))return;
  event.respondWith((async()=>{
    const manifestResponse=await fetch(new URL('preview-assets.json',base),{cache:'no-store'});
    if(manifestResponse.status===404)return fetch(event.request); // ordinary raw Unity export
    if(!manifestResponse.ok)throw new Error('Preview manifest could not load.');
    const manifest=await manifestResponse.json();
    const entry=manifest.assets[url.pathname.slice(base.pathname.length)];
    if(!entry)return fetch(event.request);
    let index=0,reader;
    const compressed=new ReadableStream({
      async pull(controller){
        try{
          while(true){
            if(!reader){
              if(index===entry.parts.length){controller.close();return;}
              const part=new URL(entry.parts[index++],base);
              if(part.origin!==base.origin || !part.pathname.startsWith(base.pathname+'Build/'))
                throw new Error('Invalid preview asset path.');
              const response=await fetch(part);
              if(!response.ok || !response.body)throw new Error('Preview download failed: '+response.status);
              reader=response.body.getReader();
            }
            const next=await reader.read();
            if(next.done){reader.releaseLock();reader=null;continue;}
            controller.enqueue(next.value);return;
          }
        }catch(error){controller.error(error);}
      },
      cancel(reason){return reader?.cancel(reason);}
    });
    return new Response(compressed.pipeThrough(new DecompressionStream('gzip')),{headers:{
      'Content-Type':entry.type,'Content-Length':String(entry.length),'Cache-Control':'no-store'
    }});
  })());
});
