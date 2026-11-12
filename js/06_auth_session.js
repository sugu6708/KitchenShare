/* KitchenShare - auth_session | module 06/22 | classic script, loads in filename order */
"use strict";
  var session = null;
  function currentUserId() {
    if (session && session.userId) return session.userId;
    var s = lsGet(DB_KEYS.session, null);
    if (s && s.userId && getUserById(s.userId)) { session = s; return s.userId; }
    session = { userId: 'u-sugu' };
    lsSet(DB_KEYS.session, session);
    return session.userId;
  }
  function currentUser() { return getUserById(currentUserId()); }
  function setSession(uid) { session = { userId: uid }; lsSet(DB_KEYS.session, session); }

  function userKey(uid, suffix) { return 'kitchenshare.u.' + uid + '.' + suffix; }
  function myKey(suffix) { return userKey(currentUserId(), suffix); }
  function getUserData(uid, suffix, fallback) { return lsGet(userKey(uid, suffix), fallback); }
  function setUserData(uid, suffix, value) { lsSet(userKey(uid, suffix), value); }

  function switchUser(uid) {
    setSession(uid);
    profile = null;
    bookmarks = null;
    myRecipes = null;
    posts = null;
    inventory = null;
    shopping = null;
    if (typeof migrateSpendingLog === 'function') migrateSpendingLog(uid);
  }

function login(email, pass) {
    var e = String(email || '').trim().toLowerCase();
    var p = String(pass || '');
    return serverApi('login', { email: e, pass: p, remember: document.getElementById('ks-remember-me') && document.getElementById('ks-remember-me').checked }).then(function (r) {
      if (r && r.user) {
        var u = upsertRemoteUser(r.user, p);
        switchUser(u.id);
        renderDrawerUser();
        if (isAdminUser()) {
          var adminGate = document.getElementById('ks-admin-gate');
          var adminBody = document.getElementById('ks-admin-body');
          if (adminGate) adminGate.classList.remove('hidden');
          if (adminBody) adminBody.classList.remove('hidden');
        }
        if (r.user.must_reset) {
          openSetNewPasswordSheet();
          return;
        }
        ksToast(window.t('toast_signed_in'));
        if (currentPage === 'login.html') {
          setTimeout(function () { window.location.href = 'index.html'; }, 1500);
        }
      }
      if (r && r.error) {
        var errEl = document.getElementById('ks-auth-error');
        if (errEl) {
          errEl.className = 'mb-3 p-3 rounded-lg bg-error-container text-on-error-container text-sm';
          errEl.textContent = r.error;
        }
      }
      if (!r || !r.user) {
        ksToast(window.t('login_failed') || 'Login failed');
      }
    });
  }

  function openSetNewPasswordSheet() {
    var host = document.createElement('div');
    host.id = 'ks-reset-sheet';
    host.className = 'fixed inset-0 z-[80]';
    host.innerHTML =
      '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
      '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
      '<h2 class="font-headline-md text-headline-md text-on-surface mb-2">Set New Password</h2>' +
      '<p class="font-body-md text-body-md text-on-surface-variant mb-5">Your admin has reset your password. Please set a new one to continue.</p>' +
      '<label class="block font-body-md text-body-md text-on-surface mb-1">New Password</label>' +
      '<input id="ks-new-pass" type="password" class="w-full h-12 px-4 rounded-xl border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md mb-4" placeholder="Min 4 characters" autocomplete="new-password"/>' +
      '<label class="block font-body-md text-body-md text-on-surface mb-1">Confirm Password</label>' +
      '<input id="ks-new-pass-confirm" type="password" class="w-full h-12 px-4 rounded-xl border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md mb-4" placeholder="Re-enter password" autocomplete="new-password"/>' +
      '<p id="ks-reset-error" class="text-sm text-error mb-3 hidden"></p>' +
      '<button id="ks-set-pass-btn" class="w-full h-14 rounded-full bg-primary text-on-primary font-headline-md text-[16px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">Set Password & Continue</button>' +
      '</div>';
    document.body.appendChild(host);
    document.body.style.overflow = 'hidden';
    function close() { host.remove(); document.body.style.overflow = ''; }
    host.querySelector('.absolute.inset-0').addEventListener('click', close);
    host.querySelector('#ks-set-pass-btn').addEventListener('click', function () {
      var pw = document.getElementById('ks-new-pass').value;
      var cf = document.getElementById('ks-new-pass-confirm').value;
      var errEl = document.getElementById('ks-reset-error');
      if (!pw || pw.length < 4) { errEl.textContent = 'Password must be at least 4 characters'; errEl.classList.remove('hidden'); return; }
      if (pw !== cf) { errEl.textContent = 'Passwords do not match'; errEl.classList.remove('hidden'); return; }
      errEl.classList.add('hidden');
      serverApi('set-new-password', { password: pw, confirm: cf }).then(function (r) {
        if (r && r.ok) {
          var u = currentUser();
          if (u) { u.pass = pw; saveUsers(); }
          close();
          ksToast('Password updated successfully');
          if (currentPage === 'login.html') {
            setTimeout(function () { window.location.href = 'index.html'; }, 800);
          }
        } else if (r && r.error) {
          errEl.textContent = r.error;
          errEl.classList.remove('hidden');
        }
      });
    });
  }

  function loginLocal(e, p) {
    var us = getUsers();
    for (var i = 0; i < us.length; i++) {
      if (us[i].email && us[i].email.toLowerCase() === e) {
        if (us[i].pass !== p) return { error: 'Incorrect password' };
        if (us[i].status === 'pending') return { error: 'Your join request is pending admin approval' };
        switchUser(us[i].id);
        return { user: us[i] };
      }
    }
    return null;
  }

  function signup(name, email, pass) {
    var n = String(name || '').trim();
    var e = String(email || '').trim().toLowerCase();
    var p = String(pass || '');
    if (!n || !e || p.length < 4) return Promise.resolve({ error: 'Enter a name, email, and a password (4+ characters)' });
    return serverApi('signup', { name: n, email: e, pass: p }).then(function (r) {
      if (r && r.pending) return { pending: true, name: n };
      if (r && r.error) return { error: r.error };
      return signupLocal(n, e, p);
    });
  }

  function signupLocal(n, e, p) {
    var us = getUsers();
    for (var i = 0; i < us.length; i++) {
      if (us[i].email && us[i].email.toLowerCase() === e) return { error: 'An account already exists for that email' };
    }
    var id = 'u-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    var u = { id: id, name: n, tagline: 'Home Cook', bio: '', email: e, pass: p, role: 'user', status: 'active', following: [], join: Date.now() };
    us.push(u);
    saveUsers();
    setUserData(id, 'profile', { name: n, tagline: 'Home Cook', bio: '' });
    setUserData(id, 'posts', []);
    setUserData(id, 'myrecipes', []);
    setUserData(id, 'bookmarks', ['Hearty Veggie Minestrone']);
    switchUser(id);
    pushNotification(id, { icon: 'waving_hand', title: 'Welcome to KitchenShare, ' + n + '!', desc: 'Tap the menu to browse. Follow people and share your first recipe.', href: 'index.html', time: 'Just now', ts: Date.now() });
    return { user: u };
  }

  function logout() {
    return serverApi('logout', {}).then(function () {
      session = null;
      try { localStorage.removeItem(DB_KEYS.session); } catch (e) {}
      ksToast(window.t('lbl_logged_out'));
    });
  }

