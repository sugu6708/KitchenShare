/* KitchenShare - notifications_follows | module 07/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Notifications (per-user) ---------------- */

  function seedNotifications(uid) {
    var u = getUserById(uid);
    var name = u ? u.name : 'You';
    if (uid === 'u-sugu') {
      return [
        { icon: 'favorite', title: 'saravana liked your recipe', desc: 'Masala Dosa earned a new like today.', href: 'index.html', time: '1h ago', ts: Date.now() - 1 * 3600000 },
        { icon: 'person_add', title: 'swetha started following you', desc: 'They will see your recipes on their feed.', href: 'people.html', time: '3h ago', ts: Date.now() - 3 * 3600000 },
        { icon: 'warning', title: 'Low stock alert', desc: 'A few pantry staples are getting low.', href: 'my-kitchen-inventory.html', time: '6h ago', ts: Date.now() - 6 * 3600000 },
        { icon: 'shopping_basket', title: 'Shopping list ready', desc: '2 items were added from your planned meals.', href: 'shopping-list.html', time: '1d ago', ts: Date.now() - 24 * 3600000 }
      ];
    }
    return [
      { icon: 'waving_hand', title: 'Welcome, ' + name + '!', desc: 'Explore the feed and follow fellow cooks.', href: 'index.html', time: 'Just now', ts: Date.now() },
      { icon: 'person_add', title: 'sugu started following you', desc: 'They will see your recipes on their feed.', href: 'people.html', time: '2h ago', ts: Date.now() - 2 * 3600000 },
      { icon: 'warning', title: 'Low stock alert', desc: 'A few pantry staples are getting low.', href: 'my-kitchen-inventory.html', time: '5h ago', ts: Date.now() - 5 * 3600000 }
    ];
  }

  function getNotifications() {
    var n = getUserData(currentUserId(), 'notifications', null);
    if (!n) {
      n = seedNotifications(currentUserId());
      setUserData(currentUserId(), 'notifications', n);
    }
    return n;
  }
  function pushNotification(uid, n) {
    var arr = getUserData(uid, 'notifications', []);
    arr.unshift(n);
    setUserData(uid, 'notifications', arr);
  }
  function clearNotifications() { setUserData(currentUserId(), 'notifications', []); }

  /* ---------------- Follow system ---------------- */

  function isFollowing(id) {
    var u = currentUser();
    return !!(u && (u.following || []).indexOf(id) !== -1);
  }
  function followerCount(id) {
    var c = 0;
    getUsers().forEach(function (u) { if ((u.following || []).indexOf(id) !== -1) c++; });
    return c;
  }
  function toggleFollow(id) {
    var me = currentUser();
    if (!me || me.id === id) return null;
    var idx = (me.following || []).indexOf(id);
    if (idx !== -1) {
      me.following.splice(idx, 1);
      saveUsers();
      socialUnfollow(id);
      return false;
    }
    me.following.push(id);
    saveUsers();
    socialFollow(id);
    var them = getUserById(id);
    if (them && them.id !== me.id) {
      pushNotification(them.id, { icon: 'person_add', title: me.name + ' started following you', desc: 'They will see your recipes on their feed.', href: 'people.html', time: 'Just now', ts: Date.now() });
      evaluateAchievements(them.id, { silent: true });
    }
    return true;
  }

