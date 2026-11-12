/* KitchenShare - comments_content | module 10/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Shared ingredient item list (autocomplete) ---------------- */

  function seedIngredientList() {
    var set = {};
    function collect(recipe) {
      if (!recipe || !recipe.ingredients) return;
      recipe.ingredients.forEach(function (ing) {
        var n = String(ing && ing.name || '').trim();
        if (n) set[n.toLowerCase()] = n;
      });
    }
    Object.keys(RECIPES).forEach(function (rid) { collect(RECIPES[rid]); });
    Object.keys(listAllUserRecipes()).forEach(function (rid) { collect(listAllUserRecipes()[rid].recipe); });
    var names = Object.keys(set).sort().map(function (k) { return set[k]; });
    lsSet(DB_KEYS.ingredients, names);
    return names;
  }
  function getIngredientList() {
    var arr = lsGet(DB_KEYS.ingredients, null);
    if (!arr || !arr.length) arr = seedIngredientList();
    return arr;
  }
  function addIngredientItem(name) {
    var n = String(name || '').trim();
    if (!n) return false;
    var arr = getIngredientList();
    var lower = n.toLowerCase();
    var exists = false;
    arr.forEach(function (x) { if (String(x).toLowerCase() === lower) exists = true; });
    if (exists) return false;
    arr.push(n);
    arr.sort(function (a, b) { return String(a).toLowerCase() < String(b).toLowerCase() ? -1 : 1; });
    lsSet(DB_KEYS.ingredients, arr);
    return true;
  }

  function findRecipeOwner(rid) {
    if (!rid) return null;
    return listAllUserRecipes()[rid] || null;
  }
  function listAllPosts() {
    var out = [];
    getUsers().forEach(function (u) {
      if (u.status !== 'active') return;
      var arr = getUserData(u.id, 'posts', []);
      arr.forEach(function (p) { out.push({ post: p, author: u }); });
    });
    return out;
  }
  function removeRecipe(rid) {
    var found = findRecipeOwner(rid);
    if (found) {
      var arr = getUserData(found.userId, 'myrecipes', []);
      setUserData(found.userId, 'myrecipes', arr.filter(function (r) { return r.id !== rid; }));
      if (found.userId === currentUserId()) myRecipes = null;
      return true;
    }
    if (RECIPES[rid] && hiddenRecipes.indexOf(rid) === -1) {
      hiddenRecipes.push(rid);
      lsSet(DB_KEYS.hidden, hiddenRecipes);
      return true;
    }
    return false;
  }
  function removePost(pid) {
    var hit = null;
    getUsers().forEach(function (u) {
      var arr = getUserData(u.id, 'posts', []);
      arr.forEach(function (p) { if (p.id === pid) hit = { userId: u.id }; });
    });
    if (!hit) return false;
    var arr = getUserData(hit.userId, 'posts', []);
    setUserData(hit.userId, 'posts', arr.filter(function (p) { return p.id !== pid; }));
    if (hit.userId === currentUserId()) posts = null;
    dsQueueDelete('posts', pid);
    savePosts();
    syncDeletePost(pid);
    return true;
  }

