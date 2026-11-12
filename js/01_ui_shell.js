/* KitchenShare - ui_shell | module 01/22 | classic script, loads in filename order */
"use strict";
/* ============================================================
   UI RENDER & BOOTSTRAP (lines ~1–200)
   – currentPage, MAIN, MORE, linkHTML, notifRow, drawerHTML,
     notifHTML, toastHTML insertion, login/signup handlers,
     ksToast, renderNotifications, renderDrawerUser, openLayer/closeLayer,
     keydown, logout, notifClear, lang-switcher click, etc.
   ============================================================ */

var currentPage = (window.location.pathname.split('/').pop() || 'index.html');

  var MAIN = [
    { label: window.t('nav_feed'), href: 'index.html', icon: 'home_storage' },
    { label: window.t('nav_kitchen'), href: 'my-kitchen-inventory.html', icon: 'kitchen' },
    { label: window.t('nav_shopping'), href: 'shopping-list.html', icon: 'shopping_basket' },
    { label: window.t('nav_profile'), href: 'user-profile.html', icon: 'person' }
  ];

  var MORE = [
    { label: window.t('more_recipe_details'), href: 'recipe-details.html', icon: 'restaurant' },
    { label: window.t('more_people'), href: 'people.html', icon: 'groups' },
    { label: window.t('more_leaderboard'), href: 'leaderboard.html', icon: 'emoji_events' },
    { label: window.t('more_budget'), href: 'budget-dashboard.html', icon: 'account_balance' }
  ];

  function linkHTML(it) {
    var active = (currentPage === it.href);
    var cls = active
      ? 'flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-container text-on-primary-container font-body-md text-body-md'
      : 'flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-surface-container-low font-body-md text-body-md transition-colors';
    return '<a href="' + it.href + '" class="' + cls + '"><span class="material-symbols-outlined">' + it.icon + '</span>' + it.label + (active ? '<span class="ml-auto material-symbols-outlined text-[18px]">check</span>' : '') + '</a>';
  }

  function notifRow(icon, title, desc, href) {
    return '<a href="' + href + '" class="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-container-low transition-colors">' +
      '<span class="w-10 h-10 shrink-0 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center"><span class="material-symbols-outlined text-[20px]">' + icon + '</span></span>' +
      '<span class="flex-1"><span class="block font-body-md text-body-md text-on-surface font-semibold leading-tight">' + title + '</span>' +
      '<span class="block font-body-md text-body-md text-on-surface-variant text-sm mt-0.5">' + desc + '</span></span></a>';
  }

  var drawerHTML =
    '<div id="ks-drawer" class="fixed inset-0 z-[70] hidden" aria-hidden="true">' +
    '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" data-ks-close></div>' +
    '<aside class="absolute left-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-surface h-full overflow-y-auto px-container-margin py-6 shadow-[8px_0_32px_rgba(66,88,66,0.15)] slide-left">' +
    '<div class="flex items-center justify-between mb-4">' +
    '<span class="font-display-lg text-headline-md text-primary tracking-tight">KitchenShare</span>' +
    '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close aria-label="' + window.t('drawer_close_menu') + '"><span class="material-symbols-outlined">close</span></button>' +
    '</div>' +
    '<div id="ks-drawer-user" class="mb-6"></div>' +
    '<p class="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">' + window.t('drawer_main') + '</p>' +
    '<nav class="mb-6 flex flex-col gap-1">' + MAIN.map(linkHTML).join('') + '</nav>' +
    '<p class="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">' + window.t('drawer_more') + '</p>' +
    '<nav class="flex flex-col gap-1">' + MORE.map(linkHTML).join('') + '</nav>' +
    '<div id="ks-drawer-admin" class="hidden mb-6"></div>' +
    '<div class="mt-8">' +
    '<label class="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2" for="language-switcher">' + window.t('lang_label') + '</label>' +
    '<select id="language-switcher" class="w-full h-touch-target-min px-4 rounded-xl bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface">' +
    '<option value="en">English</option><option value="ta">தமிழ்</option><option value="kn">ಕನ್ನಡ</option></select>' +
    '</div>' +
    '<div class="mt-8 flex flex-col gap-2">' +
    '<a href="login.html" class="w-full flex items-center justify-center gap-2 h-touch-target-min rounded-full bg-surface-container-high text-on-surface font-headline-md text-[14px] hover:bg-surface-container-highest active:scale-95 transition-all"><span class="material-symbols-outlined text-[18px]">switch_account</span>' + window.t('drawer_switch') + '</a>' +
    '<button id="ks-logout" class="w-full flex items-center justify-center gap-2 h-touch-target-min rounded-full bg-surface-container-high text-on-surface font-headline-md text-[14px] hover:bg-error-container/40 active:scale-95 transition-all"><span class="material-symbols-outlined text-[18px]">logout</span>' + window.t('drawer_logout') + '</button>' +
    '<button id="ks-reset-demo" class="hidden w-full flex items-center justify-center gap-2 h-touch-target-min rounded-full bg-surface-container-high text-on-surface font-headline-md text-[14px] hover:bg-error-container/30 active:scale-95 transition-all"><span class="material-symbols-outlined text-[18px]">restart_alt</span>' + window.t('drawer_reset') + '</button>' +
    '</div></aside></div>';

  var notifHTML =
    '<div id="ks-notif" class="fixed inset-0 z-[70] hidden" aria-hidden="true">' +
    '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" data-ks-close></div>' +
    '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8 max-h-[75vh] overflow-y-auto">' +
    '<div class="flex items-center justify-between mb-4">' +
    '<h2 class="font-headline-md text-headline-md text-on-surface">' + window.t('notif_title') + '</h2>' +
    '<div class="flex items-center gap-1">' +
    '<button id="ks-notif-clear" class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" aria-label="' + window.t('notif_clear') + '"><span class="material-symbols-outlined text-[20px]">delete_sweep</span></button>' +
    '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close aria-label="' + window.t('notif_close') + '"><span class="material-symbols-outlined">close</span></button>' +
    '</div></div>' +
    '<div id="ks-notif-list" class="flex flex-col gap-3"></div>' +
    '</div></div>';

  var toastHTML = '<div id="ks-toast" class="fixed left-1/2 -translate-x-1/2 bottom-[calc(96px+env(safe-area-inset-bottom,20px))] z-[90] flex flex-col items-center gap-2 pointer-events-none"></div>';

  document.body.insertAdjacentHTML('beforeend', drawerHTML + notifHTML + toastHTML);

  /* --- Login form handler (login.html only) --- */
  if (currentPage === 'login.html') {
    var loginBtn = document.getElementById('ks-login-submit');
    if (loginBtn) {
        loginBtn.addEventListener('click', function () {
        var email = document.getElementById('ks-login-email').value;
        var pass = document.getElementById('ks-login-pass').value;
        var errEl = document.getElementById('ks-auth-error');
        errEl.className = 'hidden';
        errEl.textContent = '';
        if (!email || !pass) {
          errEl.className = 'mb-3 p-3 rounded-lg bg-error-container text-on-error-container text-sm';
          errEl.textContent = 'Please enter email and password';
          return;
        }
        loginBtn.disabled = true;
        loginBtn.textContent = window.t('btn_login') || 'Signing in...';
        login(email, pass).then(function () {
          loginBtn.disabled = false;
          loginBtn.textContent = window.t('btn_login') || 'Sign In';
        }).catch(function () {
          loginBtn.disabled = false;
          loginBtn.textContent = window.t('btn_login') || 'Sign In';
        });
      });
    }
    /* --- Forgot password link --- */
    var forgotLink = document.querySelector('a[href="#"]'); // will be added dynamically below
  }

  /* --- Forgot password handler (login.html only) --- */
  if (currentPage === 'login.html') {
    var forgotPasswordLink = document.getElementById('ks-forgot-password');
    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', function (e) {
        e.preventDefault();
        var email = document.getElementById('ks-login-email').value;
        if (email) {
          serverApi('reset-request', { email: email });
        }
        var errEl = document.getElementById('ks-auth-error');
        if (errEl) {
          errEl.className = 'mb-3 p-3 rounded-lg bg-primary-container text-on-primary-container text-sm';
          errEl.textContent = 'Contact your administrator to reset your password.';
        }
      });
    }
  }

  /* --- Signup form handler (signup.html only) --- */
  if (currentPage === 'signup.html') {
    var signupBtn = document.getElementById('ks-signup-submit');
    if (signupBtn) {
      signupBtn.addEventListener('click', function () {
        var name = document.getElementById('ks-signup-name').value.trim();
        var email = document.getElementById('ks-signup-email').value.trim().toLowerCase();
        var pass = document.getElementById('ks-signup-pass').value.trim();
        var passConf = document.getElementById('ks-signup-pass-conf').value.trim();
        var err = document.getElementById('ks-auth-error');
        err.className = 'hidden';
        if (!name) return err.textContent = window.t('lbl_name') + ' required';
        if (!email) return err.textContent = window.t('lbl_email') + ' required';
        if (!pass) return err.textContent = window.t('lbl_password') + ' required';
        if (pass.length < 4) return err.textContent = 'Password must be at least 4 characters';
        if (pass !== passConf) return err.textContent = 'Passwords do not match';
        serverApi('signup', { name: name, email: email, pass: pass }).then(function (r) {
          if (r && r.pending) {
            err.className = '';
            err.textContent = 'Account created pending admin approval. ' + window.t('lbl_pending_approval');
          } else if (r && r.error) {
            err.className = '';
            err.textContent = r.error;
          } else if (r && r.user) {
            ksToast(window.t('toast_signed_in'));
          }
        });
      });
    }
  }

  var drawer = document.getElementById('ks-drawer');
  var notif = document.getElementById('ks-notif');
  var toastHost = document.getElementById('ks-toast');

  function ksToast(msg, dur) {
    if (!toastHost) return;
    var t = document.createElement('div');
    t.className = 'max-w-[90vw] bg-inverse-surface text-inverse-on-surface font-body-md text-body-md px-5 py-3 rounded-full shadow-lg transition-opacity duration-300 opacity-0';
    t.textContent = msg;
    toastHost.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () {
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 320);
    }, dur || 2200);
  }

  function renderNotifications() {
    var list = document.getElementById('ks-notif-list');
    if (!list) return;
    var ns = getNotifications();
    if (!ns.length) {
      list.innerHTML = '<div class="py-10 text-center"><span class="material-symbols-outlined text-[40px] text-outline">notifications_none</span><p class="mt-2 font-body-md text-body-md text-on-surface-variant">' + window.t('notif_empty') + '</p></div>';
      return;
    }
    list.innerHTML = ns.map(function (n) {
      return notifRow(n.icon, n.title, n.desc, n.href || 'index.html') + (n.time || typeof n.ts === 'number' ? '<span class="block -mt-2 ml-[52px] font-label-caps text-label-caps text-on-surface-variant text-[11px]">' + esc(timeLabel(n)) + '</span>' : '');
    }).join('');
  }

  function renderDrawerUser() {
    var host = document.getElementById('ks-drawer-user');
    if (!host) return;
    var u = currentUser();
    var name = u ? u.name : window.t('drawer_guest');
    var tag = u ? u.tagline : window.t('drawer_home_cook');
    host.innerHTML =
      '<a href="user-profile.html" class="flex items-center gap-3 p-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors">' +
      avatarHTML(u ? u.id : '', name, 'w-11 h-11 shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline-md text-[16px]') +
      '<span class="min-w-0"><span class="block font-body-md text-body-md text-on-surface font-semibold truncate">' + esc(name) + '</span>' +
      '<span class="block font-body-md text-body-md text-on-surface-variant text-sm truncate">' + esc(tag) + (isAdminUser() ? ' · ' + window.t('drawer_admin_tag') : '') + '</span></span>' +
      '<span class="ml-auto material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span></a>';
    var adminHost = document.getElementById('ks-drawer-admin');
    if (adminHost) {
      if (isAdminUser()) {
        adminHost.classList.remove('hidden');
        adminHost.innerHTML =
          '<p class="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">' + window.t('drawer_admin') + '</p>' +
          '<a href="admin.html" class="flex items-center gap-3 px-4 py-3 rounded-xl bg-tertiary-container text-on-tertiary-container font-body-md text-body-md"><span class="material-symbols-outlined">admin_panel_settings</span>' + window.t('drawer_admin_panel') + '<span class="ml-auto material-symbols-outlined text-[18px]">chevron_right</span></a>';
      } else {
        adminHost.classList.add('hidden');
        adminHost.innerHTML = '';
      }
    }
    var resetDemoBtn = document.getElementById('ks-reset-demo');
    if (resetDemoBtn) resetDemoBtn.classList.toggle('hidden', !isAdminUser());
  }

  function openLayer(el) { el.classList.remove('hidden'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeLayer(el) { el.classList.add('hidden'); el.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

  document.querySelectorAll('[data-action="menu"]').forEach(function (b) {
    b.addEventListener('click', function () { renderDrawerUser(); openLayer(drawer); });
  });
  document.querySelectorAll('[data-action="notifications"]').forEach(function (b) {
    b.addEventListener('click', function () { renderNotifications(); openLayer(notif); });
  });
  document.querySelectorAll('[data-ks-close]').forEach(function (b) {
    b.addEventListener('click', function () {
      var layer = b.closest('#ks-drawer, #ks-notif');
      if (layer) closeLayer(layer);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeLayer(drawer); closeLayer(notif); }
  });

  var logoutBtn = document.getElementById('ks-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', function () {
    logout();
    window.location.href = 'login.html';
  });

  var notifClear = document.getElementById('ks-notif-clear');
  if (notifClear) notifClear.addEventListener('click', function () {
    clearNotifications();
    renderNotifications();
    ksToast(window.t('toast_notif_cleared'));
  });

  var langSw = document.getElementById('language-switcher');
  if (langSw) langSw.addEventListener('change', function () {
    window.setLang(langSw.value);
  });

  document.addEventListener('click', function (e) {
    var followBtn = e.target.closest('[data-action="follow"]');
    if (followBtn) {
      e.preventDefault();
      e.stopPropagation();
      var uid = followBtn.getAttribute('data-user');
      if (!uid) return;
      var res = toggleFollow(uid);
      if (res === null) { ksToast(window.t('toast_cant_follow_self')); return; }
      updateFollowButtons();
      ksToast(res ? window.t('toast_following') : window.t('toast_unfollowed'));
      return;
    }
      var editBtn = e.target.closest('[data-action="edit-recipe"]');
      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        var rid = editBtn.getAttribute('data-recipe');
        var found = findRecipeOwner(rid);
        if (found) openRecipeEditor(found.recipe, found.userId, false);
        else if (isAdminUser() && (catalogEdits[rid] || RECIPES[rid])) {
          var catRecipe = catalogEdits[rid] || RECIPES[rid];
          if (!catRecipe.id) catRecipe.id = rid;
          openRecipeEditor(catRecipe, null, true);
        }
      }
  });

  function updateFollowButtons() {
    document.querySelectorAll('[data-action="follow"]').forEach(function (btn) {
      var uid = btn.getAttribute('data-user');
      if (!uid) return;
      var me = currentUser();
      if (me && me.id === uid) {
        btn.setAttribute('disabled', '');
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.textContent = window.t('drawer_you');
        return;
      }
      if (isFollowing(uid)) {
        btn.textContent = window.t('lbl_following_btn');
        btn.classList.add('bg-secondary-fixed', 'text-on-secondary-fixed');
        btn.classList.remove('bg-primary', 'text-on-primary');
      } else {
        btn.textContent = window.t('lbl_follow');
        btn.classList.remove('bg-secondary-fixed', 'text-on-secondary-fixed');
        btn.classList.add('bg-primary', 'text-on-primary');
      }
    });
  }

  function loadLikeStatuses() {
    var ids = [];
    document.querySelectorAll('[data-action="like"]').forEach(function (btn) {
      var pid = btn.getAttribute('data-post');
      if (pid) ids.push(pid);
    });
    if (!ids.length || !KS_SERVER_AVAILABLE) return;
    socialLikeBatch(ids).then(function (r) {
      if (!r || !r.ok || !r.likes) return;
      Object.keys(r.likes).forEach(function (pid) {
        var st = r.likes[pid];
        var btn = document.querySelector('[data-action="like"][data-post="' + pid + '"]');
        if (!btn) return;
        var icon = btn.querySelector('.ks-like-icon');
        var cnt = btn.querySelector('.ks-like-count');
        if (cnt) cnt.textContent = st.count;
        if (icon) {
          icon.textContent = st.liked ? 'favorite' : 'favorite_border';
          if (st.liked) icon.style.fontVariationSettings = "'FILL' 1";
          if (st.liked) icon.style.color = '#ef4444';
        }
      });
    });
  }

  function bindBookmark(btn) {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      var card = btn.closest('article');
      var title = card ? String((card.querySelector('h2') || {}).textContent || '').trim() : '';
      var span = btn.querySelector('.material-symbols-outlined');
      if (!span) return;
      var filled = toggleBookmark(title);
      if (filled) {
        span.textContent = 'bookmark';
        span.style.fontVariationSettings = "'FILL' 1";
      } else {
        span.textContent = 'bookmark_border';
        span.style.removeProperty('font-variation-settings');
      }
      ksToast(filled ? window.t('toast_saved') : window.t('toast_removed_saved'));
    });
  }

  function bindAllBookmarks() {
    document.querySelectorAll('[data-action="bookmark"]').forEach(bindBookmark);
  }
  bindAllBookmarks();

  function openEditProfile() {
    var nameEl = document.querySelector('main h2');
    var tagEl = document.querySelector('main span.uppercase.text-primary');
    var bioEl = null;
    document.querySelectorAll('main p').forEach(function (p) {
      if (p.className.indexOf('max-w-md') !== -1) bioEl = p;
    });
    var currentName = nameEl ? nameEl.textContent.trim() : '';
    var currentTag = tagEl ? tagEl.textContent.trim() : '';
    var currentBio = bioEl ? bioEl.textContent.trim() : '';
    var photoData = photoOf(currentUserId()) || '';
    var heroDefault = '';
    var heroStart = document.getElementById('profile-photo');
    if (heroStart) heroDefault = heroStart.getAttribute('data-default') || heroStart.getAttribute('src') || '';

    var host = document.getElementById('ks-edit-profile');
    if (host) host.remove();

    host = document.createElement('div');
    host.id = 'ks-edit-profile';
    host.className = 'fixed inset-0 z-[75]';
    host.innerHTML =
      '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
      '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
      '<div class="flex items-center justify-between mb-5">' +
      '<h2 class="font-headline-md text-headline-md text-on-surface">' + window.t('lbl_edit_profile') + '</h2>' +
      '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close aria-label="' + window.t('lbl_close') + '"><span class="material-symbols-outlined">close</span></button>' +
      '</div>' +
      '<div class="flex items-center gap-3 mb-4">' +
      '<span id="ks-edit-photo-prev" class="w-16 h-16 shrink-0 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center font-headline-md text-[18px] text-on-surface-variant"></span>' +
      '<div class="flex flex-col gap-2 items-start">' +
      '<button id="ks-edit-photo-btn" type="button" class="flex items-center gap-1 h-10 px-4 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps hover:bg-surface-container-highest transition-colors"><span class="material-symbols-outlined text-[16px]">add_a_photo</span>' + window.t('lbl_add_photo') + '</button>' +
      '<button id="ks-edit-photo-remove" type="button" class="hidden flex items-center gap-1 h-8 px-3 rounded-full text-error font-label-caps text-label-caps hover:bg-error-container/40 transition-colors"><span class="material-symbols-outlined text-[16px]">delete</span>' + window.t('lbl_remove_photo') + '</button>' +
      '</div>' +
      '<input id="ks-edit-photo-file" type="file" accept="image/*" capture="environment" class="hidden"/>' +
      '</div>' +
      '<label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_name') + '</label>' +
      '<input id="ks-edit-name" class="w-full h-touch-target-min px-4 rounded-xl bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface" type="text" value="' + esc(currentName) + '"/>' +
      '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_tagline') + '</label>' +
      '<input id="ks-edit-tag" class="w-full h-touch-target-min px-4 rounded-xl bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface" type="text" value="' + esc(currentTag) + '"/>' +
      '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_bio') + '</label>' +
      '<textarea id="ks-edit-bio" class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface" rows="3">' + currentBio + '</textarea>' +
      '<button class="mt-6 w-full h-14 rounded-full bg-primary text-on-primary font-headline-md text-[18px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">' + window.t('lbl_save') + '</button>' +
      '</div>';
    document.body.appendChild(host);
    document.body.style.overflow = 'hidden';

    function closeEdit() { host.remove(); document.body.style.overflow = ''; }

    var photoPrev = host.querySelector('#ks-edit-photo-prev');
    var photoBtn = host.querySelector('#ks-edit-photo-btn');
    var photoRm = host.querySelector('#ks-edit-photo-remove');
    var photoFile = host.querySelector('#ks-edit-photo-file');
    function renderPhotoPrev() {
      if (!photoPrev) return;
      if (photoData) {
        photoPrev.innerHTML = '<img alt="" class="w-full h-full object-cover" src="' + esc(photoData) + '"/>';
      } else {
        photoPrev.innerHTML = esc(initialsOf(currentName));
      }
      if (photoRm) photoRm.classList.toggle('hidden', !photoData);
    }
    renderPhotoPrev();
    if (photoBtn) photoBtn.addEventListener('click', function () { photoFile.click(); });
    if (photoFile) photoFile.addEventListener('change', function () {
      var f = photoFile.files && photoFile.files[0];
      if (!f || f.type.indexOf('image/') !== 0) return;
      photoBtn.disabled = true;
      ksUploadImage(f).then(function (rec) {
        var src = (rec && rec.url) ? rec.url : (rec && rec.dataUrl) ? rec.dataUrl : '';
        if (src) { photoData = src; renderPhotoPrev(); }
      }).catch(function () {}).then(function () { photoBtn.disabled = false; });
      photoFile.value = '';
    });
    if (photoRm) photoRm.addEventListener('click', function () { photoData = ''; renderPhotoPrev(); });

    host.querySelector('[data-ks-close]').addEventListener('click', closeEdit);
    host.querySelector('.absolute.inset-0').addEventListener('click', closeEdit);
    host.querySelector('button.w-full.h-14').addEventListener('click', function () {
      var n = document.getElementById('ks-edit-name').value.trim();
      var t = document.getElementById('ks-edit-tag').value.trim();
      var b = document.getElementById('ks-edit-bio').value.trim();
      if (!n) { ksToast(window.t('toast_edit_profile_name')); return; }
      if (nameEl) nameEl.textContent = n;
      if (tagEl) tagEl.textContent = t || window.t('drawer_home_cook');
      if (bioEl) bioEl.textContent = b;
      getProfile();
      profile.name = n;
      profile.tagline = t || window.t('drawer_home_cook');
      profile.bio = b;
      profile.photo = photoData;
      saveProfile();
      var heroImg = document.getElementById('profile-photo');
      if (heroImg && photoData) heroImg.src = photoData;
      else if (heroImg && heroDefault) heroImg.src = heroDefault;
      ksToast(window.t('toast_profile_updated'));
      closeEdit();
    });
  }

  document.querySelectorAll('[data-action="edit-profile"]').forEach(function (btn) {
    btn.addEventListener('click', openEditProfile);
  });

  document.querySelectorAll('header').forEach(function (header) {
    if (header.querySelector('nav')) return;
    var nav = document.createElement('nav');
    nav.className = 'hidden md:flex justify-center pb-4 gap-8';
    MAIN.forEach(function (it) {
      var a = document.createElement('a');
      a.href = it.href;
      a.className = currentPage === it.href
        ? 'flex flex-col items-center justify-center text-primary border-b-2 border-primary hover:opacity-80 transition-opacity active:scale-95 duration-200 pb-1'
        : 'flex flex-col items-center justify-center text-on-surface-variant hover:opacity-80 transition-opacity active:scale-95 duration-200';
      var s = document.createElement('span');
      s.className = 'font-label-caps text-label-caps';
      s.textContent = it.label;
      a.appendChild(s);
      nav.appendChild(a);
    });
    header.appendChild(nav);
  });

