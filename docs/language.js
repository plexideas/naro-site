(() => {
  const supported = new Set(['en', 'ru', 'zh', 'ko', 'ja', 'es', 'de', 'it', 'fr']);
  const storageKey = 'naro.language';
  const normalize = value => {
    const base = String(value || '').toLowerCase().split(/[-_]/)[0];
    return supported.has(base) ? base : null;
  };
  const url = new URL(location.href);
  const segments = url.pathname.split('/').filter(Boolean);
  const explicitLanguage = supported.has(segments[0]);
  const page = segments[0] || '';
  const publicPage = segments.length <= 1 && /^(index(?:\.html)?|guides(?:\.html)?|privacy(?:\.html)?|terms(?:\.html)?)?$/.test(page);
  if (!explicitLanguage && publicPage) {
    let saved;
    try { saved = normalize(localStorage.getItem(storageKey)); } catch {}
    const detected = (navigator.languages || [navigator.language]).map(normalize).find(Boolean);
    const language = normalize(url.searchParams.get('lang')) || saved || detected || 'en';
    if (language !== 'en') {
      url.pathname = '/' + language + '/' + (page.startsWith('index') ? '' : page);
      location.replace(url.href);
      return;
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const menu = document.querySelector('.languages');
    if (!menu) return;
    menu.addEventListener('click', event => {
      const link = event.target.closest('a[hreflang]');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const language = normalize(link.hreflang);
      if (!language) return;
      let remembered = false;
      try {
        localStorage.setItem(storageKey, language);
        remembered = localStorage.getItem(storageKey) === language;
      } catch {}
      const target = new URL(link.href);
      target.search = location.search;
      target.hash = location.hash;
      target.searchParams.delete('lang');
      if (!remembered && language === 'en') target.searchParams.set('lang', 'en');
      link.href = target.href;
    });
    document.addEventListener('click', event => {
      if (!menu.contains(event.target)) menu.open = false;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
  });
})();
