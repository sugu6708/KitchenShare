/* KitchenShare - ds_coalesce | module 04/22 | classic script, loads in filename order */
"use strict";
  var dsPushTimers = {};
  var dsPushQueued = {};
  function dsCoalesce(kind, fn) {
    dsPushQueued[kind] = fn;
    if (dsPushTimers[kind]) return;
    fn();
    dsPushQueued[kind] = null;
    dsPushTimers[kind] = setTimeout(function () {
      dsPushTimers[kind] = null;
      var pending = dsPushQueued[kind];
      dsPushQueued[kind] = null;
      if (pending) pending();
    }, 600);
  }

  /* --- Multi-device conflict resolution (timestamp reconciliation) ---
   * Deletes made on one device must not resurrect when another device
   * pushes its full list. Every remove() records a tombstone id here; the
   * next save-all payload carries them so the server deletes those rows,
   * and per-item _ua stamps let the server keep the newest copy (LWW). */
  function _dsDelKey(kind) { return 'kitchenshare.ds.deleted.' + kind; }
  function dsQueueDelete(kind, id) {
    if (!id) return;
    var q = lsGet(_dsDelKey(kind), []);
    if (q.indexOf(id) === -1) { q.push(id); lsSet(_dsDelKey(kind), q); }
  }
  function dsTakeDeleted(kind) {
    var q = lsGet(_dsDelKey(kind), []);
    if (q.length) lsSet(_dsDelKey(kind), []);
    return q;
  }
  function dsStamp(item) {
    if (item && typeof item === 'object') item._ua = Date.now();
    return item;
  }

  function mergeLWW(local, remote) {
    var map = {};
    (local || []).forEach(function (it) {
      var key = (it.name || '').toLowerCase().trim();
      if (key) map[key] = it;
    });
    (remote || []).forEach(function (it) {
      var key = (it.name || '').toLowerCase().trim();
      if (!key) return;
      var existing = map[key];
      if (!existing) { map[key] = it; return; }
      var localUA = existing._ua || 0;
      var remoteUA = it._ua || 0;
      if (remoteUA >= localUA) map[key] = it;
    });
    var out = [];
    Object.keys(map).forEach(function (k) { out.push(map[k]); });
    return out;
  }

  function mergeBudgetLWW(local, remote) {
    var map = {};
    (local || []).forEach(function (e) {
      if (!e) return;
      var id = e.id || ('sp-' + (e.ts || Date.now()).toString(36) + '-' + Math.random().toString(36).slice(2, 7));
      e.id = id;
      if (!e._ua) e._ua = e.ts || 0;
      if (!map[id]) map[id] = e;
    });
    (remote || []).forEach(function (e) {
      if (!e || !e.id) return;
      var existing = map[e.id];
      if (!existing || (e._ua || 0) >= (existing._ua || 0)) map[e.id] = e;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }


  var DS = {
    _syncing: false,
    migrate: function () {
      if (lsGet('kitchenshare.ds.migrated', false)) return Promise.resolve();
      var uid = currentUserId();
      if (!uid) return Promise.resolve();
      var payload = {
        inventory: getUserData(uid, 'inventory', []),
        shopping: getUserData(uid, 'shopping', []),
        recipes: getUserData(uid, 'myrecipes', []),
        posts: getUserData(uid, 'posts', []),
        comments: lsGet(DB_KEYS.comments, {}),
        spending: typeof getSpendingLog === 'function' ? getSpendingLog() : [],
        profile: getUserData(uid, 'profile', {})
      };
      return serverApi('migrate', payload).then(function (r) {
        if (r && r.ok) {
          lsSet('kitchenshare.ds.migrated', true);
          ksToast('Data synced to server (' + JSON.stringify(r.counts) + ')');
        }
      });
    },
    kitchen: {
      load: function () {
        return serverApi('kitchen-list', {}).then(function (r) {
          if (r && r.items) {
            var mapped = r.items.map(function (it) {
              return { id: it.id, name: it.name, category: it.category, qty: it.qty, unit: it.unit, min: it.min_qty, expires_on: it.expires_on || '', _ua: it.updated_at || 0 };
            });
            var local = inventory || getUserData(currentUserId(), 'inventory', []);
            var merged = mergeLWW(local, mapped);
            inventory = merged;
            setUserData(currentUserId(), 'inventory', merged);
            return merged;
          }
          return null;
        }).catch(function () { return null; });
      },
      saveAll: function (items) {
        var payload = { items: items, deleted_ids: dsTakeDeleted('kitchen') };
        return serverApi('kitchen-save-all', payload).then(function (r) {
          return !!(r && r.ok);
        }).catch(function () { return false; });
      }
    },
    shopping: {
      load: function () {
        return serverApi('shop-list', {}).then(function (r) {
          if (r && r.items) {
            var mapped = r.items.map(function (it) {
              return { name: it.name, qty: it.qty, unit: it.unit, group: it.shop_group, done: !!it.done };
            });
            var local = shopping || getUserData(currentUserId(), 'shopping', []);
            var merged = mergeLWW(local, mapped);
            shopping = merged;
            setUserData(currentUserId(), 'shopping', merged);
            return merged;
          }
          return null;
        }).catch(function () { return null; });
      },
      saveAll: function (items) {
        var payload = { items: items, deleted_ids: dsTakeDeleted('shopping') };
        return serverApi('shop-save-all', payload).then(function (r) {
          return !!(r && r.ok);
        }).catch(function () { return false; });
      }
    },
    recipes: {
      load: function () {
        return serverApi('recipes-list', {}).then(function (r) {
          if (r && r.recipes) {
            myRecipes = r.recipes;
            setUserData(currentUserId(), 'myrecipes', r.recipes);
            r.recipes.forEach(function (rec) { RECIPES[rec.id] = rec; });
            return r.recipes;
          }
          return null;
        }).catch(function () { return null; });
      },
      saveAll: function (items) {
        var payload = { items: items, deleted_ids: dsTakeDeleted('recipes') };
        return serverApi('recipes-save-all', payload).then(function (r) {
          return !!(r && r.ok);
        }).catch(function () { return false; });
      }
    },
    posts: {
      load: function () {
        return serverApi('posts-list-user', {}).then(function (r) {
          if (r && r.posts) {
            posts = r.posts;
            setUserData(currentUserId(), 'posts', r.posts);
            return r.posts;
          }
          return null;
        }).catch(function () { return null; });
      },
      saveAll: function (items) {
        var payload = { items: items, deleted_ids: dsTakeDeleted('posts') };
        return serverApi('posts-save-all', payload).then(function (r) {
          return !!(r && r.ok);
        }).catch(function () { return false; });
      }
    },
    budget: {
      load: function () {
        return serverApi('budget-list', {}).then(function (r) {
          if (r && r.items) {
            var mapped = r.items.map(function (it) {
              return { id: it.id, amount: it.amount, category: it.category || 'Other', item: it.item || '', qty: it.qty || 0, unit: it.unit || '', date: it.date || (it.ts ? new Date(it.ts).toISOString() : ''), ts: it.ts || 0, _ua: it.updated_at || 0 };
            });
            if (typeof getSpendingLog === 'function' && typeof saveSpendingLog === 'function') {
              var merged = mergeBudgetLWW(getSpendingLog(), mapped);
              saveSpendingLog(merged);
              return merged;
            }
          }
          return null;
        }).catch(function () { return null; });
      },
      saveAll: function (items) {
        var payload = { items: items || [], deleted_ids: dsTakeDeleted('budget') };
        return serverApi('budget-save-all', payload).then(function (r) {
          return !!(r && r.ok);
        }).catch(function () { return false; });
      }
    },
    _withRollback: function (key, saveFn) {
      var uid = currentUserId();
      var old = getUserData(uid, key, null);
      try {
        saveFn();
      } catch (e) {
        if (old !== null) setUserData(uid, key, old);
        throw e;
      }
      return old;
    }
  };

