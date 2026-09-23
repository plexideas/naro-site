(() => {
  if (!['naro.tools', 'www.naro.tools'].includes(location.hostname)) return;
  window.addEventListener('error', (event) => {
    const element = event.target;
    if (!['IMG', 'LINK', 'SCRIPT'].includes(element?.tagName)) return;
    if (element.tagName === 'LINK' && element.rel !== 'stylesheet') return;
    const attribute = element.tagName === 'LINK' ? 'href' : 'src';
    const source = element.getAttribute(attribute);
    if (!source) return;
    const url = new URL(source, document.baseURI);
    if (url.origin !== location.origin) return;
    if (!/^\/(assets\/[^?#]+|styles\.css|motion\.css|stats\.css|language\.js|analytics\.js|stats\.mjs)$/.test(url.pathname)) return;
    url.host = 'naro-app.netlify.app';
    const replacement = element.cloneNode(false);
    replacement.setAttribute(attribute, url.href);
    element.replaceWith(replacement);
  }, true);
})();
