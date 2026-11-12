/* KitchenShare - recipe_editor_feed | module 16/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Shared recipe editor (create + edit) ---------------- */

  function mrRowHTML() {
    var unitOpts = UNITS.map(function (u) { return '<option value="' + u + '">' + u + '</option>'; }).join('');
    return '<div class="ks-mr-row flex items-center gap-2">' +
      '<input class="ks-mr-name flex-1 min-w-0 h-10 px-3 rounded-lg bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface" list="ks-ingredient-datalist" autocomplete="off" placeholder="' + window.t('lbl_ingredient_name') + '"/>' +
      '<input class="ks-mr-qty w-16 h-10 px-2 rounded-lg bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary text-right font-body-md text-body-md text-on-surface" type="number" min="0" step="any" placeholder="' + window.t('lbl_qty') + '"/>' +
      '<select class="ks-mr-unit h-10 rounded-lg bg-surface-container-low border border-surface-variant font-body-md text-body-md text-on-surface">' + unitOpts + '</select>' +
      '<button type="button" class="ks-mr-remove text-outline hover:text-error transition-colors p-1" aria-label="' + window.t('lbl_remove_ingredient') + '"><span class="material-symbols-outlined text-[18px]">close</span></button>' +
      '</div>';
  }

  function refreshFeed() {
    if (feedGrid && window.__ksRenderUser) {
      window.__ksRenderUser();
      if (window.__ksRebuildPills) window.__ksRebuildPills();
    }
  }

  function openRecipeEditor(existing, ownerId, isCatalog) {
    var isEdit = !!existing;
    var ksInputCls2 = 'w-full h-touch-target-min px-4 rounded-xl bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface';
    var host = document.createElement('div');
    host.className = 'fixed inset-0 z-[75]';
    var stepsNote = (isEdit && existing.steps && existing.steps.length) ? (existing.steps[0].text || '') : '';
    var rowHTML = '';
    if (isEdit && existing.ingredients) {
      existing.ingredients.forEach(function (ing) {
        var unitOpts = UNITS.map(function (u) { return '<option value="' + u + '"' + (String(ing.unit) === u ? ' selected' : '') + '>' + u + '</option>'; }).join('');
        rowHTML += '<div class="ks-mr-row flex items-center gap-2">' +
          '<input class="ks-mr-name flex-1 min-w-0 h-10 px-3 rounded-lg bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface" list="ks-ingredient-datalist" autocomplete="off" value="' + esc(ing.name) + '"/>' +
          '<input class="ks-mr-qty w-16 h-10 px-2 rounded-lg bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary text-right font-body-md text-body-md text-on-surface" type="number" min="0" step="any" value="' + esc(ing.qty) + '"/>' +
          '<select class="ks-mr-unit h-10 rounded-lg bg-surface-container-low border border-surface-variant font-body-md text-body-md text-on-surface">' + unitOpts + '</select>' +
          '<button type="button" class="ks-mr-remove text-outline hover:text-error transition-colors p-1" aria-label="Remove ingredient"><span class="material-symbols-outlined text-[18px]">close</span></button>' +
          '</div>';
      });
    } else {
      rowHTML = mrRowHTML();
    }
    host.innerHTML =
      '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
      '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
      '<div class="flex items-center justify-between mb-5">' +
      '<h2 class="font-headline-md text-headline-md text-on-surface">' + (isEdit ? window.t('lbl_edit_recipe') : window.t('lbl_new_recipe')) + '</h2>' +
      '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close aria-label="' + window.t('lbl_close') + '"><span class="material-symbols-outlined">close</span></button>' +
      '</div>' +
      '<label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_recipe_name') + '</label>' +
      '<input id="ks-mr-name" class="' + ksInputCls2 + '" type="text" value="' + esc(isEdit ? existing.name : '') + '" placeholder="' + window.t('lbl_recipe_name_ph') + '"/>' +
      '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_category') + '</label>' +
      '<input id="ks-mr-cat" class="' + ksInputCls2 + '" type="text" list="ks-cat-datalist" value="' + esc(isEdit ? (existing.cat || '') : '') + '" placeholder="' + window.t('lbl_category_ph') + '"/>' +
      '<datalist id="ks-cat-datalist">' + ['italian', 'vegan', 'quick', 'breakfast', 'southindian', 'desserts'].map(function (c) { return '<option value="' + c + '"></option>'; }).join('') + '</datalist>' +
      '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_diet_tags') + '</label>' +
      '<div id="ks-diet-chips" class="flex flex-wrap gap-2"></div>' +
      '<div class="mt-4 grid grid-cols-2 gap-3">' +
      '<div><label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_servings') + '</label>' +
      '<input id="ks-mr-servings" class="' + ksInputCls2 + '" type="text" value="' + esc(isEdit ? existing.servings : '') + '" placeholder="' + window.t('lbl_servings_ph') + '"/></div>' +
      '<div><label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_prep_time') + '</label>' +
      '<input id="ks-mr-time" class="' + ksInputCls2 + '" type="text" value="' + esc(isEdit ? existing.time : '') + '" placeholder="' + window.t('lbl_time_ph') + '"/></div>' +
      '</div>' +
      '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_photos') + '</label>' +
      '<div id="ks-mr-photos" class="flex flex-wrap gap-2 mb-2 min-h-[5rem] p-2 rounded-xl border-2 border-dashed border-surface-variant/50 transition-colors"></div>' +
      '<button id="ks-mr-add-photo" type="button" class="flex items-center gap-1 h-10 px-4 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps hover:bg-surface-container-highest transition-colors"><span class="material-symbols-outlined text-[16px]">add_a_photo</span>' + window.t('lbl_add_photos') + '</button>' +
      '<input id="ks-mr-photo-file" type="file" accept="image/*" multiple capture="environment" class="hidden"/>' +
      '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_video') + '</label>' +
      '<p class="mb-2 font-body-sm text-body-sm text-on-surface-variant">' + window.t('lbl_video_hint') + '</p>' +
      '<div id="ks-mr-video-zone" class="mb-2 min-h-[5rem] p-2 rounded-xl border-2 border-dashed border-surface-variant/50 transition-colors"></div>' +
      '<button id="ks-mr-add-video" type="button" class="flex items-center gap-1 h-10 px-4 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps hover:bg-surface-container-highest transition-colors"><span class="material-symbols-outlined text-[16px]">videocam</span>' + window.t('lbl_add_video') + '</button>' +
      '<input id="ks-mr-video-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" class="hidden"/>' +
      '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_ingredients') + '</label>' +
      '<datalist id="ks-ingredient-datalist">' + getIngredientList().map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('') + '</datalist>' +
      '<p class="mb-2 font-body-md text-body-md text-on-surface-variant text-sm">' + window.t('lbl_ingredient_hint') + '</p>' +
      '<div id="ks-mr-ingredients" class="space-y-2">' + rowHTML + '</div>' +
      '<button id="ks-mr-add-ing" type="button" class="mt-2 flex items-center gap-1 font-headline-md text-body-md text-primary hover:opacity-80 transition-opacity"><span class="material-symbols-outlined text-[18px]">add</span>' + window.t('lbl_add_ingredient') + '</button>' +
      '<label class="block mt-4 mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_notes_method') + '</label>' +
      '<textarea id="ks-mr-notes" class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface" rows="2" placeholder="' + window.t('lbl_notes_ph') + '">' + esc(stepsNote) + '</textarea>' +
      '<button class="mt-6 w-full h-14 rounded-full bg-primary text-on-primary font-headline-md text-[18px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">' + (isEdit ? window.t('lbl_save_changes') : window.t('lbl_save_recipe')) + '</button>' +
      (isEdit && ((!isCatalog && ownerId === currentUserId()) || isAdminUser()) ? '<button id="ks-mr-delete" class="mt-3 w-full h-12 rounded-full bg-error-container text-on-error-container font-headline-md text-[15px] flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[18px]">delete</span>' + window.t('lbl_delete_recipe') + '</button>' : '') +
      '</div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';
      if (window.ksDietChipsInit) window.ksDietChipsInit(host, isEdit ? existing : null);
      function closeSheet() { host.remove(); document.body.style.overflow = ''; }
    host.querySelector('[data-ks-close]').addEventListener('click', closeSheet);
    host.querySelector('.absolute.inset-0').addEventListener('click', closeSheet);
    var ingBox = host.querySelector('#ks-mr-ingredients');
    function bindRowRemove(row) {
      var btn = row.querySelector('.ks-mr-remove');
      if (btn) btn.addEventListener('click', function () { row.remove(); });
    }
    ingBox.querySelectorAll('.ks-mr-row').forEach(bindRowRemove);
    host.querySelector('#ks-mr-add-ing').addEventListener('click', function () {
      var row = document.createElement('div');
      row.innerHTML = mrRowHTML();
      bindRowRemove(row.firstElementChild);
      ingBox.appendChild(row.firstElementChild);
    });
    var photosData = (isEdit && existing) ? photoList(existing) : [];
    var photoBox = host.querySelector('#ks-mr-photos');
    var photoAdd = host.querySelector('#ks-mr-add-photo');
    var photoFile = host.querySelector('#ks-mr-photo-file');
    function renderPhotoThumbs() {
      photoBox.innerHTML = photosData.map(function (src, i) {
        return '<div class="relative w-20 h-20 rounded-xl overflow-hidden border border-surface-variant shrink-0">' +
          '<img alt="" class="w-full h-full object-cover" src="' + esc(src) + '"/>' +
          '<button type="button" class="absolute top-0.5 right-0.5 bg-black/55 text-white rounded-full w-6 h-6 flex items-center justify-center active:scale-95 transition-transform" data-photo-remove="' + i + '" aria-label="' + window.t('lbl_remove_photo') + '"><span class="material-symbols-outlined text-[14px]">close</span></button>' +
          '</div>';
      }).join('');
      photoBox.querySelectorAll('[data-photo-remove]').forEach(function (b) {
        b.addEventListener('click', function () {
          photosData.splice(parseInt(b.getAttribute('data-photo-remove'), 10), 1);
          renderPhotoThumbs();
        });
      });
    }
    if (photoAdd) photoAdd.addEventListener('click', function () { if (photoFile) photoFile.click(); });
    if (photoFile) photoFile.addEventListener('change', function () {
      var files = Array.prototype.slice.call(photoFile.files || []);
      if (!files.length) return;
      photoAdd.disabled = true;
      var pending = files.length;
      files.forEach(function (f) {
        if (!f || f.type.indexOf('image/') !== 0) { pending--; if (!pending) { photoAdd.disabled = false; } return; }
        ksUploadImage(f).then(function (rec) {
          var src = (rec && rec.url) ? rec.url : (rec && rec.dataUrl) ? rec.dataUrl : '';
          if (src) photosData.push(src);
          renderPhotoThumbs();
        }).catch(function () {}).then(function () {
          pending--;
          if (!pending) { photoAdd.disabled = false; }
        });
      });
      photoFile.value = '';
    });
    renderPhotoThumbs();
    /* --- Video upload zone --- */
    var videoData = (isEdit && existing) ? videoOf(existing) : '';
    var videoThumbData = (isEdit && existing) ? videoThumbOf(existing) : '';
    var videoZone = host.querySelector('#ks-mr-video-zone');
    var videoAdd = host.querySelector('#ks-mr-add-video');
    var videoFile = host.querySelector('#ks-mr-video-file');
    var videoUploading = false;
    function renderVideoZone() {
      if (!videoZone) return;
      if (videoData) {
        videoZone.innerHTML =
          '<div class="relative rounded-xl overflow-hidden border border-surface-variant bg-black">' +
          '<video class="w-full max-h-48 object-contain" src="' + esc(videoData) + '" controls preload="metadata"></video>' +
          '<button type="button" class="absolute top-2 right-2 bg-black/55 text-white rounded-full w-7 h-7 flex items-center justify-center active:scale-95 transition-transform" data-video-remove aria-label="' + window.t('lbl_remove_video') + '"><span class="material-symbols-outlined text-[16px]">close</span></button>' +
          '</div>';
        var rmBtn = videoZone.querySelector('[data-video-remove]');
        if (rmBtn) rmBtn.addEventListener('click', function () {
          ksDeleteVideo(videoData);
          videoData = '';
          videoThumbData = '';
          renderVideoZone();
        });
      } else {
        videoZone.innerHTML = '<p class="text-sm text-on-surface-variant text-center py-2">' + window.t('lbl_no_video') + '</p>';
      }
    }
    renderVideoZone();
    if (videoAdd) videoAdd.addEventListener('click', function () { if (videoFile) videoFile.click(); });
    if (videoFile) videoFile.addEventListener('change', function () {
      var f = videoFile.files && videoFile.files[0];
      if (!f) return;
      // Client-side 1-minute duration check
      if (f.type.indexOf('video/') !== 0) { ksToast(window.t('toast_video_type')); videoFile.value = ''; return; }
      if (f.size > 50 * 1024 * 1024) { ksToast(window.t('toast_video_size')); videoFile.value = ''; return; }
      var tempUrl = URL.createObjectURL(f);
      var tempVid = document.createElement('video');
      tempVid.preload = 'metadata';
      tempVid.onloadedmetadata = function () {
        URL.revokeObjectURL(tempUrl);
        if (tempVid.duration > 60) {
          ksToast(window.t('toast_video_duration'));
          videoFile.value = '';
          return;
        }
        videoAdd.disabled = true;
        videoUploading = true;
        ksToast(window.t('toast_video_uploading'));
        ksUploadVideo(f).then(function (rec) {
          var src = (rec && rec.url) ? rec.url : (rec && rec.objectURL) ? rec.objectURL : '';
          if (src) videoData = src;
          var th = (rec && rec.thumb) ? rec.thumb : '';
          if (th) videoThumbData = th;
          renderVideoZone();
        }).catch(function (e) {
          ksToast(window.t('toast_video_error') + (e.message || ''));
        }).then(function () {
          videoAdd.disabled = false;
          videoUploading = false;
        });
        videoFile.value = '';
      };
      tempVid.onerror = function () {
        URL.revokeObjectURL(tempUrl);
        ksToast(window.t('toast_video_error'));
        videoFile.value = '';
      };
      tempVid.src = tempUrl;
    });
    /* --- Drag-and-drop on photo zone --- */
    if (photoBox) {
      photoBox.addEventListener('dragover', function (e) { e.preventDefault(); e.stopPropagation(); photoBox.classList.add('border-primary', 'bg-primary-container/10'); });
      photoBox.addEventListener('dragleave', function (e) { e.preventDefault(); photoBox.classList.remove('border-primary', 'bg-primary-container/10'); });
      photoBox.addEventListener('drop', function (e) {
        e.preventDefault(); e.stopPropagation();
        photoBox.classList.remove('border-primary', 'bg-primary-container/10');
        var dtFiles = e.dataTransfer && e.dataTransfer.files;
        if (!dtFiles || !dtFiles.length) return;
        var dropFiles = Array.prototype.slice.call(dtFiles);
        var dropPending = dropFiles.length;
        dropFiles.forEach(function (f) {
          if (!f || f.type.indexOf('image/') !== 0) { dropPending--; if (!dropPending) renderPhotoThumbs(); return; }
          ksUploadImage(f).then(function (rec) {
            var src = (rec && rec.url) ? rec.url : (rec && rec.dataUrl) ? rec.dataUrl : '';
            if (src) photosData.push(src);
          }).catch(function () {}).then(function () { dropPending--; if (!dropPending) renderPhotoThumbs(); });
        });
      });
    }
    if (isEdit) {
      var delBtn = host.querySelector('#ks-mr-delete');
      if (delBtn) delBtn.addEventListener('click', function () {
        var rid = existing.id;
        var photosToDelete = photoList(existing).slice();
        if (existing.img && photosToDelete.indexOf(existing.img) === -1) photosToDelete.push(existing.img);
        if (isCatalog) {
          if (hiddenRecipes.indexOf(rid) === -1) hiddenRecipes.push(rid);
          lsSet(DB_KEYS.hidden, hiddenRecipes);
          delete catalogEdits[rid];
          lsSet(DB_KEYS.catalogEdits, catalogEdits);
          try { delete RECIPES[rid]; } catch (e) {}
        } else {
          var owner = ownerId || currentUserId();
          var arr = getUserData(owner, 'myrecipes', []);
          setUserData(owner, 'myrecipes', arr.filter(function (r) { return r.id !== rid; }));
          if (owner === currentUserId()) { myRecipes = null; }
          try { delete RECIPES[rid]; } catch (e) {}
          syncDeleteRecipe(rid);
        }
        ksDeleteImages(photosToDelete);
        if (existing.video) ksDeleteVideo(existing.video);
        closeSheet();
        ksToast(window.t('toast_recipe_deleted'));
        refreshFeed();
      });
    }
    host.querySelector('button.w-full.h-14').addEventListener('click', function () {
      var n = document.getElementById('ks-mr-name').value.trim();
      if (!n) { ksToast(window.t('toast_recipe_name')); return; }
      var ingredients = [];
      ingBox.querySelectorAll('.ks-mr-row').forEach(function (row) {
        var nameInput = row.querySelector('.ks-mr-name');
        var qtyInput = row.querySelector('.ks-mr-qty');
        var unitSel = row.querySelector('.ks-mr-unit');
        var ingName = nameInput ? nameInput.value.trim() : '';
        if (!ingName) return;
        var q = parseFloat(qtyInput ? qtyInput.value : '');
        ingredients.push({ name: ingName, qty: isNaN(q) || q < 0 ? 1 : q, unit: unitSel ? unitSel.value : 'pcs' });
      });
      if (!ingredients.length) { ksToast(window.t('toast_recipe_ingredient')); return; }
      ingredients.forEach(function (ing) { addIngredientItem(ing.name); });
      var notes = document.getElementById('ks-mr-notes').value.trim();
      if (isEdit) {
        existing.name = n;
        existing.cat = document.getElementById('ks-mr-cat').value.trim().toLowerCase() || existing.cat || 'myrecipes';
        existing.servings = document.getElementById('ks-mr-servings').value.trim() || existing.servings || '1 serving';
        existing.time = document.getElementById('ks-mr-time').value.trim() || existing.time || 'Just now';
        existing.ingredients = ingredients;
        existing.photos = photosData;
        existing.img = photosData[0] || '';
        existing.video = videoData;
        existing.videoThumb = videoThumbData;
        existing.steps = notes ? [{ title: 'Notes', text: notes }] : [{ title: 'Method', text: 'Your saved recipe. Tap Cook This to track ingredients against your inventory.' }];
        if (window.ksDietCollect) existing.diet = window.ksDietCollect(host);
        dsStamp(existing);
        if (isCatalog) {
          catalogEdits[existing.id] = existing;
          lsSet(DB_KEYS.catalogEdits, catalogEdits);
          RECIPES[existing.id] = existing;
        } else {
          var owner = ownerId || currentUserId();
          var arr = getUserData(owner, 'myrecipes', []);
          var replaced = false;
          arr = arr.map(function (r) { if (r.id === existing.id) { replaced = true; return existing; } return r; });
          if (!replaced) arr.unshift(existing);
          setUserData(owner, 'myrecipes', arr);
          if (owner === currentUserId()) myRecipes = arr;
          RECIPES[existing.id] = existing;
          syncPushRecipe(existing);
        }
        closeSheet();
        ksToast(window.t('toast_recipe_updated'));
        refreshFeed();
      } else {
        var rid = 'my-' + Date.now().toString(36);
        var catInput = document.getElementById('ks-mr-cat');
        var catVal = catInput ? catInput.value.trim().toLowerCase() : '';
        var recipe = {
          id: rid,
          name: n,
          servings: document.getElementById('ks-mr-servings').value.trim() || '1 serving',
          time: document.getElementById('ks-mr-time').value.trim() || 'Just now',
          kcal: '',
          tag: 'My Recipe',
          cat: catVal || 'myrecipes',
          icon: 'restaurant_menu',
          gradient: 'from-primary-fixed to-secondary-fixed',
          photos: photosData,
          img: photosData[0] || '',
          video: videoData,
          videoThumb: videoThumbData,
          ingredients: ingredients,
          steps: notes ? [{ title: 'Notes', text: notes }] : [{ title: 'Method', text: 'Your saved recipe. Tap Cook This to track ingredients against your inventory.' }],
          diet: window.ksDietCollect ? window.ksDietCollect(host) : []
        };
        dsStamp(recipe);
        ensureMyRecipes();
        myRecipes.unshift(recipe);
        saveMyRecipes();
        RECIPES[rid] = recipe;
        syncPushRecipe(recipe);
        evaluateAchievements();
        closeSheet();
        ksToast(window.t('toast_recipe_saved'));
        refreshFeed();
      }
    });
  }

