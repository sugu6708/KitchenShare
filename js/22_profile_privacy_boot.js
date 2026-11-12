/* KitchenShare - profile_privacy_boot | module 22/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Unified profile page (user-profile.html) ---------------- */

  if (currentPage === 'user-profile.html') {
    var qs = window.location.search || '';
    var uidMatch = /[?&]uid=([^&]+)/.exec(qs);
    var viewUid = uidMatch ? decodeURIComponent(uidMatch[1]) : currentUserId();
    if (!getUserById(viewUid)) viewUid = currentUserId();
    var isSelf = viewUid === currentUserId();
    var viewUser = getUserById(viewUid);
    var viewProfile = getUserData(viewUid, 'profile', null);
    if (!viewProfile) viewProfile = { name: (viewUser && viewUser.name) || 'Home Cook', tagline: (viewUser && viewUser.tagline) || 'Home Cook', bio: (viewUser && viewUser.bio) || '' };

    var pfH2 = document.querySelector('main h2');
    if (pfH2) pfH2.textContent = viewProfile.name || viewUser.name;
    document.querySelectorAll('main span.uppercase.text-primary, main span.text-primary.uppercase').forEach(function (s) {
      s.textContent = viewProfile.tagline || viewUser.tagline || 'Home Cook';
    });
    document.querySelectorAll('main p.max-w-md').forEach(function (p) {
      if (viewProfile.bio) p.textContent = viewProfile.bio;
    });
    var heroImg = document.getElementById('profile-photo');
    if (heroImg && viewProfile.photo) heroImg.src = viewProfile.photo;

    document.querySelectorAll('[data-action="edit-profile"]').forEach(function (btn) {
      if (!isSelf) btn.style.display = 'none';
    });
    document.querySelectorAll('a[href="profile-share-sheet.html"]').forEach(function (a) {
      if (!isSelf) a.style.display = 'none';
    });

    var viewCooked = getUserData(viewUid, 'cooked', null) || [];

    var pstats = getProfileStats(viewUid);
    var setText = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = String(val); };
    setText('ps-cooked', pstats.cooked);
    setText('ps-saved', pstats.savedKg);
    setText('ps-likes', pstats.likes);
    setText('ps-streak', pstats.streak);
    setText('ps-followers', pstats.followers);
    setText('ps-following', pstats.following);

    var maxWeekly = 1;
    pstats.weekly.forEach(function (w) { if (w.count > maxWeekly) maxWeekly = w.count; });
    document.querySelectorAll('#weekly-bars [data-day]').forEach(function (bar) {
      var fill = bar.querySelector('.bar-fill');
      var day = bar.getAttribute('data-day');
      var cnt = 0;
      pstats.weekly.forEach(function (w) { if (w.day === day) cnt = w.count; });
      if (fill) fill.style.height = (cnt ? Math.max(8, Math.round(cnt / maxWeekly * 100)) : 0) + '%';
    });

    /* --- Achievements grid (KS_ACHIEVEMENTS + profileBadgeHTML) --- */
    var achGrid = document.getElementById('achievements-grid');
    var achCount = document.getElementById('achievements-count');
    if (achGrid) {
      var viewStats = computeAchStats(viewUid);
      var unlockedMap = {};
      getAchUnlocks(viewUid).forEach(function (u) { unlockedMap[u.badgeId] = true; });
      achGrid.innerHTML = KS_ACHIEVEMENTS.map(function (b) {
        var earned = !!unlockedMap[b.id];
        var met = achievementMet(b, viewStats);
        return profileBadgeHTML(b, earned, met);
      }).join('');
      if (achCount) achCount.textContent = Object.keys(unlockedMap).length + '/' + KS_ACHIEVEMENTS.length;
    }

    var favHost = document.getElementById('favorites-scroll');
    var favEmpty = document.getElementById('favorites-empty');
    if (favHost) favHost.innerHTML = pstats.favs.map(profileFavHTML).join('');
    if (favEmpty) favEmpty.style.display = pstats.favs.length ? 'none' : 'flex';

    var favBtn = document.getElementById('view-all-favorites');
    if (favBtn) favBtn.onclick = function () {
      var el = document.getElementById('favorites-scroll');
      if (!el) return;
      el.classList.toggle('flex-wrap');
      el.classList.toggle('overflow-x-auto');
      el.classList.toggle('hide-scrollbar');
      ksToast(el.classList.contains('flex-wrap') ? window.t('toast_showing_all_favs') : window.t('toast_showing_recent_favs'));
    };

    function profileRecipeTileHTML(r) {
      if (!r || !r.name) return '';
      var art = r.img
        ? '<img alt="' + esc(r.name) + '" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" src="' + esc(r.img) + '"/>'
        : '<span class="material-symbols-outlined text-[40px] text-on-surface/60">' + (r.icon || 'restaurant_menu') + '</span>';
      return '<a href="recipe-details.html?recipe=' + encodeURIComponent(r.id || '') + '" class="group flex flex-col gap-2 overflow-hidden rounded-[16px] bg-surface-container-lowest shadow-ambient-sm">' +
        '<div class="relative aspect-square bg-gradient-to-br ' + (r.gradient || 'from-primary-fixed to-secondary-fixed') + ' flex items-center justify-center overflow-hidden">' + art + '</div>' +
        '<span class="font-body-md text-body-md text-on-surface font-bold leading-tight px-2 pb-2">' + esc(r.name) + '</span></a>';
    }

    var postHost = document.getElementById('profile-posts');
    var postEmpty = document.getElementById('profile-posts-empty');
    if (postHost) {
      var viewPosts = getUserData(viewUid, 'posts', []) || [];
      postHost.innerHTML = viewPosts.map(function (p) {
        return '<div class="bg-surface-container-lowest rounded-2xl p-4 border border-surface-variant/50"><p class="font-body-md text-body-md text-on-surface">' + esc(p.text) + '</p><div class="mt-2 font-label-caps text-label-caps text-on-surface-variant">' + esc(timeLabel(p)) + '</div></div>';
      }).join('');
      if (postEmpty) postEmpty.style.display = viewPosts.length ? 'none' : 'flex';
    }

    var cookedHost = document.getElementById('profile-cooked-today');
    var cookedEmpty = document.getElementById('profile-cooked-empty');
    if (cookedHost) {
      var now = new Date();
      var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      var todayEnd = todayStart + 86400000;
      var todayCooked = viewCooked.filter(function (c) { return c.at >= todayStart && c.at < todayEnd; });
      var cookedRows = todayCooked.map(function (c) {
        var rid = c.id;
        var r = rid ? getRecipe(rid) : null;
        if (!r) return null;
        return '<a href="recipe-details.html?recipe=' + encodeURIComponent(rid) + '" class="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-surface-variant/50 hover:bg-surface-container-low transition-colors">' +
          '<span class="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">skillet</span></span>' +
          '<span class="font-body-md text-body-md text-on-surface font-semibold truncate">' + esc(r.name) + '</span></a>';
      }).filter(Boolean);
      cookedHost.innerHTML = cookedRows.join('');
      if (cookedEmpty) cookedEmpty.style.display = cookedRows.length ? 'none' : 'flex';
    }

    var recipeHost = document.getElementById('profile-recipes');
    var recipeEmpty = document.getElementById('profile-recipes-empty');
    if (recipeHost) {
      var allUserRecipes = listAllUserRecipes();
      var userRecipes = [];
      Object.keys(allUserRecipes).forEach(function (rid) {
        if (allUserRecipes[rid].userId === viewUid) userRecipes.push(allUserRecipes[rid].recipe);
      });
      recipeHost.innerHTML = userRecipes.map(profileRecipeTileHTML).join('');
      if (recipeEmpty) recipeEmpty.style.display = userRecipes.length ? 'none' : 'flex';
    }

    /* --- Data & Privacy: export + delete account (self only) --- */
    var dpSection = document.getElementById('data-privacy-section');
    if (dpSection && !isSelf) dpSection.style.display = 'none';

    var exportBtn = document.getElementById('ks-export-data');
    if (exportBtn) exportBtn.addEventListener('click', function () {
      exportBtn.disabled = true;
      serverApi('export-my-data', {}).then(function (r) {
        exportBtn.disabled = false;
        if (!r || r.error) { ksToast(r && r.error ? r.error : 'Export failed'); return; }
        var localDump = {};
        try {
          Object.keys(localStorage).forEach(function (k) {
            if (k.indexOf('kitchenshare.u.' + viewUid + '.') === 0) localDump[k] = localStorage[k];
          });
        } catch (e) {}
        r.local = localDump;
        var blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'kitchenshare-export-' + viewUid + '.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        ksToast(window.t('toast_data_exported'));
      });
    });

    var deleteBtn = document.getElementById('ks-delete-account');
    if (deleteBtn) deleteBtn.addEventListener('click', function () {
      var u = viewUser;
      var answer = window.prompt(window.t('confirm_delete_account'));
      if (answer === null) return;
      if (answer !== (u && u.name) && answer !== (u && u.email)) { ksToast(window.t('confirm_delete_account')); return; }
      deleteBtn.disabled = true;
      serverApi('delete-my-account', { confirm: answer }).then(function (r) {
        deleteBtn.disabled = false;
        if (r && r.error) { ksToast(r.error); return; }
        try {
          Object.keys(localStorage).forEach(function (k) {
            if (k.indexOf('kitchenshare.u.' + viewUid + '.') === 0 || k === DB_KEYS.session) localStorage.removeItem(k);
          });
        } catch (e) {}
        session = null;
        ksToast(window.t('toast_account_deleted'));
        setTimeout(function () { window.location.href = 'login.html'; }, 800);
      });
    });
  }

  if (currentPage === 'profile-share-sheet.html') {
    var pfs = getProfile();
    var shareH1 = document.querySelector('h1.font-headline-md');
    if (shareH1 && pfs && pfs.name) shareH1.textContent = pfs.name;
  }

  /* ---------------- Universal server sync (all pages) ---------------- */

  if (currentPage !== 'login.html') {
    var bootServerSync = function () {
      initSyncBadge();
      /* --- Restore session from server cookie --- */
      serverApi('me', {}).then(function (r) {
        if (r && r.user) {
          setSession(r.user.id);
          if (typeof migrateSpendingLog === 'function') migrateSpendingLog(r.user.id);
          updateSyncBadge(true);
        } else {
          updateSyncBadge(false);
        }
        return serverApi('getUsers', {});
      }).then(function (ru) {
        if (ru && Array.isArray(ru.users)) updateSyncBadge(true);
        return ru;
      }).then(function () {
        return syncPull().then(function () { syncPushAll(); });
      }).then(function () {
        if (typeof window.__ksOnSync === 'function') window.__ksOnSync();
        updateSyncBadge(serverStatus());
      });
    };
    // First paint uses localStorage; server sync runs once the page is idle.
    if (!window.__ksSyncStarted) {
      window.__ksSyncStarted = true;
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(bootServerSync, { timeout: 2000 });
      else setTimeout(bootServerSync, 800);
    }
  }

