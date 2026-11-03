'use strict';

const API_URL = 'https://openlibrary.org/search.json';
const STORAGE_KEY = 'little-personal-library-v1';
const VIEW_STORAGE_KEY = 'little-personal-library-view';
const PAGE_SIZE = 9;
const STATUSES = { want: 'Want to read', reading: 'Reading', finished: 'Finished' };
const $ = (selector) => document.querySelector(selector);
const results = $('#results');
const shelfElement = $('#collection');
const searchStatus = $('#search-status');
const shelfStatus = $('#collection-status');
const pagination = $('.pagination');
const cache = new Map();
let shelf = [];
let books = [];
let query = '';
let page = 1;
let totalPages = 1;
let controller;
let lastRequestAt = 0;

function validBook(book) {
  return book && typeof book.key === 'string' && /^\/works\/OL\d+W$/.test(book.key) && typeof book.title === 'string';
}

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (Array.isArray(saved)) {
    shelf = saved.filter(validBook)
      .filter((book, index, list) => list.findIndex((item) => item.key === book.key) === index)
      .map((book) => ({ ...book, status: Object.hasOwn(STATUSES, book.status) ? book.status : 'want' }));
  }
} catch {
  shelfStatus.textContent = 'Saving is unavailable. Your shelf will work for this visit.';
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function isSaved(key) {
  return shelf.some((book) => book.key === key);
}

function saveShelf(message) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shelf));
    shelfStatus.textContent = `${message} Saved in this browser.`;
  } catch {
    shelfStatus.textContent = `${message} Could not save changes; they will last for this visit only.`;
  }
}

function createCard(book, onShelf = false) {
  const card = element('article', 'book-card');
  card.style.setProperty('--book-transition', `book-${onShelf ? 'shelf' : 'search'}-${book.key.split('/').pop()}`);
  const imageWrap = element('div', 'image-wrap');
  const fallback = () => imageWrap.replaceChildren(element('span', 'image-fallback', 'No cover available'));
  if (Number.isInteger(book.cover_i) && book.cover_i > 0) {
    const image = document.createElement('img');
    image.src = `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg?default=false`;
    image.alt = `Cover of ${book.title}`;
    image.loading = 'lazy';
    image.addEventListener('error', fallback, { once: true });
    imageWrap.append(image);
  } else fallback();

  const body = element('div', 'card-body');
  const authors = Array.isArray(book.author_name) ? book.author_name.filter((name) => typeof name === 'string').join(', ') : '';
  body.append(element('h3', '', book.title), element('p', 'author', authors || 'Author unknown'),
    element('p', 'date', book.first_publish_year ? `First published ${book.first_publish_year}` : 'Publication year unavailable'));

  if (onShelf) {
    const select = document.createElement('select');
    select.id = `status-${book.key.split('/').pop()}`;
    const label = element('label', '', 'Reading status');
    label.htmlFor = select.id;
    select.setAttribute('aria-label', `Reading status for ${book.title}`);
    for (const [value, text] of Object.entries(STATUSES)) {
      const option = element('option', '', text);
      option.value = value;
      select.append(option);
    }
    select.value = book.status;
    select.addEventListener('change', () => {
      const saved = shelf.find((item) => item.key === book.key);
      saved.status = select.value;
      saveShelf(`Status updated for ${book.title}.`);
      if ($('#shelf-filter').value !== 'all') {
        renderShelf();
        $('#shelf-filter').focus();
      }
    });
    body.append(label, select);
  }

  const actions = element('div', 'card-actions');
  const link = element('a', '', 'View book ↗');
  link.href = `https://openlibrary.org${book.key}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `View ${book.title} on Open Library (opens a new tab)`);
  const button = element('button', '', onShelf ? 'Remove' : isSaved(book.key) ? 'On your shelf' : 'Add to shelf');
  button.type = 'button';
  button.setAttribute('aria-label', `${onShelf ? 'Remove' : 'Add'} ${book.title} ${onShelf ? 'from' : 'to'} your shelf`);
  if (!onShelf) button.setAttribute('aria-disabled', String(isSaved(book.key)));
  button.addEventListener('click', () => {
    if (onShelf) {
      shelf = shelf.filter((item) => item.key !== book.key);
      saveShelf(`${book.title} removed.`);
    } else {
      if (isSaved(book.key)) return;
      shelf.push({ ...book, status: 'want' });
      saveShelf(`${book.title} added to Want to read.`);
    }
    renderShelf();
    updateSearchButtons();
    if (onShelf) (shelfElement.querySelector('button') || $('#shelf-filter')).focus();
  });
  actions.append(link, button);
  body.append(actions);
  card.append(imageWrap, body);
  return card;
}

function renderShelf() {
  const filter = $('#shelf-filter').value;
  const visible = shelf.filter((book) => filter === 'all' || book.status === filter);
  shelfElement.replaceChildren(...visible.map((book) => createCard(book, true)));
  if (!visible.length) shelfElement.append(element('p', 'empty-message', shelf.length ? 'No books with this reading status yet.' : 'Your shelf is empty. Search below to add your first book.'));
  $('#collection-count').textContent = `${shelf.length} ${shelf.length === 1 ? 'book' : 'books'}`;
  $('#clear-collection').disabled = shelf.length === 0;
}

function updateSearchButtons() {
  results.querySelectorAll('article').forEach((card, index) => {
    const saved = isSaved(books[index].key);
    const button = card.querySelector('button');
    button.textContent = saved ? 'On your shelf' : 'Add to shelf';
    button.setAttribute('aria-disabled', String(saved));
  });
}

async function loadBooks() {
  controller?.abort();
  const request = new AbortController();
  controller = request;
  let timeout;
  searchStatus.textContent = 'Finding books…';
  results.replaceChildren();
  results.setAttribute('aria-busy', 'true');
  pagination.hidden = true;
  $('#retry').hidden = true;
  try {
    const cacheKey = JSON.stringify([query, page]);
    let payload = cache.get(cacheKey);
    if (!payload) {
      // Unidentified Open Library requests are limited to one per second.
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, 1100 - (Date.now() - lastRequestAt))));
      if (request.signal.aborted) return;
      lastRequestAt = Date.now();
      timeout = setTimeout(() => request.abort(), 15000);
      const url = new URL(API_URL);
      url.search = new URLSearchParams({ q: query, limit: String(PAGE_SIZE), page: String(page), fields: 'key,title,author_name,cover_i,first_publish_year' });
      const response = await fetch(url, { signal: request.signal });
      if (!response.ok) throw new Error(response.status === 429 ? 'rate-limit' : 'request');
      payload = await response.json();
      if (!Array.isArray(payload.docs) || !Number.isFinite(payload.numFound)) throw new Error('Unexpected response');
      cache.set(cacheKey, payload);
      if (cache.size > 30) cache.delete(cache.keys().next().value);
    }
    if (controller !== request) return;
    books = payload.docs.filter(validBook);
    totalPages = Math.max(1, Math.ceil(payload.numFound / PAGE_SIZE));
    results.replaceChildren(...books.map((book) => createCard(book)));
    searchStatus.textContent = books.length ? `${payload.numFound.toLocaleString()} results for “${query}”` : 'No books found. Try another title or author.';
    $('#page-number').textContent = `Page ${page} of ${totalPages}`;
    $('#previous').disabled = page <= 1;
    $('#next').disabled = page >= totalPages;
    pagination.hidden = totalPages <= 1;
  } catch (error) {
    if (controller !== request) return;
    searchStatus.textContent = request.signal.aborted ? 'The search took too long. Please try again.'
      : error.message === 'rate-limit' ? 'Too many requests. Please wait a moment and try again.'
      : 'Couldn’t load books. Check your connection and try again.';
    $('#retry').hidden = false;
  } finally {
    clearTimeout(timeout);
    if (controller === request) results.setAttribute('aria-busy', 'false');
  }
}

function clearSearchResults() {
  controller?.abort();
  controller = null;
  query = '';
  page = 1;
  totalPages = 1;
  books = [];
  results.replaceChildren();
  results.setAttribute('aria-busy', 'false');
  pagination.hidden = true;
  $('#page-number').textContent = '';
  $('#retry').hidden = true;
  searchStatus.textContent = 'Search for a title or author to get started.';
}

// The input event covers typing, deleting, and the native search clear button.
$('#search-input').addEventListener('input', () => {
  if (!$('#search-input').value.trim()) clearSearchResults();
});

$('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const term = $('#search-input').value.trim();
  if (!term) { searchStatus.textContent = 'Enter a title or author to search.'; return; }
  query = term;
  page = 1;
  loadBooks();
});
$('#previous').addEventListener('click', () => { if (page > 1) { page--; loadBooks(); } });
$('#next').addEventListener('click', () => { if (page < totalPages) { page++; loadBooks(); } });
$('#retry').addEventListener('click', loadBooks);
$('#shelf-filter').addEventListener('change', renderShelf);
$('#clear-collection').addEventListener('click', () => {
  if (!window.confirm('Remove all books from your shelf?')) return;
  shelf = [];
  saveShelf('Shelf cleared.');
  renderShelf();
  updateSearchButtons();
  $('#search-input').focus();
});
// Changing layout preserves existing cards, form values, and search results.
function setView(view) {
  const selected = view === 'list' ? 'list' : 'cards';
  $('.library-app').setAttribute('data-view', selected);
  $('#card-view').setAttribute('aria-pressed', String(selected === 'cards'));
  $('#list-view').setAttribute('aria-pressed', String(selected === 'list'));
  try { localStorage.setItem(VIEW_STORAGE_KEY, selected); } catch { /* Still works for this visit. */ }
}

function changeView(view) {
  if ($('.library-app').getAttribute('data-view') === view) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduceMotion) { setView(view); return; }
  document.documentElement.classList.add('view-changing');
  const transition = document.startViewTransition(() => setView(view));
  transition.finished.catch(() => {}).finally(() => {
    document.documentElement.classList.remove('view-changing');
  });
}
$('#card-view').addEventListener('click', () => changeView('cards'));
$('#list-view').addEventListener('click', () => changeView('list'));

// Theme preference is separate from the saved shelf and view.
const THEME_KEY = 'little-personal-library-theme';
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('#theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* Keep working without storage. */ }
}
let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
try {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') theme = stored;
} catch { /* Use system preference. */ }
setTheme(theme);
$('#theme-toggle').addEventListener('click', () => {
  setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});
let initialView = 'cards';
try { initialView = localStorage.getItem(VIEW_STORAGE_KEY) || 'cards'; } catch { /* Use the default. */ }
setView(initialView);

renderShelf();
searchStatus.textContent = 'Search for a title or author to get started.';
