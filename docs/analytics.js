(() => {
  if (!['naro.tools', 'www.naro.tools', 'naro-app.netlify.app'].includes(location.hostname)) return;
  function send(event) {
    try {
      if (navigator.sendBeacon?.('/api/analytics/event', event)) return;
      fetch('/api/analytics/event', { method: 'POST', body: event, keepalive: true }).catch(() => {});
    } catch {}
  }
  function visit() {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', visit);
    send('visit');
  }
  if (document.visibilityState === 'visible') visit();
  else document.addEventListener('visibilitychange', visit);
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    const url = new URL(link.href);
    if (url.origin === 'https://github.com' && /^\/plexideas\/naro\/releases\/(latest\/?|download\/.+\.(dmg|zip))$/.test(url.pathname)) send('download');
  });
})();
