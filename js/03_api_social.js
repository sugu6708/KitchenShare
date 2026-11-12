/* KitchenShare - api_social | module 03/22 | classic script, loads in filename order */
"use strict";
  /* ---------------- Shared directory (optional server.py) ---------------- */

  var KS_API_BASE = 'api/';
  var KS_SERVER_AVAILABLE = false;
  /* CSRF mitigation: every API POST carries this custom header. Cross-site
   * pages cannot set it without a CORS preflight, which server.py refuses. */
  var KS_FETCH_HEADERS = { 'Content-Type': 'application/json', 'X-Requested-With': 'KSFetch' };
  function serverApi(action, data) {
    if (window.location.protocol === 'file:') return Promise.resolve(null);
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 2500);
    var opts = { method: 'POST', headers: KS_FETCH_HEADERS, body: JSON.stringify(data || {}) };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(KS_API_BASE + action, opts)
      .then(function (r) {
        if (r.ok) KS_SERVER_AVAILABLE = true;
        return r.ok ? r.json().catch(function () { return null; }) : null;
      })
      .catch(function () { KS_SERVER_AVAILABLE = false; return null; })
      .then(function (res) { clearTimeout(timer); return res; });
  }

  function serverStatus() {
    return KS_SERVER_AVAILABLE;
  }

  /* =================== Image upload helpers =================== */
  /*
   * ksUploadImage(file) -> Promise<{id, filename, url, thumb_sm, thumb_md, thumb_lg}>
   * Uploads a File object to the server via multipart POST.
   * Falls back to FileReader data-URL if server unavailable.
   */
  function ksUploadImage(file) {
    if (!file || file.type.indexOf('image/') !== 0) {
      return Promise.reject(new Error('Not an image file'));
    }
    if (file.size > 10 * 1024 * 1024) {
      return Promise.reject(new Error('Image too large (10 MB max)'));
    }
    if (!KS_SERVER_AVAILABLE) {
      return new Promise(function (resolve) {
        var rd = new FileReader();
        rd.onload = function () { resolve({ id: null, url: null, dataUrl: String(rd.result || '') }); };
        rd.readAsDataURL(file);
      });
    }
    var fd = new FormData();
    fd.append('file', file, file.name);
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 30000) : null;
    var opts = { method: 'POST', headers: { 'X-Requested-With': 'KSFetch' }, body: fd };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(KS_API_BASE + 'upload-image', opts)
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (r) { clearTimeout(timer); return r; })
      .then(function (r) {
        if (r && r.ok && r.image) return r.image;
        return new Promise(function (resolve) {
          var rd = new FileReader();
          rd.onload = function () { resolve({ id: null, url: null, dataUrl: String(rd.result || '') }); };
          rd.readAsDataURL(file);
        });
      });
  }

  function ksDeleteImage(url) {
    if (!url || !url.indexOf || url.indexOf('data:') === 0) return Promise.resolve();
    return serverApi('delete-image', { url: url });
  }

  function ksDeleteImages(urls) {
    if (!urls || !urls.length) return Promise.resolve();
    var tasks = urls.filter(function (u) { return u && u.indexOf && u.indexOf('data:') !== 0; }).map(ksDeleteImage);
    return Promise.all(tasks);
  }

  /* =================== Video upload helpers =================== */
  /*
   * ksUploadVideo(file) -> Promise<{id, filename, url, thumb}>
   * Uploads a video File to the server. Validates type & size client-side.
   * 1-minute max duration enforced via the file input's capture hint
   * and server-side MAX_VIDEO_SIZE. Falls back to objectURL if server unavailable.
   */
  var KS_MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
  var KS_ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];

  function ksUploadVideo(file) {
    if (!file || KS_ALLOWED_VIDEO_TYPES.indexOf(file.type) === -1) {
      return Promise.reject(new Error('Not a video file (MP4, WebM, MOV, OGG only)'));
    }
    if (file.size > KS_MAX_VIDEO_SIZE) {
      return Promise.reject(new Error('Video too large (50 MB max)'));
    }
    if (!KS_SERVER_AVAILABLE) {
      return new Promise(function (resolve) {
        var url = URL.createObjectURL(file);
        resolve({ id: null, url: null, objectURL: url });
      });
    }
    var fd = new FormData();
    fd.append('file', file, file.name);
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 60000) : null;
    var opts = { method: 'POST', headers: { 'X-Requested-With': 'KSFetch' }, body: fd };
    if (ctrl) opts.signal = ctrl.signal;
    return fetch(KS_API_BASE + 'upload-video', opts)
      .then(function (r) { return r.json(); })
      .catch(function () { return null; })
      .then(function (r) { clearTimeout(timer); return r; })
      .then(function (r) {
        if (r && r.ok && r.video) return r.video;
        return new Promise(function (resolve) {
          var url = URL.createObjectURL(file);
          resolve({ id: null, url: null, objectURL: url });
        });
      });
  }

  function ksDeleteVideo(url) {
    if (!url || !url.indexOf || url.indexOf('data:') === 0 || url.indexOf('blob:') === 0) return Promise.resolve();
    return serverApi('delete-video', { url: url });
  }

  function ksDeleteVideos(urls) {
    if (!urls || !urls.length) return Promise.resolve();
    var tasks = urls.filter(function (u) { return u && u.indexOf && u.indexOf('data:') !== 0 && u.indexOf('blob:') !== 0; }).map(ksDeleteVideo);
    return Promise.all(tasks);
  }

  /* =================== Social API helpers =================== */
  function socialLike(postId) { return serverApi('like', { postId: postId }); }
  function socialUnlike(postId) { return serverApi('unlike', { postId: postId }); }
  function socialLikeStatus(postId) { return serverApi('like-status', { postId: postId }); }
  function socialLikeBatch(postIds) { return serverApi('like-batch', { postIds: postIds }); }
  function socialFollow(userId) { return serverApi('follow', { userId: userId }); }
  function socialUnfollow(userId) { return serverApi('unfollow', { userId: userId }); }
  function socialFollowStatus(userId) { return serverApi('follow-status', { userId: userId }); }
  function socialFollowers(userId) { return serverApi('followers', { userId: userId || '' }); }
  function socialFollowing(userId) { return serverApi('following', { userId: userId || '' }); }
  function socialPostComments(postId) { return serverApi('post-comments-list', { postId: postId }); }
  function socialSaveComment(postId, text) { return serverApi('post-comments-save', { postId: postId, text: text }); }
  function socialNotifications() { return serverApi('notifications-list', {}); }
  function socialMarkRead(ids) { return serverApi('notifications-read', { ids: ids || [] }); }
  function socialUnreadCount() { return serverApi('unread-count', {}); }
  function socialActivityFeed() { return serverApi('activity-feed', {}); }

  /* =================== DataStore: server-synced persistence =================== */
  /*
   * DS wraps localStorage as a local cache with server as source of truth.
   * Each write: optimistic localStorage + async server push + rollback on failure.
   * Each read: server-first, falls back to localStorage.
   * _ds_migrated flag tracks one-time migration.
   */
  /* Coalesced server pushes: leading edge fires immediately (single-action
   * latency unchanged), bursts inside the 600ms window collapse to one trailing push. */
