/* KitchenShare - recipe_details | module 18/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Recipe Details page ---------------- */

  var cookBtn = document.getElementById('cook-this-btn');
  if (cookBtn) {
    var recipeId = (function () {
      var m = window.location.search.match(/[?&]recipe=([^&]+)/);
      if (m && m[1]) return decodeURIComponent(m[1]);
      return cookBtn.getAttribute('data-recipe') || 'rustic-basil-pomodoro';
    })();
    cookBtn.setAttribute('data-recipe', recipeId);

    function classifyIngredients() {
      var recipe = getRecipe(recipeId);
      var result = { ok: [], low: [], missing: [], status: {} };
      if (!recipe) return result;
      recipe.ingredients.forEach(function (ing, idx) {
        var target = matchIngredient(ing.name, ing.unit);
        if (!target) { result.missing.push(ing); result.status[idx] = 'missing'; return; }
        var remaining = toBase(target.qty, target.unit) - toBase(ing.qty, ing.unit);
        if (remaining < 0) { result.low.push({ name: target.name, qty: ing.qty, unit: ing.unit }); result.status[idx] = 'low'; }
        else { result.ok.push(ing); result.status[idx] = 'ok'; }
      });
      return result;
    }

    function renderRecipeView() {
      var recipe = getRecipe(recipeId);
      if (!recipe) return;
      var titleEl = document.getElementById('rd-title');
      if (titleEl) titleEl.textContent = recipe.name;
      var tagEl = document.getElementById('rd-tag');
      if (tagEl) tagEl.textContent = recipe.tag || 'Recipe';
      var timeEl = document.getElementById('rd-time');
      if (timeEl) timeEl.textContent = recipe.time || '';
      var kcalEl = document.getElementById('rd-kcal');
      if (kcalEl) kcalEl.textContent = recipe.kcal || '';
      var servEl = document.getElementById('rd-servings');
      if (servEl) servEl.textContent = recipe.servings || '';
      var imgEl = document.getElementById('rd-hero-img');
      var phEl = document.getElementById('rd-hero-ph');
      var iconEl = document.getElementById('rd-hero-icon');
      var phWrap = document.getElementById('rd-hero-photos');
      var dots = document.getElementById('rd-hero-dots');
      stopPhotoRotate();
      var phs = photoList(recipe);
      if (phs.length === 1) {
        imgEl.src = phs[0];
        imgEl.classList.remove('hidden');
        if (phEl) phEl.classList.add('hidden');
        if (phWrap) { phWrap.classList.add('hidden'); phWrap.innerHTML = ''; }
        if (dots) { dots.classList.add('hidden'); dots.innerHTML = ''; }
      } else if (phs.length > 1) {
        if (imgEl) imgEl.classList.add('hidden');
        if (phEl) phEl.classList.add('hidden');
        phWrap.innerHTML = phs.map(function (src) {
          return '<img alt="' + esc(recipe.name) + '" class="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-700" src="' + esc(src) + '"/>';
        }).join('');
        phWrap.classList.remove('hidden');
        dots.innerHTML = phs.map(function () {
          return '<button type="button" class="w-2 h-2 rounded-full bg-white/40 hover:bg-white/70 transition-colors" aria-label="' + window.t('lbl_photo_dot') + '"></button>';
        }).join('');
        dots.classList.remove('hidden');
        startPhotoRotate(phs, phWrap, dots);
        phWrap.onclick = function () {
          if (!photoTimer) return;
          photoIdx = (photoIdx + 1) % phs.length;
          setPhotoShown(phWrap, dots, photoIdx);
        };
      } else if (phEl) {
        if (imgEl) imgEl.classList.add('hidden');
        if (phWrap) { phWrap.classList.add('hidden'); phWrap.innerHTML = ''; }
        if (dots) { dots.classList.add('hidden'); dots.innerHTML = ''; }
        phEl.classList.remove('hidden');
        phEl.className = 'absolute inset-0 w-full h-full bg-gradient-to-br ' + (recipe.gradient || 'from-[#dcefd8] to-[#a8d3a0]') + ' flex items-center justify-center';
        if (iconEl) iconEl.textContent = recipe.icon || 'restaurant';
      }
      var ingServ = document.getElementById('rd-ing-servings');
      if (ingServ && recipe.servings) ingServ.textContent = recipe.servings;
      var stepsEl = document.getElementById('rd-steps');
      if (stepsEl && recipe.steps) {
        stepsEl.innerHTML = recipe.steps.map(function (step, i) {
          return '<div class="relative flex gap-container-margin">' +
            '<div class="flex-shrink-0 w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center font-headline-md text-headline-md text-primary z-10 border-4 border-background">' + (i + 1) + '</div>' +
            '<div class="pt-1.5 pb-2">' +
            '<h4 class="font-headline-md text-[18px] leading-[24px] text-on-surface mb-2">' + esc(step.title) + '</h4>' +
            '<p class="font-body-md text-body-md text-on-surface-variant">' + esc(step.text) + '</p>' +
            '</div></div>';
        }).join('');
      }
      /* --- Video player --- */
      var vidSection = document.getElementById('rd-video');
      var vidPlayer = document.getElementById('rd-video-player');
      var vidUrl = videoOf(recipe);
      if (vidUrl && vidSection && vidPlayer) {
        vidPlayer.src = vidUrl;
        vidSection.classList.remove('hidden');
      } else if (vidSection) {
        vidSection.classList.add('hidden');
      }
      renderPlanRows();
      renderNutrition();
      renderComments();
      var editBtn = document.getElementById('rd-edit-btn');
      if (editBtn) {
        var found = findRecipeOwner(recipeId);
        var isCatalog = !found && (!!RECIPES[recipeId] || !!catalogEdits[recipeId]);
        var canEdit = (found && (found.userId === currentUserId() || isAdminUser())) || (isAdminUser() && isCatalog);
        if (canEdit) {
          editBtn.setAttribute('data-recipe', recipeId);
          editBtn.classList.remove('hidden');
        } else {
          editBtn.classList.add('hidden');
        }
      }
    }

    function renderNutrition() {
      if (!window.ksNutrition) return;
      var recipe = getRecipe(recipeId);
      var body = document.getElementById('rd-nutrition-body');
      var servTxt = document.getElementById('rd-nutrition-servings');
      var note = document.getElementById('rd-nutrition-note');
      if (!recipe || !recipe.ingredients || !recipe.ingredients.length) {
        if (body) body.innerHTML = '<p class="col-span-4 font-body-md text-body-md text-on-surface-variant">' + window.t('lbl_no_nutrition') + '</p>';
        if (servTxt) servTxt.textContent = '';
        if (note) note.textContent = '';
        return;
      }
      var c = window.ksNutrition.compute(recipe);
      if (!c || !c.covered) {
        if (body) body.innerHTML = '<p class="col-span-4 font-body-md text-body-md text-on-surface-variant">' + window.t('lbl_no_estimate') + '</p>';
        if (servTxt) servTxt.textContent = '';
        if (note) note.textContent = '';
        return;
      }
      var k = document.getElementById('rd-n-kcal');
      var p = document.getElementById('rd-n-protein');
      var f = document.getElementById('rd-n-fat');
      var fb = document.getElementById('rd-n-fiber');
      if (k) k.textContent = window.ksNutrition.pretty(c.kcal);
      if (p) p.textContent = window.ksNutrition.pretty(c.protein) + 'g';
      if (f) f.textContent = window.ksNutrition.pretty(c.fat) + 'g';
      if (fb) fb.textContent = window.ksNutrition.pretty(c.fiber) + 'g';
      if (servTxt) servTxt.textContent = window.t('per_serving', { servings: recipe.servings || 'serving' });
      if (note) note.textContent = window.t('nutrition_note', { matched: c.matched, total: c.total, pct: Math.round(c.covered * 100) || 0 });
    }

    function renderIngredientList() {
      var ul = document.getElementById('recipe-ingredients');
      if (!ul) return;
      var recipe = getRecipe(recipeId);
      if (!recipe || !recipe.ingredients) { ul.innerHTML = ''; return; }
      var c = classifyIngredients();
      var html = '';
      recipe.ingredients.forEach(function (ing, idx) {
        var st = c.status[idx] || 'ok';
        var qtyTxt = roundNum(ing.qty) + ' ' + (ing.unit || '');
        var iconBox, badge = '', rowCls = 'shadow-[inset_0_2px_4px_rgba(90,113,89,0.05)] bg-surface-container-low/50';
        if (st === 'ok') {
          iconBox = '<div class="w-6 h-6 rounded flex items-center justify-center bg-primary-container text-on-primary-container"><span class="material-symbols-outlined text-[16px]">check</span></div>';
        } else if (st === 'low') {
          iconBox = '<div class="w-6 h-6 rounded border-2 border-error/50 flex items-center justify-center"><span class="material-symbols-outlined text-[16px] text-error/50">close</span></div>';
          badge = '<span class="inline-flex px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-caps text-label-caps text-[10px]">' + window.t('lbl_low') + '</span>';
          rowCls = '';
        } else {
          iconBox = '<div class="w-6 h-6 rounded border-2 border-outline flex items-center justify-center"><span class="material-symbols-outlined text-[16px] text-outline">close</span></div>';
          badge = '<span class="inline-flex px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps text-[10px]">' + window.t('lbl_missing') + '</span>';
          rowCls = '';
        }
        html += '<li class="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low transition-colors group cursor-default ' + rowCls + '">' +
          '<div class="flex items-center gap-3">' + iconBox + '<span class="font-body-md text-body-md text-on-surface">' + esc(ing.name) + '</span></div>' +
          '<div class="flex items-center gap-2">' + badge + '<span class="font-body-md text-body-md text-on-surface-variant font-medium">' + qtyTxt + '</span></div>' +
          '</li>';
      });
      ul.innerHTML = html;
    }

    function renderPlanRows() {
      var rows = document.getElementById('plan-rows');
      if (!rows) return;
      var recipe = getRecipe(recipeId);
      if (!recipe || !recipe.ingredients) { rows.innerHTML = ''; return; }
      var html = '';
      recipe.ingredients.forEach(function (ing, idx) {
        html += '<div class="flex items-center gap-2 py-1.5">' +
          '<span class="flex-1 font-body-md text-body-md text-on-surface truncate">' + esc(ing.name) + '</span>' +
          '<input id="plan-qty-' + idx + '" class="w-20 h-10 px-2 rounded-lg bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary text-right font-body-md text-body-md text-on-surface" type="number" min="0" step="any" value="' + ing.qty + '" aria-label="' + window.t('lbl_qty_for', { name: ing.name }) + '"/>' +
          '<span class="w-12 font-label-caps text-label-caps text-on-surface-variant">' + esc(ing.unit) + '</span>' +
          '</div>';
      });
      rows.innerHTML = html;
    }

    function refreshRecipeStatus() {
      renderIngredientList();
      var title = document.getElementById('cook-status-title');
      var desc = document.getElementById('cook-status-desc');
      var bar = document.getElementById('cook-status');
      if (!title || !desc || !bar) return;
      var c = classifyIngredients();
      if (c.missing.length === 0 && c.low.length === 0) { bar.classList.add('hidden'); return; }
      bar.classList.remove('hidden');
      var lowNames = c.low.map(function (x) { return x.name; }).join(', ');
      var missNames = c.missing.map(function (x) { return x.name; }).join(', ');
      if (c.missing.length > 0) {
        title.textContent = window.t('missing_status', { n: c.missing.length });
        var extra = c.low.length ? window.t('missing_extra_and', { names: lowNames }) : '';
        desc.textContent = window.t('missing_desc', { miss: missNames, extra: extra });
      } else {
        title.textContent = window.t('low_status', { n: c.low.length });
        desc.textContent = window.t('low_desc', { names: lowNames });
      }
    }

    function openCookSheet() {
      var c = classifyIngredients();
      var recipe = getRecipe(recipeId) || { name: 'Rustic Basil Pomodoro' };
      var host = document.getElementById('ks-cook-sheet');
      if (host) host.remove();
      host = document.createElement('div');
      host.id = 'ks-cook-sheet';
      host.className = 'fixed inset-0 z-[75]';
      var warnHTML = '';
      if (c.missing.length || c.low.length) {
        var names = [];
        c.missing.forEach(function (x) { names.push(x.name + ' (missing)'); });
        c.low.forEach(function (x) { names.push(x.name + ' (low)'); });
        warnHTML = '<p class="flex items-center gap-2 font-body-md text-body-md text-error bg-error-container/30 border border-error/20 rounded-lg p-3 mb-6"><span class="material-symbols-outlined text-[18px]">error_outline</span>' +
          esc(names.join(', ')) + ' — add to your shopping list first.</p>';
      }
      var totalDeduct = (recipe.ingredients || []).length;
      host.innerHTML =
        '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
        '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
        '<div class="flex items-center justify-between mb-5">' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">Start Cooking?</h2>' +
        '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close aria-label="' + window.t('lbl_close') + '"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<p class="font-body-md text-body-md text-on-surface-variant mb-2">' + window.t('cook_deduct_note', { name: recipe.name, count: totalDeduct }) + '</p>' +
        warnHTML +
        (c.missing.length || c.low.length ?
          '<button id="cook-add-missing" class="w-full h-14 rounded-full bg-secondary-container text-on-surface font-headline-md text-[16px] flex items-center justify-center hover:bg-secondary-fixed active:scale-95 transition-all mb-3">' + window.t('lbl_add_missing_shopping') + '</button>' : '') +
        '<button id="cook-now" class="w-full h-14 rounded-full bg-primary text-on-primary font-headline-md text-[18px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined">skillet</span>' + window.t('lbl_cook_now') + '</button>' +
        '</div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';

      function closeSheet() { host.remove(); document.body.style.overflow = ''; }
      host.querySelector('[data-ks-close]').addEventListener('click', closeSheet);
      host.querySelector('.absolute.inset-0').addEventListener('click', closeSheet);
      var addMissing = host.querySelector('#cook-add-missing');
      if (addMissing) addMissing.addEventListener('click', function () {
        var want = [];
        c.missing.forEach(function (x) { want.push({ name: x.name, qty: x.qty, unit: x.unit, group: recipe.name }); });
        c.low.forEach(function (x) { want.push({ name: x.name, qty: x.qty, unit: x.unit, group: recipe.name }); });
        var added = ksShopping.add(want);
        closeSheet();
        if (added.length) ksToast(window.t('added_to_shopping_list', { items: added.join(', ') }));
        setTimeout(function () { window.location.href = 'shopping-list.html'; }, 700);
      });
      host.querySelector('#cook-now').addEventListener('click', function () {
        var s = ksCook(recipeId);
        closeSheet();
        var msg = window.t('cook_deducted', { n: s.used.length });
        if (s.missing.length) msg += ' ' + window.t('toast_missing_added', { items: s.missing.map(function (x) { return x.name; }).join(', ') });
        else if (s.negative.length) msg += window.t('cook_low_suffix', { names: s.negative.map(function (x) { return x.name; }).join(', ') });
        ksToast(msg);
        setTimeout(function () { window.location.href = 'index.html'; }, 1100);
      });
    }

    var planBtn = document.getElementById('plan-add-all');
    if (planBtn) planBtn.addEventListener('click', function () {
      var recipe = getRecipe(recipeId);
      if (!recipe || !recipe.ingredients) return;
      var want = [];
      recipe.ingredients.forEach(function (ing, idx) {
        var input = document.getElementById('plan-qty-' + idx);
        var q = input ? parseFloat(input.value) : NaN;
        want.push({ name: ing.name, qty: (isNaN(q) || q < 0) ? ing.qty : q, unit: ing.unit, group: recipe.name });
      });
      var added = ksShopping.add(want);
      ksToast(added.length ? window.t('toast_plan_added', { count: added.length, name: recipe.name }) : window.t('toast_plan_already'));
    });

    function commentRowHTML(c) {
      var me = currentUser();
      var liked = !!(me && c.likes && c.likes.indexOf(me.id) !== -1);
      var likeCount = (c.likes || []).length;
      var canDel = !!(me && (isAdminUser() || me.id === c.userId));
      var delBtn = canDel
        ? '<button data-comment-del="' + esc(c.id) + '" class="shrink-0 text-on-surface-variant hover:text-error transition-colors p-1 rounded-full hover:bg-error-container/40" aria-label="' + window.t('lbl_delete_comment') + '"><span class="material-symbols-outlined text-[18px]">delete</span></button>'
        : '';
      return '<div class="flex gap-3 p-3 rounded-xl bg-surface-container-low/60" data-comment="' + esc(c.id) + '">' +
        '<a href="user-profile.html?uid=' + encodeURIComponent(c.userId || '') + '" class="shrink-0" aria-label="' + window.t('lbl_view_profile') + '">' + avatarHTML(c.userId, c.by, 'w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline-md text-[12px]') + '</a>' +
        '<div class="flex-1 min-w-0">' +
        '<div class="flex items-center gap-2"><a href="user-profile.html?uid=' + encodeURIComponent(c.userId || '') + '" class="font-body-md text-body-md text-on-surface font-semibold hover:underline">' + esc(c.by) + '</a><span class="font-label-caps text-label-caps text-on-surface-variant">' + esc(timeLabel(c)) + '</span>' + delBtn + '</div>' +
        '<p class="font-body-md text-body-md text-on-surface-variant mt-1 break-words">' + esc(c.text) + '</p>' +
        '<button data-comment-like="' + esc(c.id) + '" class="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full font-label-caps text-label-caps ' + (liked ? 'bg-error-container/40 text-error' : 'text-on-surface-variant hover:bg-surface-container-high') + ' transition-colors" aria-label="' + window.t('lbl_like_comment') + '">' +
        '<span class="material-symbols-outlined text-[16px]">' + (liked ? 'favorite' : 'favorite_border') + '</span><span data-comment-like-count="' + esc(c.id) + '">' + likeCount + '</span></button>' +
        '</div></div>';
    }

    function renderComments() {
      var list = document.getElementById('rd-comments-list');
      var count = document.getElementById('rd-comment-count');
      if (!list) return;
      var me = currentUser();
      var arr = getComments(recipeId) || [];
      if (count) count.textContent = String(arr.length);
      list.innerHTML = arr.map(commentRowHTML).join('') ||
        '<p class="font-body-md text-body-md text-on-surface-variant py-2 text-center">No comments yet. Be the first to share a tip!</p>';
      var loginBox = document.getElementById('rd-comment-login');
      var form = document.getElementById('rd-comment-form');
      if (loginBox) loginBox.classList.toggle('hidden', !!me);
      if (form) form.classList.toggle('hidden', !me);
    }

    var commentsList = document.getElementById('rd-comments-list');
    if (commentsList) commentsList.addEventListener('click', function (e) {
      var likeBtn = e.target.closest('[data-comment-like]');
      if (likeBtn) {
        if (!currentUser()) { ksToast(window.t('toast_like_login')); return; }
        toggleCommentLike(recipeId, likeBtn.getAttribute('data-comment-like'));
        renderComments();
        return;
      }
      var delBtn = e.target.closest('[data-comment-del]');
      if (delBtn) {
        if (removeComment(recipeId, delBtn.getAttribute('data-comment-del'))) {
          renderComments();
          ksToast(window.t('toast_comment_removed'));
        }
      }
    });

    var commentPost = document.getElementById('rd-comment-post');
    if (commentPost) commentPost.addEventListener('click', function () {
      if (!currentUser()) { ksToast(window.t('toast_comment_login')); return; }
      var input = document.getElementById('rd-comment-input');
      var t = input ? input.value.trim() : '';
      if (!t) { ksToast(window.t('toast_comment_write')); return; }
      addComment(recipeId, t);
      if (input) input.value = '';
      renderComments();
      ksToast(window.t('toast_comment_posted'));
    });

    cookBtn.addEventListener('click', openCookSheet);

    var shareBtn = document.getElementById('rd-share-btn');
    if (shareBtn) shareBtn.addEventListener('click', function () {
      var recipe = getRecipe(recipeId);
      var name = recipe ? recipe.name : 'Recipe';
      var shareUrl = window.location.origin + '/recipe-details.html?recipe=' + encodeURIComponent(recipeId);
      var shareText = 'Check out this recipe: ' + name + ' — ' + shareUrl;
      if (navigator.share) {
        navigator.share({ title: name + ' — KitchenShare', text: shareText, url: shareUrl }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).then(function () { ksToast(window.t('toast_recipe_link_copied')); }).catch(function () {
          ksToast(window.t('toast_share_failed'));
        });
      } else {
        ksToast(window.t('toast_share_failed'));
      }
    });

    var shareGroupBtn = document.getElementById('rd-share-group-btn');
    if (shareGroupBtn) shareGroupBtn.addEventListener('click', function () {
      if (window.ksShareRecipeToGroup) window.ksShareRecipeToGroup(recipeId);
      else ksToast('Please log in to share to a group');
    });

    renderRecipeView();
    refreshRecipeStatus();

    function refreshFromStorage() {
      inventory = null;
      refreshRecipeStatus();
    }
    window.addEventListener('pageshow', refreshFromStorage);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refreshFromStorage();
    });
  }

  window.ksToast = ksToast;

