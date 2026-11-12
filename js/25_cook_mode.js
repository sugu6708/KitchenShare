/* KitchenShare - cook_mode | module 25/26 | classic script, loads in filename order */
"use strict";
/* §23 PWA & Device Experience on the Recipe Details page:
 * - Dynamic portion scaling (serving stepper adjusts ingredient quantities)
 * - Step-by-step cooking timers with audio + vibration feedback
 * - Cooking Mode via the Screen Wake Lock API (screen stays on hands-free) */

(function () {
  var cookBtn = document.getElementById('cook-this-btn');
  if (!cookBtn) return;
  var m = window.location.search.match(/[?&]recipe=([^&]+)/);
  var rid = m && m[1] ? decodeURIComponent(m[1]) : '';

  function baseServings() {
    var r = getRecipe(rid);
    var s = r && r.servings ? String(r.servings) : '';
    var num = s.match(/(\d+(?:\.\d+)?)/);
    return num ? Math.max(1, parseFloat(num[1])) : 2;
  }
  function fmtQty(q) {
    var rounded = Math.round(q * 100) / 100;
    if (rounded === Math.floor(rounded)) return String(rounded);
    /* friendly fractions for common values */
    var fr = [[0.25, '\u00BC'], [0.33, '\u2153'], [0.5, '\u00BD'], [0.67, '\u2154'], [0.75, '\u00BE']];
    var whole = Math.floor(rounded);
    var frac = rounded - whole;
    for (var i = 0; i < fr.length; i++) {
      if (Math.abs(frac - fr[i][0]) < 0.04) return whole ? whole + fr[i][1] : fr[i][1];
    }
    return String(rounded);
  }

  var scale = 1;
  var base = baseServings();

  /* ---- Serving stepper ---- */
  function mountStepper() {
    var servEl = document.getElementById('rd-ing-servings');
    if (!servEl || document.getElementById('ks-scale-stepper')) return;
    var wrap = document.createElement('div');
    wrap.id = 'ks-scale-stepper';
    wrap.className = 'flex items-center gap-2 mt-2';
    wrap.innerHTML =
      '<span class="font-label-caps text-label-caps text-on-surface-variant">' + esc(window.t('lbl_scaled_note', { x: '' })).replace(/x\s*$/, '').trim() + '</span>' +
      '<button id="ks-scale-minus" class="w-9 h-9 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-secondary-container active:scale-95 transition-all" aria-label="-"><span class="material-symbols-outlined text-[18px]">remove</span></button>' +
      '<span id="ks-scale-val" class="font-headline-md text-body-md text-primary font-semibold min-w-[3ch] text-center">x1</span>' +
      '<button id="ks-scale-plus" class="w-9 h-9 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center hover:bg-secondary-container active:scale-95 transition-all" aria-label="+"><span class="material-symbols-outlined text-[18px]">add</span></button>';
    servEl.parentNode.insertBefore(wrap, servEl.nextSibling);
    document.getElementById('ks-scale-minus').addEventListener('click', function () { setScale(scale / base <= 0.5 ? scale : scale - 1); });
    document.getElementById('ks-scale-plus').addEventListener('click', function () { setScale(scale + 1); });
  }
  function setScale(newScale) {
    newScale = Math.round(newScale * 100) / 100;
    if (newScale < 1) newScale = 1;
    scale = newScale;
    var val = document.getElementById('ks-scale-val');
    if (val) val.textContent = 'x' + (scale % 1 === 0 ? scale : scale.toFixed(1));
    applyScaling();
  }
  function applyScaling() {
    if (scale === 1) {
      document.querySelectorAll('.ks-scale-badge').forEach(function (b) { b.remove(); });
      document.querySelectorAll('#plan-rows input[type="number"]').forEach(function (inp) { inp.value = inp.getAttribute('data-base') || inp.value; });
      var note = document.getElementById('ks-scale-note');
      if (note) note.remove();
      return;
    }
    var ul = document.getElementById('recipe-ingredients');
    if (ul) {
      ul.querySelectorAll('li').forEach(function (li) {
        var qtyEl = li.querySelector('.item-scale-base');
        if (!qtyEl) {
          qtyEl = li.querySelector('.font-medium');
          if (!qtyEl) return;
          qtyEl.classList.add('item-scale-base');
        }
        var txt = qtyEl.textContent || '';
        var mm = txt.match(/^\s*([\d.]+)\s*(.*)$/);
        if (!mm) return;
        var q = parseFloat(mm[1]);
        if (isNaN(q)) return;
        var scaledTxt = fmtQty(q * scale) + (mm[2] ? ' ' + mm[2].trim() : '');
        var badge = li.querySelector('.ks-scale-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'ks-scale-badge font-body-md text-body-md text-primary font-semibold';
          qtyEl.parentNode.insertBefore(badge, qtyEl);
        }
        badge.textContent = '\u2192 ' + scaledTxt;
      });
    }
    document.querySelectorAll('#plan-rows input[type="number"]').forEach(function (inp, idx) {
      var r = getRecipe(rid);
      if (r && r.ingredients && r.ingredients[idx]) inp.value = Math.round(r.ingredients[idx].qty * scale * 100) / 100;
    });
    var stepsHead = document.getElementById('rd-steps');
    if (stepsHead && !document.getElementById('ks-scale-note')) {
      var note = document.createElement('p');
      note.id = 'ks-scale-note';
      note.className = 'font-label-caps text-label-caps text-primary mb-3';
      note.textContent = window.t('lbl_scaled_note', { x: scale % 1 === 0 ? scale : scale.toFixed(1) });
      stepsHead.parentNode.insertBefore(note, stepsHead);
    } else {
      var note2 = document.getElementById('ks-scale-note');
      if (note2) note2.textContent = window.t('lbl_scaled_note', { x: scale % 1 === 0 ? scale : scale.toFixed(1) });
    }
  }

  /* ---- Step timers ---- */
  var KS_TIMERS = [];
  var ksAudioCtx = null;
  function beepTimesUp() {
    try {
      ksAudioCtx = ksAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var t0 = ksAudioCtx.currentTime;
      [880, 660, 880].forEach(function (freq, i) {
        var osc = ksAudioCtx.createOscillator();
        var gain = ksAudioCtx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, t0 + i * 0.28);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.28 + 0.22);
        osc.connect(gain).connect(ksAudioCtx.destination);
        osc.start(t0 + i * 0.28);
        osc.stop(t0 + i * 0.28 + 0.24);
      });
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate([320, 120, 320, 120, 480]); } catch (e) {}
  }
  function parseDuration(text) {
    var mm = String(text || '').match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h\b|minutes?|mins?|m\b)/i);
    if (!mm) return null;
    var v = parseFloat(mm[1]);
    var u = mm[2].toLowerCase();
    var secs = /^h/.test(u) ? v * 3600 : (/^m/.test(u) || u.charAt(0) === 'm' ? v * 60 : v);
    if (!(secs > 0)) return null;
    return Math.min(secs, 6 * 3600);
  }
  function fmtClock(s) {
    var h = Math.floor(s / 3600), mn = Math.floor((s % 3600) / 60), sc = s % 60;
    return (h ? h + ':' + String(mn).padStart(2, '0') : String(mn)) + ':' + String(sc).padStart(2, '0');
  }
  function renderTimerBar() {
    var bar = document.getElementById('ks-timer-bar');
    if (!KS_TIMERS.length) { if (bar) bar.remove(); releaseWakeIfIdle(); return; }
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ks-timer-bar';
      bar.className = 'fixed left-1/2 -translate-x-1/2 bottom-[calc(96px+env(safe-area-inset-bottom,20px))] z-[85] flex flex-col gap-2 w-[min(92vw,26rem)]';
      document.body.appendChild(bar);
    }
    bar.innerHTML = KS_TIMERS.map(function (t, i) {
      return '<div class="flex items-center gap-3 px-4 py-3 rounded-2xl bg-inverse-surface text-inverse-surface shadow-lg" data-timer="' + i + '">' +
        '<span class="material-symbols-outlined text-[20px]">timer</span>' +
        '<span class="flex-1 truncate font-body-md text-body-md">' + esc(t.label) + '</span>' +
        '<span class="ks-clock font-headline-md text-headline-md tabular-nums">' + fmtClock(t.left) + '</span>' +
        '<button data-timer-x="' + i + '" class="p-1 rounded-full hover:bg-inverse-surface/20" aria-label="Stop"><span class="material-symbols-outlined text-[18px]">close</span></button>' +
        '</div>';
    }).join('');
  }
  setInterval(function () {
    var changed = false;
    KS_TIMERS.slice().forEach(function (t) {
      t.left--;
      if (t.left <= 0) {
        KS_TIMERS.splice(KS_TIMERS.indexOf(t), 1);
        changed = true;
        beepTimesUp();
        ksToast(window.t('lbl_timer_done', { name: t.label }));
      }
    });
    if (changed || KS_TIMERS.length) {
      renderTimerBar();
      KS_TIMERS.forEach(function (t, i) {
        var row = document.querySelector('#ks-timer-bar [data-timer="' + i + '"] .ks-clock');
        if (row) row.textContent = fmtClock(t.left);
      });
    }
  }, 1000);

  function mountStepTimers() {
    var stepsEl = document.getElementById('rd-steps');
    if (!stepsEl) return;
    Array.prototype.forEach.call(stepsEl.children, function (row) {
      if (row.querySelector('.ks-step-timer')) return;
      var textP = row.querySelector('p');
      var secs = textP ? parseDuration(textP.textContent) : null;
      if (!secs) return;
      var titleH = row.querySelector('h4');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ks-step-timer mt-2 inline-flex items-center gap-1 h-9 px-4 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps hover:bg-tertiary active:scale-95 transition-all';
      btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">timer</span>' + fmtClock(secs);
      btn.addEventListener('click', function () {
        KS_TIMERS.push({ label: (titleH ? titleH.textContent : 'Timer'), left: secs, total: secs });
        acquireWakeForTimers();
        renderTimerBar();
      });
      var body = row.children[1];
      if (body) body.appendChild(btn);
    });
    stepsEl.addEventListener('click', function (e) {
      var x = e.target.closest('[data-timer-x]');
      if (!x) return;
      KS_TIMERS.splice(parseInt(x.getAttribute('data-timer-x'), 10), 1);
      renderTimerBar();
    });
  }

  /* ---- Cooking Mode: Screen Wake Lock API ---- */
  var ksWakeLock = null;
  function requestWake() {
    try {
      if (!('wakeLock' in navigator)) return Promise.resolve(null);
      return navigator.wakeLock.request('screen').then(function (wl) {
        ksWakeLock = wl;
        wl.addEventListener('release', function () { ksWakeLock = null; updateWakeUI(); });
        updateWakeUI();
        return wl;
      }).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function releaseWake() {
    if (ksWakeLock) { try { ksWakeLock.release(); } catch (e) {} ksWakeLock = null; }
    updateWakeUI();
  }
  var cookModeOn = false;
  function releaseWakeIfIdle() { if (!cookModeOn && !KS_TIMERS.length) releaseWake(); }
  function acquireWakeForTimers() { if (!ksWakeLock) requestWake(); }
  function updateWakeUI() {
    var dot = document.getElementById('ks-wakelock-dot');
    if (dot) dot.style.opacity = ksWakeLock ? '1' : '0.35';
  }
  function mountCookModeToggle() {
    if (document.getElementById('ks-cookmode-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'ks-cookmode-btn';
    btn.type = 'button';
    btn.className = 'mt-4 w-full max-w-xs mx-auto flex items-center justify-center gap-2 h-touch-target-min rounded-full border border-outline text-on-surface font-label-caps text-label-caps hover:bg-surface-container-low transition-colors';
    btn.innerHTML = '<span id="ks-wakelock-dot" style="opacity:.35" class="w-2 h-2 rounded-full bg-error inline-block transition-opacity"></span>' +
      esc(window.t('lbl_cook_mode'));
    btn.addEventListener('click', function () {
      cookModeOn = !cookModeOn;
      btn.classList.toggle('bg-primary-container', cookModeOn);
      btn.classList.toggle('text-on-primary-container', cookModeOn);
      if (cookModeOn) requestWake(); else releaseWakeIfIdle();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && (cookModeOn || KS_TIMERS.length)) requestWake();
    });
    window.addEventListener('pagehide', releaseWake);
    var anchor = cookBtn.parentNode;
    anchor.appendChild(btn);
  }

  mountStepper();
  setScale(1);
  setTimeout(function () { mountStepTimers(); mountCookModeToggle(); }, 50);
})();
