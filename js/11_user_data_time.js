/* KitchenShare - user_data_time | module 11/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Load current user's data ---------------- */

  var profile = null;
  var bookmarks = null;
  var myRecipes = null;
  var posts = null;

  function loadUserData() {
    var uid = currentUserId();
    if (myRecipes === null) myRecipes = getUserData(uid, 'myrecipes', []);
    if (posts === null) posts = getUserData(uid, 'posts', []);
    if (profile === null) getProfile();
    if (bookmarks === null) getBookmarks();
  }

  var resetDemoBtn = document.getElementById('ks-reset-demo');
  if (resetDemoBtn) resetDemoBtn.addEventListener('click', function () {
    if (!isAdminUser()) return;
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf('kitchenshare.') === 0) { try { localStorage.removeItem(k); } catch (e) {} }
    });
    window.location.reload();
  });

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function uid() { return 'itm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }
  function norm(name) { return String(name || '').trim().toLowerCase(); }

  /* ---------------- Relative/date time formatting ---------------- */

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function fmtDateShort(ts) {
    var d = new Date(ts);
    return pad2(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(-2);
  }

  function fmtRelative(ts) {
    var diff = Date.now() - ts;
    if (diff < 0) diff = 0;
    var min = Math.floor(diff / 60000);
    if (min < 1) return window.t('time_just_now');
    if (min < 60) return window.t('time_min_ago', { n: min });
    var hr = Math.floor(min / 60);
    if (hr < 24) return window.t('time_hr_ago', { n: hr });
    var day = Math.floor(hr / 24);
    if (day < 7) return window.t('time_day_ago', { n: day });
    return fmtDateShort(ts);
  }

  function timeLabel(item) {
    if (!item) return '';
    if (typeof item.ts === 'number') return fmtRelative(item.ts);
    return String(item.time || '');
  }

