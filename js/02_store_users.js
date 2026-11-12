/* KitchenShare - store_users | module 02/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Shared Data Layer ---------------- */

  var DB_KEYS = {
    inventory: 'kitchenshare.inventory',
    shopping: 'kitchenshare.shopping',
    profile: 'kitchenshare.profile',
    bookmarks: 'kitchenshare.bookmarks',
    myrecipes: 'kitchenshare.myrecipes',
    posts: 'kitchenshare.posts',
    users: 'kitchenshare.users',
    session: 'kitchenshare.session',
    hidden: 'kitchenshare.hiddenRecipes',
    comments: 'kitchenshare.comments',
    catalogEdits: 'kitchenshare.catalogEdits',
    ingredients: 'kitchenshare.ingredients',
    spendingLog: 'kitchenshare.spending_log'
  };

  function lsGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  /* ---------------- Users, session & per-user storage ---------------- */

  function seedUsers() {
    return [
      { id: 'u-sugu', name: 'sugu', tagline: 'Admin & Chef', bio: 'Home cook who loves flavour-first, everyday cooking.', email: 'sugu@kitchenshare.app', pass: 'admin', role: 'admin', status: 'active', following: [] },
      { id: 'u-swetha', name: 'swetha', tagline: 'Home Cook', bio: 'Loves South Indian breakfasts and weekend baking.', email: 'swetha@kitchenshare.app', pass: '6708', role: 'user', status: 'active', following: ['u-sugu'] },
      { id: 'u-viji', name: 'viji', tagline: 'Home Cook', bio: 'Cooking simple, healthy dinners for the family.', email: 'viji@kitchenshare.app', pass: '1234', role: 'user', status: 'active', following: ['u-sugu', 'u-swetha'] },
      { id: 'u-saravana', name: 'saravana', tagline: 'Home Cook', bio: 'Idli, dosa, sambar & rasam every week.', email: 'saravana@kitchenshare.app', pass: '7394', role: 'user', status: 'active', following: ['u-sugu'] },
      { id: 'u-e1d76479', name: 'Rocky', tagline: 'Home Cook', bio: '', email: 'rocky@kitchenshare.app', pass: 'rocky123', role: 'user', status: 'active', following: ['u-sugu'] }
    ];
  }

  var users = null;
  function getUsers() {
    if (users) return users;
    users = lsGet(DB_KEYS.users, null);
    if (!users || !users.length) {
      users = seedUsers();
      seedDemoContent();
      lsSet(DB_KEYS.users, users);
    }
    return users;
  }
  function saveUsers() { if (users) lsSet(DB_KEYS.users, users); }
  (function migrateOldDemoPasswords() {
    try {
      var raw = localStorage.getItem(DB_KEYS.users);
      if (!raw) return;
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      var map = { 'u-sugu': 'admin', 'u-swetha': '6708', 'u-viji': '1234', 'u-saravana': '7394' };
      var changed = false;
      arr.forEach(function (u) {
        if (u && map[u.id] && u.pass === 'demo123') { u.pass = map[u.id]; changed = true; }
      });
      if (changed) {
        localStorage.setItem(DB_KEYS.users, JSON.stringify(arr));
        if (users) users = arr;
      }
    } catch (e) {}
  })();
  function getUserById(id) {
    var us = getUsers();
    for (var i = 0; i < us.length; i++) if (us[i].id === id) return us[i];
    return null;
  }

  function getSpendingLog() { return lsGet(userKey(currentUserId(), 'spending_log'), []); }
  function saveSpendingLog(log) { lsSet(userKey(currentUserId(), 'spending_log'), log); }
  /* One-time migration: the pre-per-user build stored the whole budget log in a
   * single device-wide key (DB_KEYS.spendingLog). Move it under the current
   * account so history follows the logged-in user across devices. */
  function migrateSpendingLog(uid) {
    try {
      var raw = localStorage.getItem(DB_KEYS.spendingLog);
      if (raw === null) return;
      var parsed = null;
      try { parsed = JSON.parse(raw); } catch (e1) {}
      if (!Array.isArray(parsed)) { localStorage.removeItem(DB_KEYS.spendingLog); return; }
      var targetUid = uid || (typeof currentUserId === 'function' ? currentUserId() : 'u-sugu');
      var targetKey = userKey(targetUid, 'spending_log');
      var current = [];
      try { current = JSON.parse(localStorage.getItem(targetKey) || '[]'); } catch (e2) {}
      if (!Array.isArray(current)) current = [];
      localStorage.setItem(targetKey, JSON.stringify(current.concat(parsed)));
      localStorage.removeItem(DB_KEYS.spendingLog);
      if (typeof dsCoalesce === 'function' && typeof DS !== 'undefined' && DS.budget) {
        dsCoalesce('budget', function () { DS.budget.saveAll(getSpendingLog() || []); });
      }
    } catch (e) {}
  }
  function recordSpend(amount, category, itemName, qty, unit) {
    var log = getSpendingLog();
    log.push({
      id: 'sp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      amount: amount, category: category || 'Other', item: itemName || '', qty: qty || 0, unit: unit || '',
      date: new Date().toISOString(), ts: Date.now(), _ua: Date.now()
    });
    saveSpendingLog(log);
    if (typeof dsCoalesce === 'function' && typeof DS !== 'undefined' && DS.budget) {
      dsCoalesce('budget', function () { DS.budget.saveAll(getSpendingLog() || []); });
    }
  }

