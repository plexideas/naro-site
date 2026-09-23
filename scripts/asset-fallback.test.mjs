import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./asset-fallback.js', import.meta.url), 'utf8');
function setup(origin = 'https://naro.tools') {
  let onError;
  runInNewContext(source, {
    location: new URL(origin),
    document: { baseURI: origin + '/ru/index.html' },
    window: { addEventListener(name, handler, capture) {
      assert.equal(name, 'error');
      assert.equal(capture, true);
      onError = handler;
    } },
    URL,
  });
  return onError;
}
function resource(tagName, attributes) {
  return {
    tagName, rel: attributes.rel, attributes: { ...attributes }, replacement: null,
    getAttribute(name) { return this.attributes[name]; },
    setAttribute(name, value) { this.attributes[name] = value; },
    cloneNode() { return resource(this.tagName, this.attributes); },
    replaceWith(element) { this.replacement = element; },
  };
}

test('failed localized styles, images and scripts retry once on the same Netlify site', () => {
  const onError = setup();
  for (const [tag, attr, path] of [
    ['LINK', 'href', '../styles.css'],
    ['IMG', 'src', '../assets/naro-window-ru.png'],
    ['SCRIPT', 'src', '../analytics.js'],
    ['SCRIPT', 'src', '/stats.mjs'],
  ]) {
    const element = resource(tag, { [attr]: path, rel: 'stylesheet', id: 'original', type: 'module' });
    onError({ target: element });
    assert.equal(element.replacement.attributes[attr], 'https://naro-app.netlify.app' + new URL(path, 'https://naro.tools/ru/').pathname);
    assert.equal(element.replacement.attributes.id, 'original');
    assert.equal(element.replacement.attributes.type, 'module');
    onError({ target: element.replacement });
    assert.equal(element.replacement.replacement, null);
  }
});

test('fallback does not redirect API requests, external resources or local previews', () => {
  assert.equal(setup('http://localhost:8891'), undefined);
  assert.equal(setup('https://naro-app.netlify.app'), undefined);
  const onError = setup();
  for (const path of ['/api/analytics', 'https://example.com/styles.css', '/unrecognized.js']) {
    const element = resource('SCRIPT', { src: path });
    onError({ target: element });
    assert.equal(element.replacement, null);
  }
  onError({ target: {} });
});
