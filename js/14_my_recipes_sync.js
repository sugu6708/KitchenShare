/* KitchenShare - my_recipes_sync | module 14/22 | classic script, loads in filename order */
"use strict";
  function ensureMyRecipes() { if (myRecipes === null) { myRecipes = getUserData(currentUserId(), 'myrecipes', []); DS.recipes.load(); } }
  function ensurePosts() { if (posts === null) { posts = getUserData(currentUserId(), 'posts', []); DS.posts.load(); } }
  function saveMyRecipes() { setUserData(currentUserId(), 'myrecipes', myRecipes); dsCoalesce('recipes', function () { DS.recipes.saveAll(myRecipes || []); }); }
  function savePosts() { setUserData(currentUserId(), 'posts', posts); dsCoalesce('posts', function () { DS.posts.saveAll(posts || []); }); }

  /* ---------------- Shared content sync (server.py) ---------------- */

  function syncAuth() {
    var u = currentUser();
    if (!u) return null;
    return { authEmail: u.email || '', authPass: u.pass || '' };
  }

  function syncPushProfile() {
    var a = syncAuth();
    if (!a) return;
    var uid = currentUserId();
    var prof = getUserData(uid, 'profile', null) || {};
    serverApi('saveProfile', { authEmail: a.authEmail, authPass: a.authPass, profile: Object.assign({ userId: uid }, prof) });
  }

  function syncPushRecipe(r) {
    var a = syncAuth();
    if (!a || !r || !r.id) return;
    serverApi('saveRecipe', { authEmail: a.authEmail, authPass: a.authPass, recipe: Object.assign({ ownerId: currentUserId() }, r) });
  }

  function syncDeleteRecipe(rid) {
    dsQueueDelete('recipes', rid);
    var a = syncAuth();
    if (!a) return;
    serverApi('deleteRecipe', { authEmail: a.authEmail, authPass: a.authPass, id: rid });
  }

  function syncPushPost(p) {
    var a = syncAuth();
    if (!a || !p || !p.id) return;
    serverApi('savePost', { authEmail: a.authEmail, authPass: a.authPass, post: Object.assign({ userId: currentUserId() }, p) });
  }

  function syncDeletePost(pid) {
    var a = syncAuth();
    if (!a) return;
    serverApi('deletePost', { authEmail: a.authEmail, authPass: a.authPass, id: pid });
  }

  function syncComments(rid) {
    var a = syncAuth();
    if (!a) return;
    serverApi('saveComments', { authEmail: a.authEmail, authPass: a.authPass, recipeId: rid, comments: getComments(rid) });
  }

  function syncPushAll() {
    var a = syncAuth();
    if (!a) return;
    var uid = currentUserId();
    syncPushProfile();
    ensureMyRecipes();
    ensurePosts();
    myRecipes.forEach(function (r) { syncPushRecipe(r); });
    posts.forEach(function (p) { syncPushPost(p); });
    Object.keys(lsGet(DB_KEYS.comments, {}) || {}).forEach(function (rid) { syncComments(rid); });
  }

  function syncPull() {
    return serverApi('getUsers', {}).then(function (ru) {
      var us = getUsers();
      var changed = false;
      if (ru && Array.isArray(ru.users)) {
        ru.users.forEach(function (remote) {
          var found = null;
          us.forEach(function (l) { if (l.id === remote.id) found = l; });
          if (found) {
            if (remote.name && found.name !== remote.name) { found.name = remote.name; changed = true; }
            if (remote.tagline !== undefined && remote.tagline !== null && found.tagline !== remote.tagline) { found.tagline = remote.tagline; changed = true; }
            if (remote.bio !== undefined && remote.bio !== null && found.bio !== remote.bio) { found.bio = remote.bio; changed = true; }
            if (remote.role && found.role !== remote.role) { found.role = remote.role; changed = true; }
          } else {
            us.push({
              id: remote.id, name: remote.name || 'Member', tagline: remote.tagline || 'Home Cook',
              bio: remote.bio || '', email: remote.email || '', pass: '', role: remote.role === 'admin' ? 'admin' : 'user',
              status: 'active', following: []
            });
            seedPerUserKeys(remote.id, remote);
            changed = true;
          }
        });
        if (changed) saveUsers();
      }
      return serverApi('getContent', {});
    }).then(function (r) {
      if (!r || !r.content) return;
      var c = r.content;
      if (c.profiles) {
        Object.keys(c.profiles).forEach(function (uid) {
          var p = c.profiles[uid];
          if (!p) return;
          var u = getUserById(uid);
          if (u) {
            if (p.name) u.name = p.name;
            if (p.tagline !== undefined && p.tagline !== null) u.tagline = p.tagline;
            if (p.bio !== undefined && p.bio !== null) u.bio = p.bio;
          }
          var prof = getUserData(uid, 'profile', null) || {};
          var merged = {};
          if (p.name !== undefined && p.name !== null) merged.name = p.name;
          if (p.tagline !== undefined && p.tagline !== null) merged.tagline = p.tagline;
          if (p.bio !== undefined && p.bio !== null) merged.bio = p.bio;
          if (p.photo !== undefined && p.photo !== null) merged.photo = p.photo;
          setUserData(uid, 'profile', Object.assign({}, prof, merged));
        });
        saveUsers();
      }
      if (c.recipes) {
        Object.keys(c.recipes).forEach(function (rid) {
          var rec = c.recipes[rid];
          if (!rec || !rec.recipe || !rec.ownerId) return;
          var arr = getUserData(rec.ownerId, 'myrecipes', []) || [];
          var idx = -1;
          arr.forEach(function (r2, i) { if (r2 && r2.id === rid) idx = i; });
          if (idx === -1) arr.unshift(rec.recipe);
          else arr[idx] = rec.recipe;
          setUserData(rec.ownerId, 'myrecipes', arr);
          RECIPES[rid] = rec.recipe;
        });
      }
      if (c.posts) {
        Object.keys(c.posts).forEach(function (pid) {
          var rec = c.posts[pid];
          if (!rec || !rec.post || !rec.ownerId) return;
          var arr = getUserData(rec.ownerId, 'posts', []) || [];
          var idx = -1;
          arr.forEach(function (p2, i) { if (p2 && p2.id === pid) idx = i; });
          if (idx === -1) arr.unshift(rec.post);
          else arr[idx] = rec.post;
          setUserData(rec.ownerId, 'posts', arr);
        });
      }
      if (c.comments) {
        var all = lsGet(DB_KEYS.comments, {}) || {};
        Object.keys(c.comments).forEach(function (rid) {
          if (Array.isArray(c.comments[rid])) all[rid] = c.comments[rid];
        });
        lsSet(DB_KEYS.comments, all);
      }
      myRecipes = null;
      posts = null;
      profile = null;
      if (typeof DS !== 'undefined' && DS.budget && typeof DS.budget.load === 'function') DS.budget.load();
      refreshFeed();
      if (typeof window.__ksOnSync === 'function') window.__ksOnSync();
    });
  }


