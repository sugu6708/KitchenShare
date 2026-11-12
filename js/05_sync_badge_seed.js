/* KitchenShare - sync_badge_seed | module 05/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Server connection indicator ---------------- */

  var ksSyncBadge = null;

  function updateSyncBadge(connected) {
    if (!ksSyncBadge) return;
    var on = !!connected;
    ksSyncBadge.className = on
      ? 'flex items-center gap-1 shrink-0 h-8 px-2.5 rounded-full bg-primary-container text-on-primary-container font-label-caps text-label-caps active:scale-95 transition-all'
      : 'flex items-center gap-1 shrink-0 h-8 px-2.5 rounded-full bg-error-container text-on-error-container font-label-caps text-label-caps active:scale-95 transition-all';
    var dot = ksSyncBadge.querySelector('[data-ks-sync-dot]');
    if (dot) {
      dot.className = 'w-2 h-2 rounded-full ' + (on ? 'bg-on-primary-container' : 'bg-on-error-container');
    }
    var lbl = ksSyncBadge.querySelector('[data-ks-sync-lbl]');
    if (lbl) lbl.textContent = on ? window.t('sync_connected') : window.t('sync_offline');
  }

  function initSyncBadge() {
    if (currentPage === 'login.html') return;
    var header = document.querySelector('header');
    var target = header && header.querySelector('.flex.items-center.justify-between');
    if (!target) return;
    if (target.querySelector('[data-ks-sync-badge]')) return;
    ksSyncBadge = document.createElement('button');
    ksSyncBadge.type = 'button';
    ksSyncBadge.setAttribute('data-ks-sync-badge', '');
    ksSyncBadge.setAttribute('aria-label', 'Sync status');
    ksSyncBadge.style.setProperty('font-family', 'inherit');
    ksSyncBadge.innerHTML =
      '<span data-ks-sync-dot class="w-2 h-2 rounded-full bg-outline"></span>' +
      '<span data-ks-sync-lbl class="whitespace-nowrap">' + window.t('sync_checking') + '</span>';
    ksSyncBadge.addEventListener('click', function () {
      if (serverStatus()) {
        ksToast(window.t('sync_connected_msg'));
      } else {
        ksToast(window.t('sync_offline_msg') + ' ' + window.t('sync_reload_prompt'));
        forceFreshReload();
      }
    });
    var notifBtn = target.querySelector('[data-action="notifications"]');
    var brand = target.querySelector('h1');
    if (notifBtn) {
      target.insertBefore(ksSyncBadge, notifBtn);
    } else if (brand) {
      target.insertBefore(ksSyncBadge, brand.nextSibling);
    } else {
      target.appendChild(ksSyncBadge);
    }
  }

  /* =================== Notification badge + polling =================== */
  var _notifBadgeEl = null;
  var _notifPollTimer = null;
  function initNotifBadge() {
    if (currentPage === 'login.html') return;
    document.querySelectorAll('[data-action="notifications"]').forEach(function (btn) {
      if (btn.querySelector('.ks-notif-badge')) return;
      var badge = document.createElement('span');
      badge.className = 'ks-notif-badge absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[11px] font-bold flex items-center justify-center hidden';
      btn.style.position = 'relative';
      btn.appendChild(badge);
      if (!_notifBadgeEl) _notifBadgeEl = badge;
    });
    pollUnreadCount();
    _notifPollTimer = setInterval(pollUnreadCount, 30000);
  }
  function pollUnreadCount() {
    if (!KS_SERVER_AVAILABLE || !currentUser()) return;
    socialUnreadCount().then(function (r) {
      if (!r || !r.ok) return;
      var n = r.unread || 0;
      document.querySelectorAll('.ks-notif-badge').forEach(function (b) {
        if (n > 0) { b.textContent = n > 99 ? '99+' : n; b.classList.remove('hidden'); }
        else { b.classList.add('hidden'); b.textContent = ''; }
      });
    });
  }

  function forceFreshReload() {
    var url = window.location.href;
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    try { window.location.href = url + sep + 't=' + Date.now(); }
    catch (e) { window.location.reload(true); }
  }

  function genAccessPassword() {
    var words = ['Maple', 'Cedar', 'Clover', 'Ember', 'Haven', 'Lumen', 'Mango', 'Saffron', 'Basil', 'Nimbus', 'Rosemary', 'Thyme'];
    return words[Math.floor(Math.random() * words.length)] + '-' + (Math.floor(Math.random() * 9000) + 1000);
  }

  function seedPerUserKeys(uid, ru) {
    if (localStorage.getItem(userKey(uid, 'profile')) === null) {
      localStorage.setItem(userKey(uid, 'profile'), JSON.stringify({ name: ru.name, tagline: ru.tagline || 'Home Cook', bio: ru.bio || '' }));
    }
    ['posts', 'myrecipes', 'bookmarks'].forEach(function (s) {
      if (localStorage.getItem(userKey(uid, s)) === null) localStorage.setItem(userKey(uid, s), JSON.stringify([]));
    });
  }

  function upsertRemoteUser(ru, localPass) {
    var us = getUsers();
    var u = null;
    var email = String(ru.email || '').toLowerCase();
    for (var i = 0; i < us.length; i++) {
      if (us[i].email && us[i].email.toLowerCase() === email) { u = us[i]; break; }
    }
    if (!u) {
      u = { id: ru.id, name: ru.name, tagline: ru.tagline || 'Home Cook', bio: ru.bio || '', email: ru.email, pass: localPass || '', role: ru.role === 'admin' ? 'admin' : 'user', status: ru.status || 'active', following: [] };
      us.push(u);
      seedPerUserKeys(u.id, ru);
    } else {
      u.id = ru.id;
      u.name = ru.name;
      if (ru.tagline) u.tagline = ru.tagline;
      if (ru.bio !== undefined && ru.bio !== null) u.bio = ru.bio;
      u.email = ru.email;
      u.role = (u.role === 'admin' || ru.role === 'admin') ? 'admin' : 'user';
      u.status = ru.status || u.status;
      if (localPass) u.pass = localPass;
    }
    saveUsers();
    return u;
  }

  function migrateLegacyData() {
    var legacy = {
      inventory: 'kitchenshare.inventory',
      shopping: 'kitchenshare.shopping',
      profile: 'kitchenshare.profile',
      bookmarks: 'kitchenshare.bookmarks',
      myrecipes: 'kitchenshare.myrecipes',
      posts: 'kitchenshare.posts'
    };
    Object.keys(legacy).forEach(function (k) {
      try {
        var raw = localStorage.getItem(legacy[k]);
        if (raw) {
          localStorage.setItem('kitchenshare.u.u-sugu.' + k, raw);
          localStorage.removeItem(legacy[k]);
        }
      } catch (e) {}
    });
  }

  function seedDemoContent() {
    migrateLegacyData();
    var posts = {
      'u-swetha': [
        { id: 'p-' + Date.now().toString(36) + 'a', text: 'Just pulled my grandma\'s apple pie out of the oven — the whole kitchen smells amazing!', by: 'swetha', byId: 'u-swetha', time: '2h ago', ts: Date.now() - 2 * 3600000 }
      ],
      'u-viji': [
        { id: 'p-' + Date.now().toString(36) + 'b', text: 'Made a simple dal tadka for dinner — low and slow with ghee.', by: 'viji', byId: 'u-viji', time: '5h ago', ts: Date.now() - 5 * 3600000 }
      ],
      'u-saravana': [
        { id: 'p-' + Date.now().toString(36) + 'c', text: 'Sunday sambar with a spoon of ghee. Best combo ever.', by: 'saravana', byId: 'u-saravana', time: '1d ago', ts: Date.now() - 24 * 3600000 }
      ]
    };
    Object.keys(posts).forEach(function (uid) {
      if (localStorage.getItem('kitchenshare.u.' + uid + '.posts') === null) {
        localStorage.setItem('kitchenshare.u.' + uid + '.posts', JSON.stringify(posts[uid]));
      }
    });
    Object.keys(users).forEach(function () {});
    if (localStorage.getItem('kitchenshare.u.u-sugu.posts') === null) {
      localStorage.setItem('kitchenshare.u.u-sugu.posts', JSON.stringify([]));
    }
    var seedProfiles = {};
    users.forEach(function (u) { seedProfiles[u.id] = u; });
    Object.keys(seedProfiles).forEach(function (uid) {
      var u = seedProfiles[uid];
      if (u.id === 'u-sugu') return;
      if (localStorage.getItem('kitchenshare.u.' + uid + '.profile') === null) {
        localStorage.setItem('kitchenshare.u.' + uid + '.profile', JSON.stringify({ name: u.name, tagline: u.tagline, bio: u.bio }));
      }
    });
    if (localStorage.getItem('kitchenshare.comments') === null) {
      var seedComments = {
        'rustic-basil-pomodoro': [
          { id: 'c-demo-a', text: 'Tried this with whole-wheat penne and it was a hit. Add a pinch of chilli flakes at the end!', by: 'saravana', userId: 'u-saravana', time: '1d ago', ts: Date.now() - 24 * 3600000, likes: ['u-viji', 'u-swetha'] },
          { id: 'c-demo-b', text: 'Perfect weeknight pasta. The fresh basil really makes the sauce pop.', by: 'viji', userId: 'u-viji', time: '12h ago', ts: Date.now() - 12 * 3600000, likes: ['u-sugu'] }
        ],
        'masala-dosa': [
          { id: 'c-demo-c', text: 'Fermenting overnight gives the best crisp edge. Great recipe!', by: 'swetha', userId: 'u-swetha', time: '2d ago', ts: Date.now() - 48 * 3600000, likes: ['u-saravana'] }
        ]
      };
      localStorage.setItem('kitchenshare.comments', JSON.stringify(seedComments));
    }
  }

