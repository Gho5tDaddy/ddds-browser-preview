'use strict';

(() => {
  async function prepareWorker(worker) {
    let ended=false,listener,timer;
    const deadline=new Promise((_,reject)=>{
      timer=setTimeout(()=>{
        const error=new Error('Browser support setup timed out.');
        error.code='DDDS_BROWSER_SUPPORT_TIMEOUT';reject(error);
      },30000);
    });
    const setup=(async()=>{
      await worker.register('preview-worker.js',{scope:'./',updateViaCache:'none'});
      if(ended)return;
      await worker.ready;
      if(ended || worker.controller)return;
      await new Promise(resolve=>{
        listener=()=>{if(worker.controller)resolve();};
        worker.addEventListener('controllerchange',listener);
        listener(); // Control may have arrived between the earlier check and registration.
      });
    })();
    try {await Promise.race([setup,deadline]);}
    finally {
      ended=true;clearTimeout(timer);
      if(listener)worker.removeEventListener('controllerchange',listener);
    }
  }
  window.dddsBrowserStartup={prepareWorker};
})();
