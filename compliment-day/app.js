const quoteButton = document.querySelector('#quote');
const copyHint = document.querySelector('#copy-hint');
const credit = document.querySelector('#credit');
const author = document.querySelector('#author');
const translator = document.querySelector('#translator');
const work = document.querySelector('#work');
const countdown = document.querySelector('#countdown');
const telegram = document.querySelector('#telegram');

let config;
let currentDay;
let currentText;
let loadingDay;

function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function dayNumber(value) {
  return Date.parse(`${value}T00:00:00Z`) / 86400000;
}

function selectCollection(day) {
  const available = config.collections
    .filter((entry) => entry.start_date <= day)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  if (!available.length) {
    throw new Error('Подборка ещё не началась');
  }
  return available[0];
}

async function showQuote(day) {
  if (loadingDay === day) return;
  loadingDay = day;
  try {
    const collection = selectCollection(day);
    const response = await fetch(collection.file, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Не удалось загрузить подборку');
    }
    const quotes = await response.json();
    if (quotes.length !== collection.count) {
      throw new Error('Неверное количество комплиментов');
    }
    const index = (dayNumber(day) - dayNumber(collection.start_date)) % quotes.length;
    const quote = quotes[index];
    currentText = quote.text;
    quoteButton.textContent = currentText;
    quoteButton.disabled = false;
    author.textContent = quote.author;
    translator.textContent = quote.translator ? `Перевод ${quote.translator}` : '';
    translator.hidden = !quote.translator;
    work.textContent = quote.work;
    credit.hidden = false;
    copyHint.textContent = 'Нажмите на строку, чтобы скопировать';
    currentDay = day;
  } finally {
    loadingDay = undefined;
  }
}

async function copyQuote() {
  if (!currentText) return;
  try {
    await navigator.clipboard.writeText(currentText);
    copyHint.textContent = 'Скопировано';
  } catch {
    copyHint.textContent = 'Не удалось скопировать. Выделите строку вручную';
  }
}

function updateCountdown() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const seconds = Math.max(0, Math.ceil((next - now.getTime()) / 1000));
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const remainder = String(seconds % 60).padStart(2, '0');
  countdown.textContent = `${hours}:${minutes}:${remainder}`;
  const day = utcDay(now);
  if (config && day !== currentDay) {
    showQuote(day).catch(showError);
  }
}

function showError() {
  quoteButton.textContent = 'Комплимент скоро появится';
  quoteButton.disabled = true;
  credit.hidden = true;
  copyHint.textContent = 'Попробуйте обновить страницу';
}

async function start() {
  const response = await fetch('config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Не удалось загрузить настройки');
  config = await response.json();
  if (config.bot_username) {
    telegram.href = `https://t.me/${config.bot_username}?start=site`;
    telegram.hidden = false;
  }
  await showQuote(utcDay());
}

quoteButton.addEventListener('click', copyQuote);
updateCountdown();
setInterval(updateCountdown, 1000);
start().catch(showError);
