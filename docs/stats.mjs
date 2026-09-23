import { fetchReleases, summarize } from './download-stats.mjs';

const format = new Intl.NumberFormat('ru');
const refresh = document.querySelector('#refresh');

function text(id, value) { document.getElementById(id).textContent = value; }
function table(id, rows) {
  document.getElementById(id).replaceChildren(...rows.map((values) => {
    const row = document.createElement('tr');
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    });
    return row;
  }));
}

async function visits() {
  text('visits-status', 'Загружаю посещения…');
  try {
    const response = await fetch('/api/analytics', { cache: 'no-cache', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error();
    const data = await response.json();
    if (!Array.isArray(data.days) || data.days.length !== 30) throw new Error();
    const today = data.days.at(-1);
    const started = (data.startedAt || data.updatedAt).slice(0, 10);
    text('visitors', format.format(today.visitors));
    text('downloaders', format.format(today.downloads));
    text('conversion', today.visitors ? format.format(Math.round(today.downloads / today.visitors * 100)) + '%' : '—');
    table('days', data.days.filter(day => day.date >= started).reverse().map((day) => [
      day.date.split('-').reverse().join('.'),
      format.format(day.visitors),
      format.format(day.downloads),
    ]));
    text('collection-status', data.startedAt ? 'Сбор начат ' + new Date(data.startedAt).toLocaleString('ru') + '. Более ранних данных нет.' : 'Счётчик подключён. Данные появятся после первого визита.');
    text('visits-status', 'Обновлено: ' + new Date(data.updatedAt).toLocaleString('ru') + '. Данные могут отставать на минуту.');
  } catch {
    text('visits-status', 'Не удалось загрузить посещения. Попробуйте обновить. Если цифры показаны ниже, это предыдущие данные.');
  }
}

async function downloads() {
  text('downloads-status', 'Загружаю скачивания…');
  try {
    const data = summarize(await fetchReleases());
    text('dmg-count', format.format(data.dmg));
    text('zip-count', format.format(data.zip));
    table('releases', data.rows.map((row) => [row.version, format.format(row.dmg), format.format(row.zip)]));
    text('downloads-status', 'GitHub · ' + new Date().toLocaleString('ru'));
  } catch {
    text('downloads-status', 'GitHub временно недоступен или ограничил запросы. Повторите позже. Если цифры показаны ниже, это предыдущие данные.');
  }
}

async function load() {
  refresh.disabled = true;
  try { await Promise.allSettled([visits(), downloads()]); }
  finally { refresh.disabled = false; }
}
refresh.addEventListener('click', load);
load();
