/* KitchenShare - groups | module 28/28 | classic script */
"use strict";
  /* ---------------- Groups System ---------------- */

  if (currentPage === 'people.html') {
    var groupCreateBtn = document.getElementById('ks-group-create-btn');
    var groupListEl = document.getElementById('ks-groups-list');
    var groupInvEl = document.getElementById('group-invitations');

    function apiGroup(action, data) {
      data = data || {};
      return fetch('/api/' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'KSFetch' },
        credentials: 'same-origin',
        body: JSON.stringify(data)
      }).then(function (r) { return r.json(); }).catch(function () { return { error: 'Network error' }; });
    }

    function openCreateGroupSheet() {
      var host = document.createElement('div');
      host.id = 'ks-group-sheet';
      host.className = 'fixed inset-0 z-[75]';
      host.innerHTML =
        '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
        '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
        '<div class="flex items-center justify-between mb-5">' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">Create Group</h2>' +
        '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<label class="block mb-1 font-label-caps text-label-caps text-on-surface-variant uppercase">Group Name</label>' +
        '<input id="group-name-input" class="w-full h-12 px-4 rounded-xl bg-surface-container-low border border-surface-variant focus:ring-2 focus:ring-primary font-body-md text-body-md text-on-surface" type="text" placeholder="e.g. Nangalum Samaipom"/>' +
        '<button class="mt-6 w-full h-14 rounded-full bg-primary text-on-primary font-headline-md text-[18px] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all">Create</button>' +
        '</div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';
      function closeSheet() { host.remove(); document.body.style.overflow = ''; }
      host.querySelector('[data-ks-close]').addEventListener('click', closeSheet);
      host.querySelector('.absolute.inset-0').addEventListener('click', closeSheet);
      host.querySelector('button.w-full.h-14').addEventListener('click', function () {
        var name = document.getElementById('group-name-input').value.trim();
        if (!name) { ksToast('Please enter a group name'); return; }
        apiGroup('group-create', { name: name }).then(function (r) {
          if (r.ok) {
            ksToast('Group "' + name + '" created!');
            closeSheet();
            loadGroups();
            loadGroupInvitations();
          } else {
            ksToast(r.error || 'Failed to create group');
          }
        });
      });
    }

    function openInviteSheet(groupId, groupName) {
      var users = getUsers().filter(function (u) { return u.id !== currentUserId() && u.status === 'active'; });
      var host = document.createElement('div');
      host.id = 'ks-invite-sheet';
      host.className = 'fixed inset-0 z-[75]';
      var userListHTML = users.map(function (u) {
        return '<div class="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low transition-colors">' +
          '<div class="flex items-center gap-3">' +
          '<div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline-md text-[14px]">' + esc(u.name.charAt(0).toUpperCase()) + '</div>' +
          '<span class="font-body-md text-body-md text-on-surface">' + esc(u.name) + '</span>' +
          '</div>' +
          '<button data-invite-user="' + esc(u.id) + '" class="px-3 h-8 rounded-full bg-primary text-on-primary font-label-caps text-label-caps hover:opacity-90 active:scale-95 transition-all">Invite</button>' +
          '</div>';
      }).join('');
      host.innerHTML =
        '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
        '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
        '<div class="flex items-center justify-between mb-5">' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">Invite to ' + esc(groupName) + '</h2>' +
        '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<div class="max-h-[400px] overflow-y-auto">' + userListHTML + '</div>' +
        '</div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';
      function closeSheet() { host.remove(); document.body.style.overflow = ''; }
      host.querySelector('[data-ks-close]').addEventListener('click', closeSheet);
      host.querySelector('.absolute.inset-0').addEventListener('click', closeSheet);
      host.querySelectorAll('[data-invite-user]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var uid = btn.getAttribute('data-invite-user');
          apiGroup('group-invite', { groupId: groupId, userId: uid }).then(function (r) {
            if (r.ok) {
              var uname = users.find(function (u) { return u.id === uid; });
              ksToast('Invitation sent to ' + (uname ? uname.name : uid));
              btn.textContent = 'Sent';
              btn.disabled = true;
              btn.classList.remove('bg-primary', 'text-on-primary');
              btn.classList.add('bg-surface-container-high', 'text-on-surface-variant');
            } else {
              ksToast(r.error || 'Failed to send invite');
            }
          });
        });
      });
    }

    function openGroupDetailSheet(groupId, groupName) {
      apiGroup('group-members', { groupId: groupId }).then(function (r) {
        if (!r.ok) return;
        var members = r.members || [];
        var host = document.createElement('div');
        host.id = 'ks-group-detail-sheet';
        host.className = 'fixed inset-0 z-[75]';
        var memberHTML = members.map(function (m) {
          var statusIcon = m.status === 'accepted' ? 'check_circle' : 'pending';
          var statusColor = m.status === 'accepted' ? 'text-primary' : 'text-on-surface-variant';
          return '<div class="flex items-center justify-between p-3 rounded-lg">' +
            '<div class="flex items-center gap-3">' +
            '<div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline-md text-[14px]">' + esc(m.name.charAt(0).toUpperCase()) + '</div>' +
            '<div><span class="font-body-md text-body-md text-on-surface">' + esc(m.name) + '</span>' +
            '<span class="block font-label-caps text-label-caps text-on-surface-variant">' + m.status + '</span></div>' +
            '</div>' +
            '<span class="material-symbols-outlined text-[20px] ' + statusColor + '">' + statusIcon + '</span>' +
            '</div>';
        }).join('');
        host.innerHTML =
          '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
          '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
          '<div class="flex items-center justify-between mb-5">' +
          '<h2 class="font-headline-md text-headline-md text-on-surface">' + esc(groupName) + '</h2>' +
          '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close><span class="material-symbols-outlined">close</span></button>' +
          '</div>' +
          '<button id="group-invite-btn" class="w-full mb-4 h-12 rounded-full bg-secondary-container text-on-surface font-label-caps text-label-caps flex items-center justify-center gap-2 hover:bg-secondary-fixed active:scale-95 transition-all"><span class="material-symbols-outlined text-[18px]">person_add</span> Invite Member</button>' +
          '<div class="max-h-[300px] overflow-y-auto">' + memberHTML + '</div>' +
          '</div>';
        document.body.appendChild(host);
        document.body.style.overflow = 'hidden';
        function closeSheet() { host.remove(); document.body.style.overflow = ''; }
        host.querySelector('[data-ks-close]').addEventListener('click', closeSheet);
        host.querySelector('.absolute.inset-0').addEventListener('click', closeSheet);
        host.querySelector('#group-invite-btn').addEventListener('click', function () {
          closeSheet();
          openInviteSheet(groupId, groupName);
        });
      });
    }

    function loadGroups() {
      if (!groupListEl) return;
      apiGroup('group-list').then(function (r) {
        if (!r.ok) { groupListEl.innerHTML = ''; return; }
        var groups = r.groups || [];
        if (!groups.length) {
          groupListEl.innerHTML = '<p class="font-body-sm text-body-sm text-on-surface-variant py-2">No groups yet. Create one to start cooking together!</p>';
          return;
        }
        groupListEl.innerHTML = groups.map(function (g) {
          return '<div data-group="' + esc(g.id) + '" class="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_rgba(66,88,66,0.05)] cursor-pointer hover:bg-surface-container-low transition-colors">' +
            '<div class="flex items-center gap-3">' +
            '<div class="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">' +
            '<span class="material-symbols-outlined text-[24px]">group</span></div>' +
            '<div><span class="font-headline-sm text-headline-sm text-on-surface">' + esc(g.name) + '</span>' +
            '<span class="block font-label-caps text-label-caps text-on-surface-variant">' + (g.ownerId === currentUserId() ? 'Owner' : 'Member') + '</span></div>' +
            '</div>' +
            '<span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>' +
            '</div>';
        }).join('');
        groupListEl.querySelectorAll('[data-group]').forEach(function (el) {
          el.addEventListener('click', function () {
            openGroupDetailSheet(el.getAttribute('data-group'), el.querySelector('.font-headline-sm').textContent);
          });
        });
      });
    }

    function loadGroupInvitations() {
      if (!groupInvEl) return;
      apiGroup('group-pending').then(function (r) {
        if (!r.ok || !r.invitations || !r.invitations.length) { groupInvEl.innerHTML = ''; return; }
        groupInvEl.innerHTML = '<p class="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Pending Invitations</p>' +
          r.invitations.map(function (inv) {
            return '<div class="flex items-center justify-between p-4 bg-secondary-container/30 rounded-xl">' +
              '<div><span class="font-body-md text-body-md text-on-surface font-semibold">' + esc(inv.groupName) + '</span>' +
              '<span class="block font-body-sm text-body-sm text-on-surface-variant">Invited by ' + esc(inv.inviterName) + '</span></div>' +
              '<div class="flex gap-2">' +
              '<button data-group-join="' + esc(inv.groupId) + '" data-action="accept" class="px-3 h-8 rounded-full bg-primary text-on-primary font-label-caps text-label-caps hover:opacity-90">Accept</button>' +
              '<button data-group-join="' + esc(inv.groupId) + '" data-action="decline" class="px-3 h-8 rounded-full bg-error-container text-on-error-container font-label-caps text-label-caps hover:opacity-90">Decline</button>' +
              '</div></div>';
          }).join('');
        groupInvEl.querySelectorAll('[data-group-join]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var gid = btn.getAttribute('data-group-join');
            var act = btn.getAttribute('data-action');
            apiGroup('group-join', { groupId: gid, action: act }).then(function (r2) {
              if (r2.ok) {
                ksToast(act === 'accept' ? 'Joined group!' : 'Declined');
                loadGroups();
                loadGroupInvitations();
              } else {
                ksToast(r2.error || 'Failed');
              }
            });
          });
        });
      });
    }

    if (groupCreateBtn) groupCreateBtn.addEventListener('click', openCreateGroupSheet);
    loadGroups();
    loadGroupInvitations();
  }

  /* ---- Share recipe to group (from recipe details) ---- */
  window.ksShareRecipeToGroup = function (recipeId) {
    if (!currentUser()) { ksToast('Please log in'); return; }
    apiGroup('group-list').then(function (r) {
      if (!r.ok || !r.groups || !r.groups.length) {
        ksToast('Create a group first to share recipes');
        return;
      }
      var groups = r.groups;
      var host = document.createElement('div');
      host.id = 'ks-share-group-sheet';
      host.className = 'fixed inset-0 z-[75]';
      var listHTML = groups.map(function (g) {
        return '<button data-share-group="' + esc(g.id) + '" class="flex items-center gap-4 w-full p-4 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors text-left">' +
          '<div class="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center"><span class="material-symbols-outlined">group</span></div>' +
          '<span class="font-body-md text-body-md text-on-surface font-semibold">' + esc(g.name) + '</span>' +
          '</button>';
      }).join('');
      host.innerHTML =
        '<div class="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"></div>' +
        '<div class="absolute inset-x-0 bottom-0 mx-auto max-w-lg bg-surface rounded-t-3xl shadow-[0px_-12px_32px_rgba(66,88,66,0.08)] slide-up px-container-margin pt-4 pb-8">' +
        '<div class="flex items-center justify-between mb-5">' +
        '<h2 class="font-headline-md text-headline-md text-on-surface">Share to Group</h2>' +
        '<button class="text-on-surface-variant hover:text-primary p-2 rounded-full transition-colors" data-ks-close><span class="material-symbols-outlined">close</span></button>' +
        '</div>' +
        '<div class="flex flex-col gap-2">' + listHTML + '</div>' +
        '</div>';
      document.body.appendChild(host);
      document.body.style.overflow = 'hidden';
      function closeSheet() { host.remove(); document.body.style.overflow = ''; }
      host.querySelector('[data-ks-close]').addEventListener('click', closeSheet);
      host.querySelector('.absolute.inset-0').addEventListener('click', closeSheet);
      host.querySelectorAll('[data-share-group]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var gid = btn.getAttribute('data-share-group');
          apiGroup('group-share-recipe', { groupId: gid, recipeId: recipeId }).then(function (r2) {
            if (r2.ok) {
              var gname = groups.find(function (g) { return g.id === gid; });
              ksToast('Shared to ' + (gname ? gname.name : 'group'));
              closeSheet();
            } else {
              ksToast(r2.error || 'Failed to share');
            }
          });
        });
      });
    });
  };
