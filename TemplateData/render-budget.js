'use strict';

(() => {
  function pixelRatio(canvas,touch) {
    // Preserve the existing startup policy, including room for a later landscape view.
    const expectedTouchWidth=Math.min(1280,Math.max(1,canvas.clientWidth,Math.min(innerWidth,innerHeight)*16/9));
    const limit=touch ? Math.min(1.5,960/expectedTouchWidth) : 2;
    return Math.min(window.devicePixelRatio||1,limit);
  }

  function follow(canvas,module,touch) {
    let pending=0,disposed=false;
    function update() {
      pending=0;
      if(disposed)return;
      const next=pixelRatio(canvas,touch);
      // Unity's pinned Web runtime reads this live; leave its canvas matching enabled.
      if(module.devicePixelRatio!==next)module.devicePixelRatio=next;
    }
    function schedule() {
      if(!disposed && !pending)pending=requestAnimationFrame(update);
    }
    const observer=window.ResizeObserver ? new ResizeObserver(schedule) : null;
    observer?.observe(canvas);
    window.addEventListener('resize',schedule);
    window.addEventListener('orientationchange',schedule);
    document.addEventListener('fullscreenchange',schedule);
    document.addEventListener('visibilitychange',schedule);
    const viewport=window.visualViewport;
    viewport?.addEventListener('resize',schedule);
    update();
    return () => {
      if(disposed)return;
      disposed=true;
      if(pending)cancelAnimationFrame(pending);
      observer?.disconnect();
      window.removeEventListener('resize',schedule);
      window.removeEventListener('orientationchange',schedule);
      document.removeEventListener('fullscreenchange',schedule);
      document.removeEventListener('visibilitychange',schedule);
      viewport?.removeEventListener('resize',schedule);
    };
  }
  window.dddsRenderBudget={pixelRatio,follow};
})();
