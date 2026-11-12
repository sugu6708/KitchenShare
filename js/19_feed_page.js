/* KitchenShare - feed_page | module 19/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Feed page (index.html) ---------------- */

  var feedGrid = document.getElementById('recipe-grid');
  if (feedGrid) {
    var ksInputCls = 'w-full h-touch-target-min px-4 rounded-xl bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface';

    function nutritionLine(r) {
      if (!window.ksNutrition) return '';
      var c = window.ksNutrition.compute(r);
      if (!c || !c.covered) return '';
      return '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">local_fire_department</span>' +
        window.ksNutrition.pretty(c.kcal) + window.t('nutrition_line', { protein: window.ksNutrition.pretty(c.protein), fat: window.ksNutrition.pretty(c.fat), fiber: window.ksNutrition.pretty(c.fiber) }) + '</span>';
    }

    function userRecipeCardHTML(r, opts) {
      opts = opts || {};
      var count = (r.ingredients || []).length;
      var editBtn = opts.editable
        ? '<button data-action="edit-recipe" data-recipe="' + esc(r.id || '') + '" class="shrink-0 text-on-surface-variant hover:text-primary transition-colors focus:outline-none p-1 rounded-full hover:bg-surface-container" aria-label="' + window.t('lbl_edit_recipe') + '"><span class="material-symbols-outlined">edit</span></button>'
        : '';
      var author = opts.author ? '<div class="flex items-center gap-1.5 font-label-caps text-label-caps text-on-surface-variant"><span class="material-symbols-outlined text-[14px]">person</span>' + (opts.author.id ? '<a href="user-profile.html?uid=' + encodeURIComponent(opts.author.id) + '" class="hover:underline">' + esc(opts.author.name) + '</a>' : esc(opts.author.name)) + '</div>' : '';
      var phs = photoList(r);
      var hasVid = !!videoOf(r);
      var vidBadge = hasVid ? '<span class="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white font-label-caps text-[10px]"><span class="material-symbols-outlined text-[14px]">videocam</span>' + window.t('lbl_video') + '</span>' : '';
      var media = phs.length
        ? '<img alt="' + esc(r.name) + '" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="' + esc(phs[0]) + '"/>'
        : '<span class="material-symbols-outlined text-[64px] text-on-surface/60">' + (r.icon || 'restaurant_menu') + '</span>';
      return '<article data-ks-user data-recipe="' + esc(r.id || '') + '" data-category="' + esc(r.cat || '') + '" class="group relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(90,113,89,0.05)] cursor-pointer">' +
        '<div class="relative w-full aspect-[4/3] md:aspect-[3/2] bg-gradient-to-br ' + (r.gradient || 'from-primary-fixed to-secondary-fixed') + ' flex items-center justify-center">' + vidBadge + media + '</div>' +
        '<div class="p-4 flex flex-col gap-2">' +
        '<div class="flex items-start justify-between gap-2">' +
        '<h2 class="font-headline-md text-[20px] leading-[28px] font-semibold text-on-surface">' + esc(r.name) + '</h2>' +
        editBtn +
        '</div>' +
        (author || '') +
        '<div class="flex flex-wrap items-center gap-3 font-body-md text-[14px] text-on-surface-variant">' +
        '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">schedule</span>' + esc(r.time || '') + '</span>' +
        (r.servings ? '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">restaurant</span>' + esc(r.servings) + '</span>' : '') +
        '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">shopping_basket</span>' + window.t('count_ingredients', { n: count }) + '</span>' +
        nutritionLine(r) +
        '</div></div></article>';
    }

    function renderUserContent() {
      var existing = feedGrid.querySelectorAll('[data-ks-user]');
      for (var i = 0; i < existing.length; i++) existing[i].remove();
      var html = '';
      loadUserData();
      ensureMyRecipes();
      ensurePosts();
      var me = currentUser();
      var all = listAllUserRecipes();
      var allArr = [];
      Object.keys(all).forEach(function (rid) { allArr.push(all[rid]); });
      var own = allArr.filter(function (x) { return x.userId === me.id; });
      var others = allArr.filter(function (x) { return x.userId !== me.id; });
      if (own.length) {
        html += '<h3 class="md:col-span-2 lg:col-span-3 font-headline-md text-headline-md text-on-surface" data-ks-user>' + window.t('lbl_my_recipes') + '</h3>';
        own.forEach(function (x) { html += userRecipeCardHTML(x.recipe, { editable: true, author: me }); });
      }
      if (others.length) {
        html += '<h3 class="md:col-span-2 lg:col-span-3 font-headline-md text-headline-md text-on-surface" data-ks-user>' + window.t('lbl_community_recipes') + '</h3>';
        others.forEach(function (x) { html += userRecipeCardHTML(x.recipe, { editable: isAdminUser(), author: x.author }); });
      }
      listAllPosts().forEach(function (item) {
        var p = item.post;
        var author = item.author || { name: p.by || window.t('drawer_guest') };
        var isSelf = author.id === me.id;
        var followBtn = isSelf ? '' :
          '<button data-action="follow" data-user="' + esc(author.id) + '" class="shrink-0 px-3 h-8 rounded-full bg-primary text-on-primary font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all">' +
          '<span class="material-symbols-outlined text-[14px]">person_add</span><span>Follow</span></button>';
        var pid = p.id || '';
        html += '<article data-ks-user data-post-id="' + esc(pid) + '" class="md:col-span-2 lg:col-span-3 group relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(90,113,89,0.05)] p-5">' +
          '<div class="flex items-center gap-3 mb-3">' +
          avatarHTML(author.id, (p.by || author.name), 'w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline-md text-[14px]') +
          '<div class="flex-1"><a href="user-profile.html?uid=' + encodeURIComponent(author.id || '') + '" class="font-body-md text-body-md text-on-surface font-semibold hover:underline">' + esc(p.by || author.name) + '</a><div class="font-label-caps text-label-caps text-on-surface-variant">' + esc(timeLabel(p)) + '</div></div>' +
          followBtn +
          '</div><p class="font-body-md text-body-md text-on-surface mb-3">' + esc(p.text) + '</p>' +
          '<div class="flex items-center gap-4 border-t border-surface-variant/30 pt-3">' +
          '<button data-action="like" data-post="' + esc(pid) + '" class="ks-like-btn flex items-center gap-1 text-on-surface-variant hover:text-error transition-colors font-label-caps text-label-caps"><span class="material-symbols-outlined text-[18px] ks-like-icon">favorite_border</span><span class="ks-like-count">0</span></button>' +
          '<button data-action="comment" data-post="' + esc(pid) + '" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors font-label-caps text-label-caps"><span class="material-symbols-outlined text-[18px]">chat_bubble_outline</span><span class="ks-comment-count">0</span></button>' +
          '</div>' +
          '<div class="ks-post-comments mt-3 hidden"></div>' +
          '</article>';
      });
      if (html) feedGrid.insertAdjacentHTML('afterbegin', html);
      updateFollowButtons();
      loadLikeStatuses();
      /* --- Load server-side activity feed (cross-device posts from followed users) --- */
      if (KS_SERVER_AVAILABLE) {
        socialActivityFeed().then(function (r) {
          if (!r || !r.ok || !r.posts || !r.posts.length) return;
          var existingIds = {};
          listAllPosts().forEach(function (it) { if (it.post && it.post.id) existingIds[it.post.id] = true; });
          var serverHtml = '';
          r.posts.forEach(function (p) {
            if (existingIds[p.id]) return;
            existingIds[p.id] = true;
            var author2 = getUserById(p.ownerId) || { name: p.by || 'Member' };
            var isSelf2 = author2.id === me.id;
            var followBtn2 = isSelf2 ? '' :
              '<button data-action="follow" data-user="' + esc(author2.id) + '" class="shrink-0 px-3 h-8 rounded-full bg-primary text-on-primary font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all">' +
              '<span class="material-symbols-outlined text-[14px]">person_add</span><span>Follow</span></button>';
            serverHtml += '<article data-ks-user data-post-id="' + esc(p.id) + '" class="md:col-span-2 lg:col-span-3 group relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(90,113,89,0.05)] p-5">' +
              '<div class="flex items-center gap-3 mb-3">' +
              avatarHTML(author2.id, (p.by || author2.name), 'w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline-md text-[14px]') +
              '<div class="flex-1"><a href="user-profile.html?uid=' + encodeURIComponent(author2.id || '') + '" class="font-body-md text-body-md text-on-surface font-semibold hover:underline">' + esc(p.by || author2.name) + '</a><div class="font-label-caps text-label-caps text-on-surface-variant">' + esc(timeLabel(p)) + '</div></div>' +
              followBtn2 +
              '</div><p class="font-body-md text-body-md text-on-surface mb-3">' + esc(p.text) + '</p>' +
              '<div class="flex items-center gap-4 border-t border-surface-variant/30 pt-3">' +
              '<button data-action="like" data-post="' + esc(p.id) + '" class="ks-like-btn flex items-center gap-1 text-on-surface-variant hover:text-error transition-colors font-label-caps text-label-caps"><span class="material-symbols-outlined text-[18px] ks-like-icon">favorite_border</span><span class="ks-like-count">0</span></button>' +
              '<button data-action="comment" data-post="' + esc(p.id) + '" class="flex items-center gap-1 text-on-surface-variant hover:text-primary transition-colors font-label-caps text-label-caps"><span class="material-symbols-outlined text-[18px]">chat_bubble_outline</span><span class="ks-comment-count">0</span></button>' +
              '</div><div class="ks-post-comments mt-3 hidden"></div></article>';
          });
          if (serverHtml) {
            feedGrid.insertAdjacentHTML('beforeend', serverHtml);
            updateFollowButtons();
            loadLikeStatuses();
          }
        });
      }
    }

    function renderCatalog() {
      var html = '';
      var hiddenSet = {};
      (hiddenRecipes || []).forEach(function (h) { hiddenSet[h] = true; });
      Object.keys(RECIPES).forEach(function (id) {
        if (hiddenSet[id]) return;
        if (feedGrid.querySelector('article[data-recipe="' + id + '"]')) return;
        var r = catalogEdits[id] || RECIPES[id];
        if (!r || !r.name) return;
        var count = (r.ingredients || []).length;
        var catEditBtn = isAdminUser()
          ? '<button data-action="edit-recipe" data-recipe="' + esc(id) + '" class="shrink-0 text-on-surface-variant hover:text-primary transition-colors focus:outline-none p-1 rounded-full hover:bg-surface-container" aria-label="' + window.t('lbl_edit_recipe') + '"><span class="material-symbols-outlined">edit</span></button>'
          : '';
        var cphs = photoList(r);
        var cHasVid = !!videoOf(r);
        var cVidBadge = cHasVid ? '<span class="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white font-label-caps text-[10px]"><span class="material-symbols-outlined text-[14px]">videocam</span>' + window.t('lbl_video') + '</span>' : '';
        var cmedia = cphs.length
          ? '<img alt="' + esc(r.name) + '" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="' + esc(cphs[0]) + '"/>'
          : '<span class="material-symbols-outlined text-[64px] text-on-surface/60">' + (r.icon || 'restaurant_menu') + '</span>';
        html += '<article data-recipe="' + esc(id) + '" data-category="' + esc(r.cat || '') + '" class="group relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(90,113,89,0.05)] cursor-pointer transition-transform hover:-translate-y-1 duration-300">' +
          '<div class="relative w-full aspect-[4/3] md:aspect-[3/2] bg-gradient-to-br ' + (r.gradient || 'from-primary-fixed to-secondary-fixed') + ' flex items-center justify-center">' + cVidBadge + cmedia + '</div>' +
          '<div class="p-4 flex flex-col gap-2">' +
          '<div class="flex items-start justify-between gap-2">' +
          '<h2 class="font-headline-md text-[20px] leading-[28px] font-semibold text-on-surface">' + esc(r.name) + '</h2>' +
          '<div class="flex items-center gap-1">' + catEditBtn +
          '<button data-action="bookmark" class="shrink-0 text-on-surface-variant hover:text-primary transition-colors focus:outline-none p-1 rounded-full hover:bg-surface-container" aria-label="' + window.t('lbl_bookmark') + '"><span class="material-symbols-outlined">bookmark_border</span></button></div>' +
          '</div>' +
          '<div class="flex items-center gap-1.5 font-label-caps text-label-caps text-on-surface-variant"><span class="material-symbols-outlined text-[14px]">person</span>' + window.t('lbl_by') + ' <a href="user-profile.html?uid=u-sugu" class="hover:underline">KitchenShare</a></div>' +
          '<div class="flex flex-wrap items-center gap-3 font-body-md text-[14px] text-on-surface-variant">' +
          '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">schedule</span>' + esc(r.time || '') + '</span>' +
          (r.servings ? '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">restaurant</span>' + esc(r.servings) + '</span>' : '') +
          '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">shopping_basket</span>' + window.t('count_ingredients', { n: count }) + '</span>' +
          nutritionLine(r) +
          '</div></div></article>';
      });
      if (html) feedGrid.insertAdjacentHTML('beforeend', html);
      var existing = {};
      feedGrid.querySelectorAll('[data-action="bookmark"]').forEach(function (btn) {
        var card = btn.closest('article');
        var h = card && card.querySelector('h2');
        var title = h ? h.textContent.trim() : '';
        if (existing[title]) { btn.remove(); return; }
        existing[title] = true;
        bindBookmark(btn);
        var span = btn.querySelector('.material-symbols-outlined');
        if (span && isBookmarked(title)) {
          span.textContent = 'bookmark';
          span.style.fontVariationSettings = "'FILL' 1";
        }
      });
    }

    feedGrid.addEventListener('click', function (e) {
      /* --- Like button --- */
      var likeBtn = e.target.closest('[data-action="like"]');
      if (likeBtn) {
        e.stopPropagation();
        if (!currentUser()) { ksToast(window.t('toast_auth_required') || 'Please log in'); return; }
        var postId = likeBtn.getAttribute('data-post');
        var icon = likeBtn.querySelector('.ks-like-icon');
        var cnt = likeBtn.querySelector('.ks-like-count');
        var isLiked = icon && icon.textContent === 'favorite';
        /* Optimistic toggle */
        if (icon) {
          icon.textContent = isLiked ? 'favorite_border' : 'favorite';
          icon.style.fontVariationSettings = isLiked ? '' : "'FILL' 1";
          icon.style.color = isLiked ? '' : '#ef4444';
        }
        if (cnt) cnt.textContent = Math.max(0, parseInt(cnt.textContent || '0') + (isLiked ? -1 : 1));
        var fn = isLiked ? socialUnlike : socialLike;
        fn(postId).then(function (r) {
          if (r && r.count !== undefined && cnt) cnt.textContent = r.count;
        });
        return;
      }
      /* --- Comment toggle --- */
      var commentBtn = e.target.closest('[data-action="comment"]');
      if (commentBtn) {
        e.stopPropagation();
        var postId2 = commentBtn.getAttribute('data-post');
        var postCard = commentBtn.closest('article');
        var commentBox = postCard && postCard.querySelector('.ks-post-comments');
        if (!commentBox) return;
        if (!commentBox.classList.contains('hidden')) {
          commentBox.classList.add('hidden');
          return;
        }
        commentBox.classList.remove('hidden');
        commentBox.innerHTML = '<div class="text-sm text-on-surface-variant">Loading...</div>';
        socialPostComments(postId2).then(function (r) {
          if (!r || !r.ok) return;
          var list = r.comments || [];
          var me2 = currentUser();
          var h = '<div class="space-y-2">';
          list.forEach(function (c) {
            h += '<div class="flex gap-2 items-start">' +
              avatarHTML(c.ownerId, c.by, 'w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] shrink-0') +
              '<div><span class="font-label-caps text-label-caps text-on-surface">' + esc(c.by) + '</span>' +
              '<p class="text-sm text-on-surface">' + esc(c.text) + '</p></div></div>';
          });
          h += '<div class="flex gap-2 items-center mt-2">' +
            '<input type="text" class="ks-comment-input flex-1 h-9 px-3 rounded-full bg-surface-container-low border border-surface-variant text-sm" placeholder="' + (window.t('lbl_comment') || 'Add a comment...') + '"/>' +
            '<button class="ks-comment-post h-9 px-3 rounded-full bg-primary text-on-primary text-sm font-label-caps" data-post="' + esc(postId2) + '">Post</button></div>';
          h += '</div>';
          commentBox.innerHTML = h;
          var postBtn = commentBox.querySelector('.ks-comment-post');
          var input = commentBox.querySelector('.ks-comment-input');
          if (postBtn && input) {
            function doPostComment() {
              var txt = input.value.trim();
              if (!txt) return;
              if (!currentUser()) { ksToast(window.t('toast_auth_required') || 'Please log in'); return; }
              input.value = '';
              socialSaveComment(postId2, txt).then(function (r2) {
                if (r2 && r2.ok) {
                  /* Re-render comments */
                  var evt = new MouseEvent('click', { bubbles: true });
                  commentBtn.dispatchEvent(evt);
                  setTimeout(function () { commentBtn.click(); }, 50);
                }
              });
            }
            postBtn.addEventListener('click', doPostComment);
            input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') doPostComment(); });
          }
        });
        return;
      }
      /* --- Recipe card click (existing) --- */
      var card = e.target.closest('article[data-category], article[data-recipe]');
      if (!card) return;
      if (e.target.closest('[data-action="bookmark"], [data-action="edit-recipe"], [data-action="follow"]')) return;
      var rid = card.getAttribute('data-recipe');
      window.location.href = 'recipe-details.html' + (rid ? '?recipe=' + encodeURIComponent(rid) : '');
    });

    feedGrid.querySelectorAll('[data-action="bookmark"]').forEach(function (btn) {
      var card = btn.closest('article');
      var h = card && card.querySelector('h2');
      var title = h ? h.textContent.trim() : '';
      var span = btn.querySelector('.material-symbols-outlined');
      if (span && isBookmarked(title)) {
        span.textContent = 'bookmark';
        span.style.fontVariationSettings = "'FILL' 1";
      }
    });

    var searchInput = document.getElementById('search-input');

    var CAT_LABEL_KEYS = {
      italian: 'lbl_italian',
      vegan: 'lbl_vegan',
      quick: 'lbl_quick_prep',
      breakfast: 'lbl_breakfast',
      southindian: 'lbl_south_indian',
      desserts: 'lbl_desserts'
    };
    function catLabel(cat) {
      if (cat === 'all') return window.t('lbl_for_you');
      if (CAT_LABEL_KEYS[cat]) return window.t(CAT_LABEL_KEYS[cat]);
      return String(cat || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }
    function allCatTokens() {
      var seen = {};
      var out = [];
      function add(cats) {
        String(cats || '').split(/\s+/).forEach(function (tok) {
          tok = tok.trim().toLowerCase();
          if (!tok || seen[tok]) return;
          seen[tok] = true;
          out.push(tok);
        });
      }
      Object.keys(listAllUserRecipes()).forEach(function (rid) { add(listAllUserRecipes()[rid].recipe.cat); });
      Object.keys(catalogEdits).forEach(function (rid) { add(catalogEdits[rid].cat); });
      Object.keys(RECIPES).forEach(function (rid) { add(RECIPES[rid].cat); });
      return out;
    }
    function buildCategoryPills() {
      var host = document.getElementById('category-pills');
      if (!host) return;
      var toks = allCatTokens();
      var baseCls = 'snap-start shrink-0 h-10 px-4 rounded-full font-label-caps text-label-caps flex items-center justify-center hover:bg-secondary-container transition-colors active:scale-95 whitespace-nowrap bg-secondary-container/50 text-on-surface';
      var html = '<button data-category-filter="all" class="snap-start shrink-0 h-10 px-4 rounded-full bg-primary text-on-primary font-label-caps text-label-caps flex items-center justify-center transition-transform active:scale-95 whitespace-nowrap">' + window.t('lbl_for_you') + '</button>';
      toks.forEach(function (tok) {
        html += '<button data-category-filter="' + esc(tok) + '" class="' + baseCls + '">' + esc(catLabel(tok)) + '</button>';
      });
      host.innerHTML = html;
    }
    buildCategoryPills();
    var pillHost = document.getElementById('category-pills');

    function activeCategory() {
      var active = document.querySelector('[data-category-filter].bg-primary');
      return active ? active.getAttribute('data-category-filter') : 'all';
    }

    function applyFilters() {
      var q = ((searchInput && searchInput.value) || '').toLowerCase().trim();
      var cat = activeCategory();
      var visible = 0;
      if (cat === 'all' && !q) reorderForYou();
      var cards = feedGrid.querySelectorAll('article');
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var matchText = card.textContent.toLowerCase().indexOf(q) !== -1;
        var matchCat = (cat === 'all') || (card.getAttribute('data-category') || '').split(' ').indexOf(cat) !== -1;
        var show = matchText && matchCat;
        card.classList.toggle('hidden', !show);
        if (show) visible++;
      }
      feedGrid.querySelectorAll('h3[data-ks-user]').forEach(function (h) {
        h.classList.toggle('hidden', cat !== 'all');
      });
      return visible;
    }

    function reorderForYou() {
      var weights = {};
      getCookedLog().forEach(function (c) {
        var r = c.id ? getRecipe(c.id) : null;
        if (!r) return;
        String(r.cat || '').split(/\s+/).forEach(function (tok) {
          tok = tok.trim().toLowerCase();
          if (tok) weights[tok] = (weights[tok] || 0) + 1;
        });
      });
      var hasWeights = false;
      Object.keys(weights).forEach(function () { hasWeights = true; });
      if (!hasWeights) return;
      var scored = [];
      feedGrid.querySelectorAll('article').forEach(function (card) {
        if (card.getAttribute('data-ks-user')) return;
        var score = 0;
        String(card.getAttribute('data-category') || '').split(/\s+/).forEach(function (tok) {
          tok = tok.trim().toLowerCase();
          if (weights[tok]) score += weights[tok];
        });
        scored.push({ card: card, score: score });
      });
      scored.sort(function (a, b) { return b.score - a.score; });
      scored.forEach(function (x) { feedGrid.appendChild(x.card); });
    }

    var searchTimer = null;
    if (searchInput) searchInput.addEventListener('input', function () {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        searchTimer = null;
        if (applyFilters() === 0) ksToast(window.t('toast_no_match'));
      }, 150);
    });

    if (pillHost) pillHost.addEventListener('click', function (e) {
      var pill = e.target.closest('[data-category-filter]');
      if (!pill) return;
      var all = document.querySelectorAll('[data-category-filter]');
      for (var i = 0; i < all.length; i++) {
        all[i].classList.remove('bg-primary', 'text-on-primary');
        all[i].classList.add('bg-secondary-container/50', 'text-on-surface');
      }
      if (pill.getAttribute('data-category-filter') !== 'all') {
        pill.classList.add('bg-primary', 'text-on-primary');
        pill.classList.remove('bg-secondary-container/50', 'text-on-surface');
      }
      if (applyFilters() === 0) ksToast(window.t('toast_no_category'));
    });

    function feedSheetBase(title, body) {
      var host = document.createElement('div');
      host.className = 'fixed inset-0 z-[75]';
      host.innerHTML =
        '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
        '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
        '<div class="flex items-center justify-between mb-5">' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">' + title + '</h2>' +
        '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close aria-label="' + window.t('lbl_close') + '"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        (body || '') +
        '</div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';
      function closeSheet() { host.remove(); document.body.style.overflow = ''; }
      return { host: host, closeSheet: closeSheet };
    }

    function openMyRecipe() {
      openRecipeEditor(null, currentUserId());
    }

    function openNewPost() {
      var s = feedSheetBase(window.t('lbl_new_post'),
        '<label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">' + window.t('lbl_update') + '</label>' +
        '<textarea id="ks-post-text" class="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface" rows="4" placeholder="' + window.t('lbl_post_ph') + '"></textarea>' +
        '<button class="mt-6 w-full h-14 rounded-full bg-primary text-on-primary font-headline-md text-[18px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">' + window.t('lbl_post_btn') + '</button>');
      s.host.querySelector('[data-ks-close]').addEventListener('click', s.closeSheet);
      s.host.querySelector('.absolute.inset-0').addEventListener('click', s.closeSheet);
      s.host.querySelector('button.w-full.h-14').addEventListener('click', function () {
        var t = document.getElementById('ks-post-text').value.trim();
        if (!t) { ksToast(window.t('toast_write_something')); return; }
        var me = currentUser();
        var post = { id: 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6), text: t, by: me.name, userId: me.id, time: 'Just now', ts: Date.now() };
        posts.unshift(post);
        savePosts();
        syncPushPost(post);
        evaluateAchievements();
        renderUserContent();
        s.closeSheet();
        ksToast(window.t('toast_posted'));
      });
    }

    var fabBtn = document.getElementById('fab-add');
    if (fabBtn) fabBtn.addEventListener('click', function () {
      var host = document.getElementById('ks-fab-sheet');
      if (host) { host.remove(); document.body.style.overflow = ''; return; }
      host = document.createElement('div');
      host.id = 'ks-fab-sheet';
      host.className = 'fixed inset-0 z-[75]';
      host.innerHTML =
        '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
        '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
        '<div class="flex items-center justify-between mb-5">' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">' + window.t('lbl_create') + '</h2>' +
        '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close aria-label="' + window.t('lbl_close') + '"><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<div class="flex flex-col gap-3">' +
        '<button data-opt="new-recipe" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors text-left"><span class="w-12 h-12 shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center"><span class="material-symbols-outlined">menu_book</span></span><span><span class="block font-body-md text-body-md text-on-surface font-semibold">' + window.t('lbl_new_recipe') + '</span><span class="block font-body-md text-body-md text-on-surface-variant text-sm">' + window.t('lbl_new_recipe_sub') + '</span></span></button>' +
        '<button data-opt="scan" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors text-left"><span class="w-12 h-12 shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center"><span class="material-symbols-outlined">view_in_ar</span></span><span><span class="block font-body-md text-body-md text-on-surface font-semibold">' + window.t('lbl_scan') + '</span><span class="block font-body-md text-body-md text-on-surface-variant text-sm">' + window.t('lbl_scan_sub') + '</span></span></button>' +
        '<button data-opt="post" class="flex items-center gap-4 p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors text-left"><span class="w-12 h-12 shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center"><span class="material-symbols-outlined">post_add</span></span><span><span class="block font-body-md text-body-md text-on-surface font-semibold">' + window.t('lbl_new_post') + '</span><span class="block font-body-md text-body-md text-on-surface-variant text-sm">' + window.t('lbl_new_post_sub') + '</span></span></button>' +
        '</div></div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';
      host.querySelector('[data-ks-close]').addEventListener('click', function () { host.remove(); document.body.style.overflow = ''; });
      host.querySelector('.absolute.inset-0').addEventListener('click', function () { host.remove(); document.body.style.overflow = ''; });
      host.querySelector('[data-opt="new-recipe"]').addEventListener('click', function () { host.remove(); document.body.style.overflow = ''; openMyRecipe(); });
      host.querySelector('[data-opt="scan"]').addEventListener('click', function () { host.remove(); document.body.style.overflow = ''; window.location.href = 'my-kitchen-inventory.html?add=1'; });
      host.querySelector('[data-opt="post"]').addEventListener('click', function () { host.remove(); document.body.style.overflow = ''; openNewPost(); });
    });

    renderUserContent();
    renderCatalog();
    reorderForYou();
    window.__ksRenderUser = renderUserContent;
    window.__ksRebuildPills = buildCategoryPills;
  }

