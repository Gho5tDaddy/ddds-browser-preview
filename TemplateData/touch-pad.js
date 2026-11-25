'use strict';

(() => {
  const touch = navigator.maxTouchPoints > 0 &&
    (matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/.test(navigator.userAgent));
  if (!touch) return;

  document.documentElement.classList.add('touch-preview');
  const stick = document.querySelector('#touch-stick');
  const knob = stick.querySelector('span');
  const held = new Map();
  const changes = [];
  let stickPointer = null;
  let axes = 63 | (63 << 7);
  let buttons = 0;

  // Read one button transition per input update. A tap between rendered frames
  // still reaches Unity, while stick movement always uses the latest position.
  window.dddsReadTouchPad = () => axes | ((changes.length ? changes.shift() : buttons) << 14);

  function updateButtons() {
    let next = 0;
    for (const button of held.values()) next |= 1 << Number(button.dataset.pad);
    if (next !== buttons) {
      buttons = next;
      if (changes.length >= 32) changes.length = 0;
      changes.push(buttons);
    }
  }

  function capture(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return false;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    return true;
  }

  function releaseButton(event) {
    const button = held.get(event.pointerId);
    if (!button) return;
    held.delete(event.pointerId);
    if (![...held.values()].includes(button)) button.classList.remove('pressed');
    updateButtons();
  }

  function setStick(event) {
    const box = stick.getBoundingClientRect();
    const radius = box.width * .36;
    const x = (event.clientX - box.left - box.width / 2) / radius;
    const y = (box.top + box.height / 2 - event.clientY) / radius;
    const length = Math.max(1, Math.hypot(x, y));
    axes = Math.round(63 + 63 * x / length) | (Math.round(63 + 63 * y / length) << 7);
    knob.style.transform = `translate(${x / length * radius}px, ${-y / length * radius}px)`;
  }

  function centerStick() {
    stickPointer = null;
    axes = 63 | (63 << 7);
    knob.style.transform = '';
  }

  stick.addEventListener('pointerdown', event => {
    if (stickPointer !== null || !capture(event)) return;
    stickPointer = event.pointerId;
    setStick(event);
  });
  stick.addEventListener('pointermove', event => {
    if (event.pointerId === stickPointer) setStick(event);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stick.addEventListener(name, event => {
      if (event.pointerId === stickPointer) centerStick();
    });
  }

  for (const button of document.querySelectorAll('[data-pad]')) {
    button.addEventListener('pointerdown', event => {
      if (!capture(event)) return;
      held.set(event.pointerId, button);
      button.classList.add('pressed');
      updateButtons();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(name, releaseButton);
    }
  }

  function clear() {
    for (const button of held.values()) button.classList.remove('pressed');
    held.clear();
    changes.length = 0;
    buttons = 0;
    centerStick();
  }
  window.dddsSetQuestPanel = open => {
    if(open)clear();
    document.documentElement.classList.toggle('quest-panel-open', Boolean(open));
  };
  window.dddsSetStoryPanel = open => {
    if(open)clear();
    document.documentElement.classList.toggle('story-scene', Boolean(open));
  };
  window.addEventListener('blur', clear);
  window.addEventListener('pagehide', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  screen.orientation?.addEventListener('change', clear);
  document.querySelector('#preview').addEventListener('contextmenu', event => event.preventDefault());
})();
