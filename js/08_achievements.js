/* KitchenShare - achievements | module 08/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Achievements / gamification (Phase 7) ---------------- */
  /*
   * Badge catalog mirrors ACHIEVEMENT_DEFS in server.py (same schema:
   * {id, name, description, icon, criteria:{type,value}}).
   * criteria.type: recipes | posts | followers | likes | cooked | streak | savedKg | recipeCooked.
   * Unlocks persist per-user at kitchenshare.u.<uid>.achievements and sync to the
   * server (achievements table) so badges follow you across devices.
   */

  var KS_ACHIEVEMENTS = [
    { id: 'first-recipe', name: 'First Recipe', description: 'Post your first recipe', icon: 'restaurant_menu', tone: 'primary', criteria: { type: 'recipes', value: 1 } },
    { id: 'recipe-collector', name: 'Recipe Collector', description: 'Post 5 recipes', icon: 'menu_book', tone: 'primary', criteria: { type: 'recipes', value: 5 } },
    { id: 'master-chef', name: 'Master Chef', description: 'Post 10 recipes', icon: 'workspace_premium', tone: 'tertiary', criteria: { type: 'recipes', value: 10 } },
    { id: 'first-cook', name: 'First Cook', description: 'Cook your first recipe', icon: 'skillet', tone: 'primary', criteria: { type: 'cooked', value: 1 } },
    { id: 'spice-master', name: 'Spice Master', description: 'Cook 3 recipes', icon: 'local_fire_department', tone: 'secondary', criteria: { type: 'cooked', value: 3 } },
    { id: 'baking-pro', name: 'Baking Pro', description: 'Cook 10 recipes', icon: 'cake', tone: 'primary', criteria: { type: 'cooked', value: 10 } },
    { id: 'kitchen-legend', name: 'Kitchen Legend', description: 'Cook 25 recipes', icon: 'military_tech', tone: 'tertiary', criteria: { type: 'cooked', value: 25 } },
    { id: 'pasta-perfectionist', name: 'Pasta Perfectionist', description: 'Cook Rustic Basil Pomodoro', icon: 'ramen_dining', tone: 'secondary', criteria: { type: 'recipeCooked', value: 'rustic-basil-pomodoro' } },
    { id: 'zero-waste-hero', name: 'Zero Waste Hero', description: 'Save 5 kg of ingredients from your shopping list', icon: 'eco', tone: 'primary', criteria: { type: 'savedKg', value: 5 } },
    { id: 'first-post', name: 'First Post', description: 'Share your first community post', icon: 'post_add', tone: 'primary', criteria: { type: 'posts', value: 1 } },
    { id: 'chatty-chef', name: 'Chatty Chef', description: 'Share 5 community posts', icon: 'forum', tone: 'secondary', criteria: { type: 'posts', value: 5 } },
    { id: 'first-follower', name: 'First Follower', description: 'Get your first follower', icon: 'person_add', tone: 'primary', criteria: { type: 'followers', value: 1 } },
    { id: 'crowd-favorite', name: 'Crowd Favorite', description: 'Get 5 followers', icon: 'groups', tone: 'tertiary', criteria: { type: 'followers', value: 5 } },
    { id: 'streak-starter', name: 'Streak Starter', description: 'Cook 3 days in a row', icon: 'whatshot', tone: 'secondary', criteria: { type: 'streak', value: 3 } },
    { id: 'week-on-fire', name: 'Week on Fire', description: 'Keep a 7-day cooking streak', icon: 'local_fire_department', tone: 'tertiary', criteria: { type: 'streak', value: 7 } }
  ];
  var KS_ACH_INDEX = {};
  KS_ACHIEVEMENTS.forEach(function (b) { KS_ACH_INDEX[b.id] = b; });

  function getAchUnlocks(uid) {
    return getUserData(uid || currentUserId(), 'achievements', []) || [];
  }
  function saveAchUnlocks(uid, arr) {
    setUserData(uid || currentUserId(), 'achievements', arr);
  }

  /* Streak = consecutive days with >=1 cook ending today (or yesterday if today has no cook yet). */
  function computeStreakDays(cookedLog) {
    var daySet = {};
    var keyOf = function (dt) { return dt.getFullYear() + '-' + dt.getMonth() + '-' + dt.getDate(); };
    (cookedLog || []).forEach(function (c) {
      if (!c || !c.at) return;
      daySet[keyOf(new Date(c.at))] = true;
    });
    var cursor = new Date();
    if (!daySet[keyOf(cursor)]) {
      cursor.setDate(cursor.getDate() - 1);
      if (!daySet[keyOf(cursor)]) return 0;
    }
    var days = 0;
    while (daySet[keyOf(cursor)]) { days++; cursor.setDate(cursor.getDate() - 1); }
    return days;
  }

  /* Full stat snapshot used by achievement criteria + leaderboard. */
  function computeAchStats(uid) {
    var me = uid || currentUserId();
    var cookedLog = getUserData(me, 'cooked', null) || [];
    var myRecipesArr = getUserData(me, 'myrecipes', []) || [];
    var postsArr = getUserData(me, 'posts', []) || [];
    var savedRec = getUserData(me, 'saved', null);
    var savedKg = (savedRec && typeof savedRec.qty === 'number') ? savedRec.qty / 1000 : 0;
    var followers = 0;
    getUsers().forEach(function (u) { if ((u.following || []).indexOf(me) !== -1) followers++; });
    var likes = 0;
    var allComments = lsGet(DB_KEYS.comments, null);
    if (allComments) {
      Object.keys(allComments).forEach(function (rid) {
        (allComments[rid] || []).forEach(function (c) {
          if (c.userId === me) likes += (c.likes || []).length;
        });
      });
    }
    return {
      recipes: myRecipesArr.length,
      posts: postsArr.length,
      followers: followers,
      likes: likes,
      cooked: cookedLog.length,
      streak: computeStreakDays(cookedLog),
      savedKg: Math.round(savedKg * 100) / 100,
      cookedIds: cookedLog.map(function (c) { return c.id; })
    };
  }

  function achievementMet(badge, stats) {
    var c = badge.criteria || {};
    if (c.type === 'recipeCooked') return (stats.cookedIds || []).indexOf(c.value) !== -1;
    var cur = stats[c.type];
    return typeof cur === 'number' && cur >= c.value;
  }

  /* Evaluate all badges for a user; records + celebrates new unlocks.
   * opts.silent=true skips the celebration modal (background/passive checks). */
  function evaluateAchievements(uid, opts) {
    uid = uid || currentUserId();
    var silent = opts && opts.silent;
    var stats = computeAchStats(uid);
    var have = {};
    var existing = getAchUnlocks(uid);
    existing.forEach(function (u) { have[u.badgeId] = u.at; });
    var newly = KS_ACHIEVEMENTS.filter(function (b) { return !have[b.id] && achievementMet(b, stats); });
    if (newly.length) {
      var now = Date.now();
      newly.forEach(function (b) { existing.push({ badgeId: b.id, at: now }); });
      saveAchUnlocks(uid, existing);
      pushNotification(uid, {
        icon: 'workspace_premium',
        title: 'Achievement unlocked: ' + newly[0].name,
        desc: newly[0].description,
        href: 'user-profile.html',
        time: 'Just now',
        ts: now
      });
      socialAchSync(existing);
      if (!silent && uid === currentUserId()) queueCelebration(newly);
    }
    return newly;
  }

  /* --- Server sync --- */
  function socialAchievements(userId) { return serverApi('achievements-list', { userId: userId || '' }); }
  function socialAchEvaluate(stats) { return serverApi('achievements-evaluate', { stats: stats }); }
  function socialLeaderboard() { return serverApi('leaderboard', {}); }
  function socialAchSync(unlockArr) {
    serverApi('achievements-unlock', {
      unlocks: (unlockArr || []).map(function (u) { return { badgeId: u.badgeId, unlockedAt: u.at }; })
    }).then(function () { }).catch(function () { });
  }

  /* Merge remote unlock state into local cache (earliest timestamp wins). */
  function mergeRemoteAchievements(uid) {
    return socialAchievements(uid).then(function (r) {
      if (!r || !r.ok || !Array.isArray(r.unlocked)) return null;
      var local = getAchUnlocks(uid);
      var map = {};
      local.forEach(function (u) { map[u.badgeId] = u.at; });
      r.unlocked.forEach(function (u) {
        if (!map[u.badgeId] || (typeof u.unlockedAt === 'number' && u.unlockedAt < map[u.badgeId])) {
          map[u.badgeId] = typeof u.unlockedAt === 'number' ? u.unlockedAt : Date.now();
        }
      });
      var merged = Object.keys(map).filter(function (id) { return !!KS_ACH_INDEX[id]; })
        .map(function (id) { return { badgeId: id, at: map[id] }; })
        .sort(function (a, b) { return a.at - b.at; });
      saveAchUnlocks(uid, merged);
      return merged;
    }).catch(function () { return null; });
  }

