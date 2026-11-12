/* KitchenShare - profile_bookmarks_stats | module 13/22 | classic script, loads in filename order */
"use strict";
  function getProfile() {
    if (profile) return profile;
    var uid = currentUserId();
    var u = getUserById(uid);
    var d = getUserData(uid, 'profile', null);
    if (!d) {
      d = { name: (u && u.name) || 'sugu', tagline: (u && u.tagline) || 'Home Cook', bio: (u && u.bio) || '' };
      setUserData(uid, 'profile', d);
    }
    profile = {
      name: String(d.name || 'sugu'),
      tagline: String(d.tagline || 'Home Cook'),
      bio: String(d.bio || ''),
      photo: String(d.photo || '')
    };
    return profile;
  }
  function saveProfile() {
    var uid = currentUserId();
    setUserData(uid, 'profile', profile);
    var u = getUserById(uid);
    if (u) {
      u.name = profile.name;
      u.tagline = profile.tagline;
      u.bio = profile.bio;
      u.photo = profile.photo;
      saveUsers();
    }
    syncNameEverywhere(uid, profile.name);
    syncPushProfile();
  }
  function syncNameEverywhere(uid, name) {
    var ps = getUserData(uid, 'posts', []);
    var pdirty = false;
    ps.forEach(function (p) { if (p.userId === uid || p.byId === uid) { p.by = name; pdirty = true; } });
    if (pdirty) setUserData(uid, 'posts', ps);
    var all = lsGet(DB_KEYS.comments, {});
    var cdirty = false;
    Object.keys(all).forEach(function (rid) {
      all[rid].forEach(function (c) { if (c.userId === uid) { c.by = name; cdirty = true; } });
    });
    if (cdirty) lsSet(DB_KEYS.comments, all);
    getUsers().forEach(function (target) {
      var ns = getUserData(target.id, 'notifications', []);
      var ndirty = false;
      ns.forEach(function (n) {
        if (n.title && / started following you/.test(n.title) && n.title.indexOf(name + ' started following you') === -1) {
          n.title = n.title.replace(/^[^\n]* started following you/, name + ' started following you');
          ndirty = true;
        }
      });
      if (ndirty) setUserData(target.id, 'notifications', ns);
    });
  }

  function getBookmarks() {
    if (bookmarks) return bookmarks;
    var d = getUserData(currentUserId(), 'bookmarks', null);
    if (!d) {
      d = [];
      setUserData(currentUserId(), 'bookmarks', d);
    }
    bookmarks = d;
    return bookmarks;
  }
  function saveBookmarks() { setUserData(currentUserId(), 'bookmarks', bookmarks); }
  function isBookmarked(title) { return getBookmarks().indexOf(title) !== -1; }
  function toggleBookmark(title) {
    getBookmarks();
    var i = bookmarks.indexOf(title);
    if (i === -1) { bookmarks.push(title); saveBookmarks(); return true; }
    bookmarks.splice(i, 1);
    saveBookmarks();
    return false;
  }

  /* ---------------- Profile stats (per-user activity) ---------------- */

  function getCookedLog() {
    var d = getUserData(currentUserId(), 'cooked', null);
    if (!d) { d = []; setUserData(currentUserId(), 'cooked', d); }
    return d;
  }
  function recordCook(recipeId) {
    var log = getCookedLog();
    log.push({ id: recipeId || '', at: Date.now() });
    setUserData(currentUserId(), 'cooked', log);
  }
  function getSavedQty() {
    var d = getUserData(currentUserId(), 'saved', null);
    return (d && typeof d.qty === 'number') ? d.qty : 0;
  }
  function recordPurchased(baseQty) {
    setUserData(currentUserId(), 'saved', { qty: getSavedQty() + (baseQty || 0) });
  }
  function findRecipeIdByTitle(title) {
    var t = norm(title);
    if (!t) return null;
    var id = null;
    Object.keys(RECIPES).forEach(function (rid) {
      if (norm(RECIPES[rid].name) === t) id = rid;
    });
    if (id) return id;
    ensureMyRecipes();
    for (var i = 0; i < myRecipes.length; i++) {
      if (norm(myRecipes[i].name) === t) return myRecipes[i].id;
    }
    return null;
  }

  function getProfileStats(uid) {
    var me = uid || currentUserId();
    var cooked = getUserData(me, 'cooked', null) || [];
    var saved = getUserData(me, 'saved', null);
    var savedQty = (saved && typeof saved.qty === 'number') ? saved.qty : 0;
    var bookmarks = getUserData(me, 'bookmarks', []) || [];

    var likes = 0;
    var allComments = lsGet(DB_KEYS.comments, null);
    if (allComments) {
      Object.keys(allComments).forEach(function (rid) {
        (allComments[rid] || []).forEach(function (c) {
          if (c.userId === me) likes += (c.likes || []).length;
        });
      });
    }

    var usersAll = getUsers();
    var meRow = null, following = 0, followers = 0;
    usersAll.forEach(function (u) { if (u.id === me) meRow = u; });
    if (meRow && meRow.following) following = meRow.following.length;
    usersAll.forEach(function (u) { if ((u.following || []).indexOf(me) !== -1) followers++; });

    var favs = [];
    bookmarks.forEach(function (t) {
      var rid = findRecipeIdByTitle(t);
      var r = rid ? getRecipe(rid) : null;
      if (r) favs.push({ id: rid, name: r.name, img: r.img || '', icon: r.icon || 'restaurant_menu', gradient: r.gradient || '' });
    });

    var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var now = new Date();
    var weekly = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000);
      weekly.push({ day: days[(d.getDay() + 6) % 7], count: 0 });
    }
    cooked.forEach(function (c) {
      var diff = Math.floor((now.getTime() - (c.at || now.getTime())) / 86400000);
      if (diff >= 0 && diff < 7) weekly[6 - diff].count++;
    });
    var streak = 0;
    for (var w = 6; w >= 0; w--) { if (weekly[w].count > 0) streak++; else break; }

    return {
      cooked: cooked.length,
      savedKg: roundNum(savedQty / 1000),
      likes: likes,
      streak: streak,
      weekly: weekly,
      followers: followers,
      following: following,
      favs: favs
    };
  }

  function profileFavHTML(r) {
    var art = r.img
      ? '<img alt="' + esc(r.name) + '" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" src="' + esc(r.img) + '"/>'
      : '<span class="material-symbols-outlined text-[48px] text-on-surface/60">' + (r.icon || 'restaurant_menu') + '</span>';
    return '<a href="recipe-details.html?recipe=' + encodeURIComponent(r.id) + '" class="flex flex-col gap-2 min-w-[160px] shrink-0 group">' +
      '<div class="relative aspect-square rounded-[16px] overflow-hidden shadow-ambient-sm bg-gradient-to-br ' + (r.gradient || 'from-primary-fixed to-secondary-fixed') + ' flex items-center justify-center">' + art +
      '<div class="absolute top-2 right-2 bg-surface/80 backdrop-blur-md rounded-full p-1.5 flex items-center justify-center"><span class="material-symbols-outlined text-primary text-[18px]" style="font-variation-settings: \'FILL\' 1;">favorite</span></div>' +
      '</div><span class="font-body-md text-body-md text-on-surface font-bold leading-tight">' + esc(r.name) + '</span></a>';
  }

  function profileBadgeHTML(b, earned, met) {
    var circle, iconCls, icon;
    if (earned) {
      circle = b.tone === 'secondary' ? 'bg-secondary-fixed border-secondary-fixed-dim'
        : b.tone === 'tertiary' ? 'bg-tertiary-container border-tertiary'
          : 'bg-primary-fixed border-primary-fixed-dim';
      iconCls = b.tone === 'secondary' ? 'text-secondary' : b.tone === 'tertiary' ? 'text-on-tertiary-container' : 'text-primary';
      icon = esc(b.icon);
    } else {
      circle = 'bg-surface-variant border-dashed border-outline-variant';
      iconCls = 'text-on-surface-variant';
      icon = 'lock';
    }
    return '<div title="' + esc(b.description) + '" class="' + (earned ? '' : 'opacity-50 grayscale') +
      ' flex flex-col items-center gap-2 rounded-2xl bg-surface-container-lowest shadow-ambient-sm p-4 text-center">' +
      '<div class="relative w-16 h-16 rounded-full border-2 ' + circle + ' flex items-center justify-center">' +
      '<span class="material-symbols-outlined text-[28px] ' + iconCls + '" style="font-variation-settings: \'FILL\' 1;">' + icon + '</span>' +
      (!earned && met ? '<span class="absolute -bottom-1 -right-1 bg-primary text-on-primary rounded-full w-6 h-6 flex items-center justify-center" title="' + window.t('lbl_ready_to_claim') + '"><span class="material-symbols-outlined text-[14px]">auto_awesome</span></span>' : '') +
      '</div>' +
      '<span class="font-body-md text-[14px] leading-tight font-bold text-on-surface">' + esc(achName(b)) + '</span>' +
      '<span class="font-label-caps text-label-caps text-on-surface-variant leading-snug">' + esc(achDesc(b)) + '</span>' +
      '</div>';
  }

