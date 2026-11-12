/* KitchenShare - celebration_admin | module 09/22 | classic script, loads in filename order */
"use strict";
  /* --- Celebration overlay (one modal per badge, queued) --- */
  var _celebrationQueue = [];
  var _celebrationShowing = false;

  function achName(b) {
    var k = 'ach_name_' + b.id.replace(/-/g, '_');
    var v = window.t ? window.t(k) : k;
    return (v && v !== k) ? v : b.name;
  }
  function achDesc(b) {
    var k = 'ach_desc_' + b.id.replace(/-/g, '_');
    var v = window.t ? window.t(k) : k;
    return (v && v !== k) ? v : b.description;
  }

  function queueCelebration(badges) {
    _celebrationQueue = _celebrationQueue.concat(badges || []);
    _nextCelebration();
  }

  function _nextCelebration() {
    if (_celebrationShowing || !_celebrationQueue.length) return;
    var badge = _celebrationQueue.shift();
    _celebrationShowing = true;
    var sparkleIcons = ['star', 'auto_awesome', 'eco', 'favorite', 'restaurant', 'celebration'];
    var sparkles = sparkleIcons.map(function (ic, i) {
      return '<span class="material-symbols-outlined text-[16px] text-primary ks-sparkle" style="animation-delay:' + (i * 0.22) + 's">' + ic + '</span>';
    }).join('');
    var host = document.createElement('div');
    host.className = 'fixed inset-0 z-[95] flex items-center justify-center';
    host.innerHTML =
      '<div class="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm"></div>' +
      '<div class="relative mx-6 max-w-sm w-full bg-surface rounded-3xl shadow-ambient-fab p-8 text-center ks-celebrate-pop">' +
      '<div class="absolute inset-x-6 top-3 flex justify-center gap-4 pointer-events-none">' + sparkles + '</div>' +
      '<p class="font-label-caps text-label-caps uppercase text-on-surface-variant mt-2">' + window.t('ach_unlocked') + '</p>' +
      '<div class="ks-celebrate-badge mx-auto mt-4 w-24 h-24 rounded-full bg-primary-fixed border-4 border-primary-fixed-dim flex items-center justify-center">' +
      '<span class="material-symbols-outlined text-[44px] text-primary" style="font-variation-settings: \'FILL\' 1;">' + esc(badge.icon) + '</span></div>' +
      '<h3 class="mt-4 font-headline-md text-headline-md text-on-surface">' + esc(achName(badge)) + '</h3>' +
      '<p class="mt-1 font-body-md text-body-md text-on-surface-variant">' + esc(achDesc(badge)) + '</p>' +
      '<button class="ks-celebrate-btn mt-6 w-full h-12 rounded-full bg-primary text-on-primary font-headline-md text-[16px] active:scale-95 transition-transform">' + window.t('lbl_awesome') + '</button>' +
      '</div>';
    document.body.appendChild(host);
    document.body.style.overflow = 'hidden';
    ksToast(window.t('toast_badge_unlocked', { name: achName(badge) }));
    function dismiss() {
      if (!host.parentNode) return;
      host.remove();
      document.body.style.overflow = '';
      _celebrationShowing = false;
      setTimeout(_nextCelebration, 250);
    }
    host.querySelector('.ks-celebrate-btn').addEventListener('click', dismiss);
    setTimeout(dismiss, 6000);
  }

  /* ---------------- Admin controls ---------------- */

  function suspendUser(id) {
    return serverApi('suspend', { adminEmail: currentUser() ? currentUser().email : '', adminPass: currentUser() ? currentUser().pass : '', id: id }).then(function (r) {
      if (r && r.ok) {
        return { toast: window.t('toast_user_suspended', { name: getUserById(id) ? getUserById(id).name : 'member' }) };
      }
      if (r && r.error) {
        return { error: r.error };
      }
      return { error: 'Unknown error' };
    });
  }

  function isAdminUser() { var u = currentUser(); return !!(u && u.role === 'admin'); }

  function approveUser(id) {
    var u = getUserById(id);
    if (!u || u.status !== 'pending') return Promise.resolve(null);
    u.status = 'active';
    saveUsers();
    pushNotification(id, { icon: 'verified', title: 'Welcome to KitchenShare!', desc: 'Your join request was approved by an admin. Happy cooking!', href: 'index.html', time: 'Just now', ts: Date.now() });
    var cu = currentUser();
    return serverApi('approve', { adminEmail: cu ? cu.email : '', adminPass: cu ? cu.pass : '', id: id }).then(function (r) {
      if (r && r.password) { u.pass = r.password; saveUsers(); return r.password; }
      return null;
    });
  }

  function removeUser(id) {
    var u = getUserById(id);
    if (!u) return false;
    ['profile', 'bookmarks', 'myrecipes', 'posts', 'inventory', 'shopping', 'notifications'].forEach(function (s) {
      try { localStorage.removeItem(userKey(id, s)); } catch (e) {}
    });
    users = users.filter(function (x) { return x.id !== id; });
    saveUsers();
    if (currentUserId() === id) switchUser('u-sugu');
    return true;
  }

  function setRole(id, role) {
    var u = getUserById(id);
    if (!u) return false;
    u.role = (role === 'admin') ? 'admin' : 'user';
    saveUsers();
    return true;
  }

  var hiddenRecipes = lsGet(DB_KEYS.hidden, []);
  var catalogEdits = lsGet(DB_KEYS.catalogEdits, {}) || {};
  function getComments(rid) {
    var all = lsGet(DB_KEYS.comments, {});
    return (all && all[rid]) || [];
  }
  function saveComments(rid, arr) {
    var all = lsGet(DB_KEYS.comments, {});
    all[rid] = arr;
    lsSet(DB_KEYS.comments, all);
  }
  function addComment(rid, text) {
    var me = currentUser();
    if (!me) return null;
    var arr = getComments(rid).slice();
    arr.push({
      id: 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      text: String(text).slice(0, 500),
      by: me.name,
      userId: me.id,
      time: 'Just now',
      ts: Date.now(),
      likes: []
    });
    saveComments(rid, arr);
    syncComments(rid);
    return arr;
  }
  function toggleCommentLike(rid, cid) {
    var me = currentUserId();
    if (!me) return false;
    var arr = getComments(rid).slice();
    var found = null;
    arr.forEach(function (c) { if (c.id === cid) found = c; });
    if (!found) return false;
    if (!Array.isArray(found.likes)) found.likes = [];
    var i = found.likes.indexOf(me);
    if (i === -1) found.likes.push(me);
    else found.likes.splice(i, 1);
    saveComments(rid, arr);
    syncComments(rid);
    return true;
  }
  function removeComment(rid, cid) {
    var me = currentUser();
    var arr = getComments(rid).slice();
    var found = null;
    arr.forEach(function (c) { if (c.id === cid) found = c; });
    if (!found) return false;
    if (!(isAdminUser() || (me && me.id === found.userId))) return false;
    saveComments(rid, arr.filter(function (c) { return c.id !== cid; }));
    syncComments(rid);
    return true;
  }
  function listAllUserRecipes() {
    var out = {};
    getUsers().forEach(function (u) {
      if (u.status !== 'active') return;
      var arr = getUserData(u.id, 'myrecipes', []);
      arr.forEach(function (r) {
        if (r && r.id && !out[r.id]) out[r.id] = { userId: u.id, author: u, recipe: r };
      });
    });
    return out;
  }

