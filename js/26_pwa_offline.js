/* KitchenShare - pwa_offline | module 26/26 | classic script, loads in filename order */
"use strict";
/* §23 PWA & Offline Capability: registers sw.js (precache + stale-while-
 * revalidate static cache, network-first API fallback) and surfaces
 * online/offline transitions as toasts. Writes queue in localStorage and
 * flush on the next save, so offline edits are never lost. */

(function () {
  if (window.location.protocol === 'file:') return;

  /* manifest link (idempotent) */
  if (!document.querySelector('link[rel="manifest"]')) {
    var link = document.createElement('link');
    link.rel = 'manifest';
    link.href = 'manifest.webmanifest';
    document.head.appendChild(link);
  }

  function onlineToast() { try { ksToast('Online'); } catch (e) {} }
  window.addEventListener('offline', function () { try { ksToast('Offline'); } catch (e) {} });
  window.addEventListener('online', onlineToast);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
