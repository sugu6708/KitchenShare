/* KitchenShare - admin_people_board | module 21/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Admin page (admin.html) ---------------- */

  if (currentPage === 'admin.html') {
    var adminGate = document.getElementById('ks-admin-gate');
    var adminBody = document.getElementById('ks-admin-body');
    var adminPending = document.getElementById('ks-admin-pending');
    var adminMembers = document.getElementById('ks-admin-members');
    var adminRecipes = document.getElementById('ks-admin-recipes');
    var adminPosts = document.getElementById('ks-admin-posts');
    var adminNote = document.getElementById('ks-admin-note');
    var adminSyncedOnce = false;

    function showAdminNote(pw, uid) {
      if (!adminNote) return;
      var u = getUserById(uid);
      var nm = u ? u.name : 'member';
      adminNote.innerHTML =
        '<div class="mb-3 p-3 rounded-2xl bg-tertiary-container text-on-tertiary-container border border-tertiary font-body-md text-body-md text-sm">' +
        '<div class="font-semibold flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">lock_reset</span>' + window.t('admin_approved_title', { name: nm }) + '</div>' +
        '<div class="mt-1">' + window.t('admin_approved_password', { pw: pw }) + '</div>' +
        '<div class="text-xs opacity-80 mt-1">' + window.t('admin_approved_note') + '</div></div>';
      adminNote.classList.remove('hidden');
    }

    function mergeRemotePending(list) {
      if (!list || !list.length) return;
      var us = getUsers();
      list.forEach(function (ru) {
        var found = null;
        var email = String(ru.email || '').toLowerCase();
        for (var i = 0; i < us.length; i++) {
          if (us[i].email && us[i].email.toLowerCase() === email) { found = us[i]; break; }
        }
        if (found) {
          found.id = ru.id;
          found.name = ru.name;
          if (ru.tagline) found.tagline = ru.tagline;
          if (ru.bio !== undefined) found.bio = ru.bio;
          found.role = (found.role === 'admin' || ru.role === 'admin') ? 'admin' : 'user';
          found.status = ru.status || found.status;
        } else {
          us.push({ id: ru.id, name: ru.name, tagline: ru.tagline || 'Home Cook', bio: ru.bio || '', email: ru.email, pass: '', role: ru.role === 'admin' ? 'admin' : 'user', status: ru.status || 'pending', following: [] });
        }
      });
      saveUsers();
    }

    function syncRemoteAdmin() {
      var cu = currentUser();
      if (!cu) return;
      serverApi('pending', { adminEmail: cu.email, adminPass: cu.pass }).then(function (r) {
        if (r && r.users) {
          mergeRemotePending(r.users);
          renderAdmin();
        }
      });
    }

    function adminRowHTML(inner) {
      return '<div class="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors border border-surface-variant/50">' + inner + '</div>';
    }

    function renderAdminPending() {
      if (!adminPending) return;
      var list = getUsers().filter(function (u) { return u.status === 'pending'; });
      if (!list.length) {
        adminPending.innerHTML = '<div class="p-6 text-center rounded-2xl bg-surface-container-lowest border border-dashed border-surface-variant"><p class="font-body-md text-body-md text-on-surface-variant">' + window.t('lbl_no_pending') + '</p></div>';
        return;
      }
      adminPending.innerHTML = list.map(function (u) {
        return adminRowHTML(
          avatarHTML(u.id, u.name, 'w-11 h-11 shrink-0 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline-md text-[14px]') +
          '<div class="flex-1 min-w-0"><div class="font-body-md text-body-md text-on-surface font-semibold truncate">' + esc(u.name) + '</div>' +
          '<div class="font-label-caps text-label-caps text-on-surface-variant truncate">' + esc(u.email || '') + '</div></div>' +
          '<button data-admin-action="approve" data-id="' + esc(u.id) + '" class="shrink-0 h-9 px-3 rounded-full bg-primary text-on-primary font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[16px]">check</span>' + window.t('lbl_approve') + '</button>' +
          '<button data-admin-action="remove-user" data-id="' + esc(u.id) + '" class="shrink-0 h-9 px-3 rounded-full bg-error-container text-on-error-container font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[16px]">close</span>' + window.t('lbl_decline') + '</button>'
        );
      }).join('');
    }

    function renderAdminMembers() {
      if (!adminMembers) return;
      adminMembers.innerHTML = getUsers().filter(function (u) { return u.status !== 'pending'; }).map(function (u) {
        var isAdmin = u.role === 'admin';
        var roleBtn = isAdmin
          ? '<button data-admin-action="demote" data-id="' + esc(u.id) + '" class="shrink-0 h-9 px-3 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[16px]">shield</span>' + window.t('lbl_make_user') + '</button>'
          : '<button data-admin-action="promote" data-id="' + esc(u.id) + '" class="shrink-0 h-9 px-3 rounded-full bg-tertiary-container text-on-tertiary-container font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[16px]">shield</span>' + window.t('lbl_make_admin') + '</button>';
        var resetBtn = u.id === currentUserId()
          ? ''
          : '<button data-admin-action="reset-password" data-id="' + esc(u.id) + '" class="shrink-0 h-9 px-3 rounded-full bg-secondary-container text-on-secondary font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[16px]">lock_reset</span>Reset PW</button>';
        var rmBtn = u.id === currentUserId()
          ? '<span class="shrink-0 px-3 h-9 rounded-full bg-surface-container-high text-on-surface-variant font-label-caps text-label-caps flex items-center opacity-70">' + window.t('lbl_you') + '</span>'
          : '<button data-admin-action="remove-user" data-id="' + esc(u.id) + '" class="shrink-0 h-9 px-3 rounded-full bg-error-container text-on-error-container font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[16px]">person_remove</span>' + window.t('lbl_remove') + '</button>';
        return adminRowHTML(
          avatarHTML(u.id, u.name, 'w-11 h-11 shrink-0 rounded-full ' + (isAdmin ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary-container text-on-primary-container') + ' flex items-center justify-center font-headline-md text-[14px]') +
          '<div class="flex-1 min-w-0"><div class="font-body-md text-body-md text-on-surface font-semibold truncate">' + esc(u.name) + ' <span class="font-label-caps text-label-caps text-' + (isAdmin ? 'tertiary' : 'on-surface-variant') + '">' + (isAdmin ? window.t('lbl_admin_tag') : window.t('lbl_user_tag')) + '</span></div>' +
          '<div class="font-label-caps text-label-caps text-on-surface-variant truncate">' + esc(u.email || '') + ' · ' + (followerCount(u.id) === 1 ? window.t('count_followers_one', { n: followerCount(u.id) }) : window.t('count_followers', { n: followerCount(u.id) })) + '</div></div>' +
          roleBtn + resetBtn + rmBtn
        );
      }).join('');
    }

    function renderAdminRecipes() {
      if (!adminRecipes) return;
      var all = listAllUserRecipes();
      var html = '';
      Object.keys(all).forEach(function (rid) {
        var x = all[rid];
        html += adminRowHTML(
          '<span class="w-11 h-11 shrink-0 rounded-2xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center"><span class="material-symbols-outlined text-[20px]">' + esc(x.recipe.icon || 'restaurant_menu') + '</span></span>' +
          '<div class="flex-1 min-w-0"><div class="font-body-md text-body-md text-on-surface font-semibold truncate">' + esc(x.recipe.name) + '</div>' +
          '<div class="font-label-caps text-label-caps text-on-surface-variant truncate">' + window.t('lbl_by') + ' ' + esc(x.author.name) + '</div></div>' +
          '<button data-admin-action="edit-recipe" data-id="' + esc(rid) + '" class="shrink-0 h-9 px-3 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span>' + window.t('lbl_edit_recipe') + '</button>' +
          '<button data-admin-action="remove-recipe" data-id="' + esc(rid) + '" class="shrink-0 h-9 px-3 rounded-full bg-error-container text-on-error-container font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span>' + window.t('lbl_remove') + '</button>'
        );
      });
      Object.keys(RECIPES).forEach(function (rid) {
        if (hiddenRecipes.indexOf(rid) !== -1) return;
        var r = catalogEdits[rid] || RECIPES[rid];
        if (!r || !r.name) return;
        html += adminRowHTML(
          '<span class="w-11 h-11 shrink-0 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center"><span class="material-symbols-outlined text-[20px]">' + esc(r.icon || 'restaurant_menu') + '</span></span>' +
          '<div class="flex-1 min-w-0"><div class="font-body-md text-body-md text-on-surface font-semibold truncate">' + esc(r.name) + '</div>' +
          '<div class="font-label-caps text-label-caps text-on-surface-variant truncate">' + window.t('lbl_catalog') + '</div></div>' +
          '<button data-admin-action="edit-recipe" data-id="' + esc(rid) + '" class="shrink-0 h-9 px-3 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[16px]">edit</span>' + window.t('lbl_edit_recipe') + '</button>' +
          '<button data-admin-action="remove-recipe" data-id="' + esc(rid) + '" class="shrink-0 h-9 px-3 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[16px]">visibility_off</span>' + window.t('lbl_hide') + '</button>'
        );
      });
      adminRecipes.innerHTML = html || '<div class="p-6 text-center rounded-2xl bg-surface-container-lowest border border-dashed border-surface-variant"><p class="font-body-md text-body-md text-on-surface-variant">' + window.t('lbl_no_recipes') + '</p></div>';
    }

    function renderAdminPosts() {
      if (!adminPosts) return;
      var list = listAllPosts();
      adminPosts.innerHTML = list.map(function (item) {
        var p = item.post;
        return adminRowHTML(
          '<span class="w-11 h-11 shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center"><span class="material-symbols-outlined text-[20px]">article</span></span>' +
          '<div class="flex-1 min-w-0"><div class="font-body-md text-body-md text-on-surface font-semibold truncate">' + esc(p.by || item.author.name) + '</div>' +
          '<div class="font-label-caps text-label-caps text-on-surface-variant line-clamp-2">' + esc(p.text) + '</div></div>' +
          '<button data-admin-action="remove-post" data-id="' + esc(p.id) + '" class="shrink-0 h-9 px-3 rounded-full bg-error-container text-on-error-container font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span class="material-symbols-outlined text-[16px]">delete</span>' + window.t('lbl_remove') + '</button>'
        );
      }).join('') || '<div class="p-6 text-center rounded-2xl bg-surface-container-lowest border border-dashed border-surface-variant"><p class="font-body-md text-body-md text-on-surface-variant">' + window.t('lbl_no_posts') + '</p></div>';
    }

    function renderAdminAuditLog() {
      var logContainer = document.getElementById('ks-admin-audit-log');
      if (!logContainer && adminBody) {
        logContainer = document.createElement('div');
        logContainer.id = 'ks-admin-audit-log';
        logContainer.className = 'h-64 overflow-auto space-y-2';
        adminBody.appendChild(logContainer);
      }
      if (!logContainer) return;
      serverApi('audit-log', {}).then(function (r) {
        if (!r || !r.entries) return;
        if (!r.entries.length) {
          logContainer.innerHTML = '<p class="font-body-md text-body-md text-on-surface-variant text-center py-4">' + window.t('lbl_audit_empty') + '</p>';
          return;
        }
        logContainer.innerHTML = r.entries.map(function (e) {
          var ts = new Date(e.ts);
          var timeStr = pad2(ts.getDate()) + '/' + pad2(ts.getMonth() + 1) + '/' + ts.getFullYear() + ' ' + pad2(ts.getHours()) + ':' + pad2(ts.getMinutes());
          return '<div class="p-2 rounded bg-surface-container-lowest border border-surface-variant/40"><div class="font-label-caps text-label-caps text-on-surface-variant">' + timeStr + '</div>' +
            '<div class="font-body-md text-body-md text-on-surface text-sm">' + esc((e.action || '') + ' — ' + (e.admin || '') + ' → ' + (e.uid || '') + (e.reason ? ' (' + e.reason + ')' : '')) + '</div></div>';
        }).join('');
      });
    }

    function renderAdminDashboard() {
      var dashHost = document.getElementById('ks-admin-dashboard');
      if (!dashHost) return;
      var db = getUsers() || [];
      var totalUsers = db.length;
      var activeToday = 0;
      var pendingSignups = 0;
      db.forEach(function (u) {
        if (u.join && (Date.now() - u.join) < 86400000) activeToday++;
        if (u.status === 'pending') pendingSignups++;
      });
      var storageUsed = 0;
      try {
        for (var k in localStorage) { if (Object.prototype.hasOwnProperty.call(localStorage, k)) storageUsed += (localStorage[k] || '').length; }
      } catch (e) {}
      dashHost.innerHTML = '<div class="grid grid-cols-2 gap-4 my-4">' +
        '<div class="p-3 rounded-2xl bg-surface-container-lowest border border-surface-variant/50"><div class="font-metric-lg text-metric-lg text-primary">' + totalUsers + '</div><div class="font-label-caps text-label-caps text-on-surface-variant uppercase">Total Users</div></div>' +
        '<div class="p-3 rounded-2xl bg-surface-container-lowest border border-surface-variant/50"><div class="font-metric-lg text-metric-lg text-primary">' + activeToday + '</div><div class="font-label-caps text-label-caps text-on-surface-variant uppercase">Joined Today</div></div>' +
        '<div class="p-3 rounded-2xl bg-surface-container-lowest border border-surface-variant/50"><div class="font-metric-lg text-metric-lg text-primary">' + pendingSignups + '</div><div class="font-label-caps text-label-caps text-on-surface-variant uppercase">Pending Signups</div></div>' +
        '<div class="p-3 rounded-2xl bg-surface-container-lowest border border-surface-variant/50"><div class="font-metric-lg text-metric-lg text-primary">' + ((storageUsed / 1024) | 0) + ' KB</div><div class="font-label-caps text-label-caps text-on-surface-variant uppercase">Storage Used</div></div>' +
        '</div>';
    }

    function renderAdmin() {
      var isAdmin = isAdminUser();
      if (adminGate) adminGate.classList.toggle('hidden', isAdmin);
      if (adminBody) adminBody.classList.toggle('hidden', !isAdmin);
      if (!isAdmin) return;
      renderAdminDashboard();
      renderAdminPending();
      renderAdminMembers();
      renderAdminRecipes();
      renderAdminPosts();
      renderAdminAuditLog();
      if (!adminSyncedOnce) { adminSyncedOnce = true; syncRemoteAdmin(); }
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-admin-action]');
      if (!btn) return;
      e.preventDefault();
      var act = btn.getAttribute('data-admin-action');
      var id = btn.getAttribute('data-id');
      function setLoading(b, loading) {
        if (loading) {
          b.setAttribute('data-orig-text', b.textContent);
          b.classList.add('pointer-events-none', 'opacity-60');
          b.textContent = window.t('lbl_working');
        } else {
          b.classList.remove('pointer-events-none', 'opacity-60');
          b.textContent = b.getAttribute('data-orig-text') || b.textContent;
        }
      }
      if (act === 'approve') {
        setLoading(btn, true);
        approveUser(id).then(function (pw) {
          setLoading(btn, false);
          renderAdmin();
          var ap = getUserById(id);
          if (pw) showAdminNote(pw, id);
          ksToast(window.t('admin_approved_title', { name: ap ? ap.name : 'member' }), 6000);
        });
      }
      else if (act === 'demote') { setLoading(btn, true); serverApi('set-role', { id: id, role: 'user' }).then(function (r) { setLoading(btn, false); if (r && r.ok) { setRole(id, 'user'); ksToast(window.t('toast_role_user')); } renderAdmin(); }); }
      else if (act === 'promote') { setLoading(btn, true); serverApi('set-role', { id: id, role: 'admin' }).then(function (r) { setLoading(btn, false); if (r && r.ok) { setRole(id, 'admin'); ksToast(window.t('toast_role_admin')); } renderAdmin(); }); }
      else if (act === 'reset-password') {
        var cu = currentUser();
        openAdminResetPasswordSheet(id, cu);
      }
      else if (act === 'remove-user') {
        var ru = getUserById(id);
        var cu2 = currentUser();
        setLoading(btn, true);
        serverApi('decline', { adminEmail: cu2 ? cu2.email : '', adminPass: cu2 ? cu2.pass : '', id: id }).then(function () {
          removeUser(id);
          if (ru && ru.id === currentUserId()) { window.location.href = 'login.html'; return; }
          ksToast(window.t('toast_account_removed'));
        }).finally(function () { setLoading(btn, false); renderAdmin(); });
      }
      else if (act === 'remove-recipe') { removeRecipe(id); ksToast(window.t('toast_recipe_removed_hidden')); renderAdmin(); }
      else if (act === 'edit-recipe') {
        var erFound = findRecipeOwner(id);
        if (erFound) openRecipeEditor(erFound.recipe, erFound.userId, false);
        else if (catalogEdits[id] || RECIPES[id]) {
          var erCat = catalogEdits[id] || RECIPES[id];
          if (!erCat.id) erCat.id = id;
          openRecipeEditor(erCat, null, true);
        }
      }
      else if (act === 'remove-post') { removePost(id); ksToast(window.t('toast_post_removed')); renderAdmin(); }
    });

    function openAdminResetPasswordSheet(targetId, admin) {
      var u = getUserById(targetId);
      var host = document.createElement('div');
      host.id = 'ks-admin-reset-sheet';
      host.className = 'fixed inset-0 z-[80]';
      host.innerHTML =
        '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
        '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
        '<h2 class="font-headline-md text-headline-md text-on-surface mb-2">Reset Password</h2>' +
        '<p class="font-body-md text-body-md text-on-surface-variant mb-5">Set a new password for <strong>' + esc(u ? u.name : 'user') + '</strong>. They will be required to change it on next login.</p>' +
        '<label class="block font-body-md text-body-md text-on-surface mb-1">New Password</label>' +
        '<input id="ks-admin-reset-pass" type="text" class="w-full h-12 px-4 rounded-xl border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md mb-4" placeholder="Min 4 characters" autocomplete="off"/>' +
        '<p id="ks-admin-reset-error" class="text-sm text-error mb-3 hidden"></p>' +
        '<div class="flex gap-3">' +
        '<button id="ks-admin-reset-cancel" class="flex-1 h-14 rounded-full bg-surface-container-high text-on-surface font-headline-md text-[16px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">Cancel</button>' +
        '<button id="ks-admin-reset-confirm" class="flex-1 h-14 rounded-full bg-primary text-on-primary font-headline-md text-[16px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">Reset & Share</button>' +
        '</div></div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';
      function close() { host.remove(); document.body.style.overflow = ''; }
      host.querySelector('.absolute.inset-0').addEventListener('click', close);
      host.querySelector('#ks-admin-reset-cancel').addEventListener('click', close);
      host.querySelector('#ks-admin-reset-confirm').addEventListener('click', function () {
        var pw = document.getElementById('ks-admin-reset-pass').value;
        var errEl = document.getElementById('ks-admin-reset-error');
        if (!pw || pw.length < 4) { errEl.textContent = 'Password must be at least 4 characters'; errEl.classList.remove('hidden'); return; }
        errEl.classList.add('hidden');
        var cu2 = currentUser();
        serverApi('admin-reset-password', { adminEmail: cu2 ? cu2.email : '', adminPass: cu2 ? cu2.pass : '', id: targetId, password: pw }).then(function (r) {
          if (r && r.ok) {
            close();
            ksToast('Password reset for ' + (u ? u.name : 'user') + '. Share: ' + pw, 8000);
            renderAdmin();
          } else if (r && r.error) {
            errEl.textContent = r.error;
            errEl.classList.remove('hidden');
          }
        });
      });
    }

    renderAdmin();
  }

  /* ---------------- People page (people.html) ---------------- */

  if (currentPage === 'people.html') {
    var folHost = document.getElementById('ks-people-following');
    var allHost = document.getElementById('ks-people-all');

    function personRowHTML(u) {
      var me = currentUser();
      var pending = u.status === 'pending';
      var isSelf = me && me.id === u.id;
      var btn = isSelf
        ? '<span class="shrink-0 px-3 h-8 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps flex items-center">' + window.t('lbl_you') + '</span>'
        : pending
          ? '<span class="shrink-0 px-3 h-8 rounded-full bg-surface-container-high text-on-surface-variant font-label-caps text-label-caps flex items-center opacity-70">' + window.t('lbl_pending_tag') + '</span>'
          : '<button data-action="follow" data-user="' + esc(u.id) + '" class="shrink-0 px-3 h-8 rounded-full bg-primary text-on-primary font-label-caps text-label-caps flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all"><span>' + window.t('lbl_follow') + '</span></button>';
      return '<div class="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors border border-surface-variant/50">' +
        '<a href="user-profile.html?uid=' + encodeURIComponent(u.id) + '" class="shrink-0" aria-label="' + window.t('lbl_view_profile') + '">' + avatarHTML(u.id, u.name, 'w-11 h-11 rounded-full ' + (u.role === 'admin' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary-container text-on-primary-container') + ' flex items-center justify-center font-headline-md text-[14px]') + '</a>' +
        '<div class="flex-1 min-w-0">' +
        '<a href="user-profile.html?uid=' + encodeURIComponent(u.id) + '" class="font-body-md text-body-md text-on-surface font-semibold truncate hover:underline">' + esc(u.name) + (u.role === 'admin' ? ' <span class="font-label-caps text-label-caps text-tertiary">' + window.t('lbl_admin_tag') + '</span>' : '') + '</a>' +
        '<div class="font-label-caps text-label-caps text-on-surface-variant truncate">' + esc(u.tagline || 'Home Cook') + ' · ' + (followerCount(u.id) === 1 ? window.t('count_followers_one', { n: followerCount(u.id) }) : window.t('count_followers', { n: followerCount(u.id) })) + '</div>' +
        '</div>' + btn + '</div>';
    }

    function renderPeople() {
      if (folHost) {
        var me = currentUser();
        var folIds = (me && me.following) || [];
        var fol = folIds.map(getUserById).filter(Boolean);
        folHost.innerHTML = fol.length
          ? fol.map(personRowHTML).join('')
          : '<div class="p-6 text-center rounded-2xl bg-surface-container-lowest border border-dashed border-surface-variant"><p class="font-body-md text-body-md text-on-surface-variant">' + window.t('lbl_no_following') + '</p></div>';
      }
      if (allHost) {
        var list = getUsers().filter(function (u) { return u.id !== currentUserId(); });
        allHost.innerHTML = list.map(personRowHTML).join('');
      }
      updateFollowButtons();
    }

    renderPeople();
    window.__ksOnSync = function () {
      renderPeople();
    };
  }

  /* ---------------- Leaderboard page (leaderboard.html) ---------------- */

  if (currentPage === 'leaderboard.html') {
    var lbTabsHost = document.getElementById('ks-lb-tabs');
    var lbListHost = document.getElementById('ks-leaderboard-list');
    var lbHeadingText = document.getElementById('ks-lb-heading-text');
    var lbTab = 'recipes';

    var LB_TABS = [
      { key: 'recipes', heading: 'lb_most_recipes' },
      { key: 'followers', heading: 'lb_most_followed' },
      { key: 'streaks', heading: 'lb_best_streaks' }
    ];

    function lbLocalEntries(metric) {
      return getUsers()
        .filter(function (u) { return u.status !== 'pending'; })
        .map(function (u) {
          var st = computeAchStats(u.id);
          return { id: u.id, name: u.name, tagline: u.tagline, recipes: st.recipes, followers: st.followers, streak: st.streak };
        });
    }

    function lbMetricOf(e) {
      return lbTab === 'recipes' ? (e.recipes || 0) : lbTab === 'followers' ? (e.followers || 0) : (e.streak || 0);
    }

    function lbMetricLabel(n) {
      if (lbTab === 'followers') return n === 1 ? window.t('count_followers_one', { n: n }) : window.t('count_followers', { n: n });
      if (lbTab === 'streaks') return n + ' ' + window.t('lbl_day_streak');
      return n + ' ' + window.t('lbl_recipes');
    }

    function lbRankBadge(i) {
      var medal = i === 0 ? ['bg-primary text-on-primary'] : i === 1 ? ['bg-tertiary-container text-on-tertiary-container'] : i === 2 ? ['bg-secondary-container text-on-secondary-container'] : ['bg-surface-container-high text-on-surface-variant'];
      return '<span class="w-9 h-9 shrink-0 rounded-full ' + medal[0] + ' flex items-center justify-center font-headline-md text-[14px]">' + (i + 1) + '</span>';
    }

    function lbRender(entries) {
      if (!lbListHost) return;
      entries = entries || [];
      entries.sort(function (a, b) { return lbMetricOf(b) - lbMetricOf(a); });
      entries = entries.filter(function (e, i) { return i < 20 && lbMetricOf(e) > 0; });
      if (!entries.length) {
        lbListHost.innerHTML = '<div class="p-6 text-center rounded-2xl bg-surface-container-lowest border border-dashed border-surface-variant"><p class="font-body-md text-body-md text-on-surface-variant">' + window.t('lb_empty') + '</p></div>';
        return;
      }
      lbListHost.innerHTML = entries.map(function (en, i) {
        var u = getUserById(en.id) || {};
        return '<a href="user-profile.html?uid=' + encodeURIComponent(en.id) + '" class="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors border border-surface-variant/50' + (en.id === currentUserId() ? ' ring-2 ring-primary' : '') + '">' +
          lbRankBadge(i) +
          avatarHTML(en.id, en.name || u.name || '?', 'w-11 h-11 shrink-0 rounded-full ' + (u.role === 'admin' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary-container text-on-primary-container') + ' flex items-center justify-center font-headline-md text-[14px]') +
          '<span class="flex-1 min-w-0"><span class="block font-body-md text-body-md text-on-surface font-semibold truncate">' + esc(en.name || u.name || '?') + (en.id === currentUserId() ? ' <span class="font-label-caps text-label-caps text-primary">' + window.t('lbl_you') + '</span>' : '') + '</span>' +
          '<span class="block font-label-caps text-label-caps text-on-surface-variant truncate">' + esc(u.tagline || 'Home Cook') + '</span></span>' +
          '<span class="shrink-0 font-headline-md text-body-md text-primary">' + esc(lbMetricLabel(lbMetricOf(en))) + '</span></a>';
      }).join('');
    }

    function lbLoad() {
      var tabDef = LB_TABS.filter(function (x) { return x.key === lbTab; })[0];
      if (lbHeadingText && tabDef) lbHeadingText.textContent = window.t(tabDef.heading);
      if (lbTab === 'streaks') { lbRender(lbLocalEntries('streak')); return; }
      socialLeaderboard().then(function (r) {
        if (r && r.ok && ((lbTab === 'recipes' && Array.isArray(r.byRecipes)) || (lbTab === 'followers' && Array.isArray(r.byFollowers)))) {
          var arr = lbTab === 'recipes' ? r.byRecipes : r.byFollowers;
          if (lbTab === 'followers') arr = arr.map(function (e) { return { id: e.id, name: e.name, followers: e.followers }; });
          lbRender(arr);
        } else {
          lbRender(lbLocalEntries(lbTab));
        }
      }).catch(function () {
        lbRender(lbLocalEntries(lbTab));
      });
    }

    if (lbTabsHost) lbTabsHost.addEventListener('click', function (e) {
      var t = e.target.closest('[data-lb-tab]');
      if (!t) return;
      lbTab = t.getAttribute('data-lb-tab');
      lbTabsHost.querySelectorAll('[data-lb-tab]').forEach(function (b) {
        var on = b.getAttribute('data-lb-tab') === lbTab;
        b.classList.toggle('bg-primary', on);
        b.classList.toggle('text-on-primary', on);
        b.classList.toggle('bg-surface-container-high', !on);
        b.classList.toggle('text-on-surface', !on);
      });
      lbListHost.innerHTML = '';
      lbLoad();
    });

    lbLoad();
    window.__ksOnSync = lbLoad;
  }

