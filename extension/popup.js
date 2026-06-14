// ============================================================
// FotoScout Extension Popup v2
// ============================================================

let currentMode = 'location'; // 'location' | 'inspiration' | 'existing'
let compressedImage = '';
let sourceUrl = '';
let knownPosts = [];     // synced post index from data.json
let selectedPostId = null; // for "existing" mode

// GitHub config
const GH_REPO = 'johnnybk213-sudo/fotoscout';
const GH_BRANCH = 'main';
let ghToken = '';

// --- Init ---
async function init() {
  // Load synced posts
  const stored = await chrome.storage.local.get(['fotoscout-posts', 'fotoscout-synk-time']);
  knownPosts = stored['fotoscout-posts'] || [];

  // Check if opened from context menu (has pendingImage)
  const result = await chrome.storage.local.get('pendingImage');
  if (result.pendingImage) {
    const pending = result.pendingImage;
    sourceUrl = pending.srcUrl;
    await loadAndCompressImage(pending.srcUrl);

    if (pending.pageTitle) {
      document.getElementById('f-name').value = pending.pageTitle;
      document.getElementById('f-title').value = pending.pageTitle;
    }

    await chrome.storage.local.remove('pendingImage');
  }

  // Load GitHub token
  const tokenResult = await chrome.storage.local.get('fotoscout-gh-token');
  ghToken = tokenResult['fotoscout-gh-token'] || '';
  updateGhStatus();

  setupDawaAutocomplete();
  setupEventListeners();
  updatePendingCount();
}

// --- Event listeners (no inline handlers allowed in extensions) ---
function setupEventListeners() {
  document.getElementById('btnNavForm').addEventListener('click', () => showView('form'));
  document.getElementById('btnNavList').addEventListener('click', () => showView('list'));
  document.getElementById('modeLocBtn').addEventListener('click', () => setMode('location'));
  document.getElementById('modeInspBtn').addEventListener('click', () => setMode('inspiration'));
  document.getElementById('modeExistBtn').addEventListener('click', () => setMode('existing'));
  document.getElementById('postSearch').addEventListener('input', filterPosts);
  document.getElementById('btnGeocode').addEventListener('click', geocodeArea);
  document.getElementById('btnClear').addEventListener('click', clearForm);
  document.getElementById('btnSave').addEventListener('click', saveItem);
  document.getElementById('btnExport').addEventListener('click', exportPending);
  document.getElementById('btnClearAll').addEventListener('click', clearAll);
  document.getElementById('btnSettings').addEventListener('click', toggleSettings);
  document.getElementById('btnSaveToken').addEventListener('click', saveGhToken);
}

// --- Image handling ---
async function loadAndCompressImage(url) {
  const preview = document.getElementById('imagePreview');
  preview.innerHTML = '<div class="placeholder">Indlæser billede...</div>';

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    compressedImage = await compressImage(blob, 600, 0.8);
    preview.innerHTML = '<img src="' + compressedImage + '" alt="Preview">';
  } catch (err) {
    console.error('Kunne ikke hente billede:', err);
    compressedImage = url;
    preview.innerHTML = '<img src="' + url + '" alt="Preview">';
  }
}

function compressImage(blob, maxWidth, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(URL.createObjectURL(blob));
    img.src = URL.createObjectURL(blob);
  });
}

// --- Mode selector ---
function setMode(mode) {
  currentMode = mode;
  selectedPostId = null;

  document.getElementById('modeLocBtn').className = 'mode-btn' + (mode === 'location' ? ' active-loc' : '');
  document.getElementById('modeInspBtn').className = 'mode-btn' + (mode === 'inspiration' ? ' active-insp' : '');
  document.getElementById('modeExistBtn').className = 'mode-btn' + (mode === 'existing' ? ' active-existing' : '');

  document.getElementById('fields-location').style.display = mode === 'location' ? 'block' : 'none';
  document.getElementById('fields-inspiration').style.display = mode === 'inspiration' ? 'block' : 'none';
  document.getElementById('fields-existing').style.display = mode === 'existing' ? 'block' : 'none';
  document.getElementById('fields-shared').style.display = mode === 'existing' ? 'none' : 'block';
  document.getElementById('formFooter').style.display = mode === 'existing' ? 'none' : 'flex';

  if (mode === 'existing') renderPostList();
}

// --- Existing post picker ---
function renderPostList() {
  const list = document.getElementById('postList');
  const searchEl = document.getElementById('postSearch');
  const query = (searchEl ? searchEl.value : '').toLowerCase();

  if (knownPosts.length === 0) {
    list.innerHTML = '<div class="no-posts">Ingen posts synkroniseret.<br>Klik <strong>Synk</strong> og v\u00e6lg din data.json.</div>';
    return;
  }

  const filtered = query
    ? knownPosts.filter(p => p.name.toLowerCase().includes(query))
    : knownPosts;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-posts">Ingen resultater for "' + esc(query) + '"</div>';
    return;
  }

  list.innerHTML = filtered.map(p => {
    const icon = p.type === 'location' ? '\ud83d\udccd' : '\ud83d\udcf8';
    const typeLabel = p.type === 'location' ? 'Lok' : 'Insp';
    return '<div class="post-item" data-post-id="' + esc(p.id) + '" data-post-name="' + esc(p.name) + '">' +
      '<span class="post-icon">' + icon + '</span>' +
      '<span class="post-name">' + esc(p.name) + '</span>' +
      '<span class="post-type">' + typeLabel + '</span>' +
      '</div>';
  }).join('');

  // Add click listeners
  list.querySelectorAll('.post-item').forEach(el => {
    el.addEventListener('click', () => {
      addToExisting(el.dataset.postId, el.dataset.postName);
    });
  });
}

function filterPosts() {
  renderPostList();
}

async function addToExisting(postId, postName) {
  if (!compressedImage) {
    showToast('Intet billede at tilf\u00f8je');
    return;
  }

  const item = {
    action: 'add-photo',
    targetPostId: postId,
    targetName: postName,
    photo: compressedImage,
    sourceUrl,
    created: new Date().toISOString().split('T')[0]
  };

  const result = await chrome.storage.local.get('fotoscout-pending');
  const pending = result['fotoscout-pending'] || [];
  pending.push(item);
  await chrome.storage.local.set({ 'fotoscout-pending': pending });

  showToast('Tilf\u00f8jet til ' + postName);
  updatePendingCount();

  compressedImage = '';
  sourceUrl = '';
  document.getElementById('imagePreview').innerHTML = '<div class="placeholder">Gemt! H\u00f8jreklik et nyt billede.</div>';
}

// --- Geocode area (Nominatim — for city/place names) ---
async function geocodeArea() {
  const input = document.getElementById('f-area');
  const coordsEl = document.getElementById('f-coords-insp');
  if (!input.value.trim()) return;

  coordsEl.textContent = 'S\u00f8ger...';
  coordsEl.style.color = '';
  try {
    const q = input.value.trim() + ', Danmark';
    const res = await fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(q) + '&format=json&limit=1&accept-language=da');
    const results = await res.json();
    if (results.length > 0) {
      const r = results[0];
      document.getElementById('f-lat-insp').value = parseFloat(r.lat).toFixed(6);
      document.getElementById('f-lon-insp').value = parseFloat(r.lon).toFixed(6);
      coordsEl.textContent = '\u2713 ' + parseFloat(r.lat).toFixed(4) + ', ' + parseFloat(r.lon).toFixed(4);
      coordsEl.style.color = 'var(--success)';
    } else {
      coordsEl.textContent = 'Ingen resultater fundet';
      coordsEl.style.color = 'var(--danger)';
    }
  } catch {
    coordsEl.textContent = 'Geocoding fejlede';
    coordsEl.style.color = 'var(--danger)';
  }
}

// Auto-geocode via Nominatim when no coordinates provided
async function autoGeocode(text) {
  try {
    const q = text + ', Danmark';
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=da`);
    const results = await res.json();
    if (results.length > 0) {
      return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
    }
  } catch {}
  return null;
}

// --- DAWA Autocomplete ---
let dawaTimer = null;

function setupDawaAutocomplete() {
  const input = document.getElementById('f-address');
  const list = document.getElementById('dawaList');

  input.addEventListener('input', () => {
    clearTimeout(dawaTimer);
    const query = input.value.trim();
    if (query.length < 2) { list.classList.remove('open'); return; }

    dawaTimer = setTimeout(async () => {
      try {
        const res = await fetch('https://api.dataforsyningen.dk/adresser/autocomplete?q=' + encodeURIComponent(query) + '&per_side=6');
        const results = await res.json();
        if (results.length > 0) {
          list.innerHTML = results.map(r =>
            '<div class="autocomplete-item" data-text="' + esc(r.tekst) + '" data-id="' + r.adresse.id + '">' + esc(r.tekst) + '</div>'
          ).join('');
          list.classList.add('open');
        } else {
          list.classList.remove('open');
        }
      } catch {
        list.classList.remove('open');
      }
    }, 250);
  });

  list.addEventListener('click', async (e) => {
    const item = e.target.closest('.autocomplete-item');
    if (!item || !item.dataset.id) return;

    input.value = item.dataset.text;
    list.classList.remove('open');

    const coordsEl = document.getElementById('f-coords-loc');
    coordsEl.textContent = 'Henter koordinater...';

    try {
      const res = await fetch('https://api.dataforsyningen.dk/adresser/' + item.dataset.id);
      const addr = await res.json();
      if (addr.adgangsadresse && addr.adgangsadresse.adgangspunkt && addr.adgangsadresse.adgangspunkt.koordinater) {
        const coords = addr.adgangsadresse.adgangspunkt.koordinater;
        const lon = coords[0], lat = coords[1];
        document.getElementById('f-lat-loc').value = lat.toFixed(6);
        document.getElementById('f-lon-loc').value = lon.toFixed(6);
        coordsEl.textContent = '\u2713 ' + lat.toFixed(4) + ', ' + lon.toFixed(4);
        coordsEl.style.color = 'var(--success)';
      }
    } catch {
      coordsEl.textContent = 'Kunne ikke hente koordinater';
      coordsEl.style.color = 'var(--danger)';
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrap')) {
      list.classList.remove('open');
    }
  });
}

// --- Save (new posts only) ---
async function saveItem() {
  let item;

  if (currentMode === 'location') {
    const name = document.getElementById('f-name').value.trim();
    const address = document.getElementById('f-address').value.trim();
    if (!name || !address) { showToast('Udfyld navn og adresse'); return; }

    let lat = parseFloat(document.getElementById('f-lat-loc').value) || null;
    let lon = parseFloat(document.getElementById('f-lon-loc').value) || null;
    if (!lat || !lon) {
      const coords = await autoGeocode(address);
      if (coords) { lat = coords.lat; lon = coords.lon; }
    }

    item = {
      type: 'location',
      id: 'loc-' + Date.now(),
      name,
      address,
      lat, lon,
      notes: document.getElementById('f-notes').value.trim(),
      photos: compressedImage ? [compressedImage] : [],
      tags: document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      created: new Date().toISOString().split('T')[0],
      sourceUrl
    };
  } else if (currentMode === 'inspiration') {
    const title = document.getElementById('f-title').value.trim();
    const area = document.getElementById('f-area').value.trim();
    if (!title || !area) { showToast('Udfyld titel og omr\u00e5de'); return; }

    let lat = parseFloat(document.getElementById('f-lat-insp').value) || null;
    let lon = parseFloat(document.getElementById('f-lon-insp').value) || null;
    if (!lat || !lon) {
      const coords = await autoGeocode(area);
      if (coords) { lat = coords.lat; lon = coords.lon; }
    }

    item = {
      type: 'inspiration',
      id: 'insp-' + Date.now(),
      title,
      area,
      lat, lon,
      notes: document.getElementById('f-notes').value.trim(),
      photo: compressedImage || '',
      tags: document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      created: new Date().toISOString().split('T')[0],
      sourceUrl
    };
  }

  // Push directly to GitHub if token is set
  if (ghToken) {
    showToast('Uploader til GitHub...');
    const ok = await pushToGitHub(item);
    if (ok) {
      showToast('Gemt og publiceret!');
      clearForm();
      return;
    }
    // Fall through to local save if GitHub fails
  }

  // Fallback: save locally
  const result = await chrome.storage.local.get('fotoscout-pending');
  const pending = result['fotoscout-pending'] || [];
  pending.push(item);
  await chrome.storage.local.set({ 'fotoscout-pending': pending });

  showToast(ghToken ? 'GitHub fejlede — gemt lokalt' : 'Gemt lokalt (' + pending.length + ' items)');
  clearForm();
  updatePendingCount();
}

// --- List view ---
function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  if (view === 'list') renderPendingList();
}

async function renderPendingList() {
  const result = await chrome.storage.local.get('fotoscout-pending');
  const pending = result['fotoscout-pending'] || [];
  const list = document.getElementById('pendingList');
  document.getElementById('pendingCount').textContent = pending.length;

  if (pending.length === 0) {
    list.innerHTML = '<div class="empty-state">Ingen gemte items endnu.</div>';
    return;
  }

  list.innerHTML = pending.map((item, i) => {
    const isAddition = item.action === 'add-photo';

    if (isAddition) {
      const thumbHtml = item.photo
        ? '<img src="' + item.photo + '" alt="">'
        : '<div style="width:50px;height:50px;background:#eef1f5;display:flex;align-items:center;justify-content:center">+</div>';
      return '<div class="pending-item">' +
        '<div class="thumb">' + thumbHtml + '</div>' +
        '<div class="info"><div class="name">\u2192 ' + esc(item.targetName) + '</div><div class="meta">Foto til eksisterende post</div></div>' +
        '<div class="actions"><button class="btn btn-sm btn-danger" data-delete="' + i + '">\u00d7</button></div>' +
        '</div>';
    }

    const isLoc = item.type === 'location';
    const name = isLoc ? item.name : item.title;
    const sub = isLoc ? item.address : item.area;
    const img = isLoc ? (item.photos && item.photos[0] ? item.photos[0] : '') : (item.photo || '');
    const badge = isLoc ? 'Lok' : 'Insp';
    const icon = isLoc ? '\ud83d\udccd' : '\ud83d\udcf8';
    const thumbHtml = img
      ? '<img src="' + img + '" alt="">'
      : '<div style="width:50px;height:50px;background:#eef1f5;display:flex;align-items:center;justify-content:center;font-size:20px">' + icon + '</div>';

    return '<div class="pending-item">' +
      '<div class="thumb">' + thumbHtml + '</div>' +
      '<div class="info"><div class="name">' + esc(name) + '</div><div class="meta">' + badge + ' \u2022 ' + esc(sub) + '</div></div>' +
      '<div class="actions"><button class="btn btn-sm btn-danger" data-delete="' + i + '">\u00d7</button></div>' +
      '</div>';
  }).join('');

  // Add delete listeners
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(parseInt(btn.dataset.delete)));
  });
}

async function deleteItem(index) {
  const result = await chrome.storage.local.get('fotoscout-pending');
  const pending = result['fotoscout-pending'] || [];
  pending.splice(index, 1);
  await chrome.storage.local.set({ 'fotoscout-pending': pending });
  renderPendingList();
  updatePendingCount();
}

async function clearAll() {
  if (!confirm('Slet alle gemte items?')) return;
  await chrome.storage.local.set({ 'fotoscout-pending': [] });
  renderPendingList();
  updatePendingCount();
  showToast('Alle items slettet');
}

// --- Export ---
async function exportPending() {
  const result = await chrome.storage.local.get('fotoscout-pending');
  const pending = result['fotoscout-pending'] || [];

  if (pending.length === 0) {
    showToast('Ingen items at eksportere');
    return;
  }

  const newPosts = pending.filter(i => i.action !== 'add-photo');
  const additionItems = pending.filter(i => i.action === 'add-photo');

  const additionsMap = {};
  for (const a of additionItems) {
    if (!additionsMap[a.targetPostId]) {
      additionsMap[a.targetPostId] = { postId: a.targetPostId, photos: [] };
    }
    additionsMap[a.targetPostId].photos.push(a.photo);
  }

  const exportData = {
    locations: newPosts.filter(i => i.type === 'location').map(i => {
      const { type, sourceUrl: su, ...rest } = i;
      return rest;
    }),
    inspirations: newPosts.filter(i => i.type === 'inspiration').map(i => {
      const { type, sourceUrl: su, ...rest } = i;
      return rest;
    }),
    additions: Object.values(additionsMap)
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'fotoscout-export-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);

  showToast('Eksporteret ' + pending.length + ' items');
}

// --- Helpers ---
async function updatePendingCount() {
  const result = await chrome.storage.local.get('fotoscout-pending');
  const count = (result['fotoscout-pending'] || []).length;
  document.getElementById('pendingCount').textContent = count;
}

function clearForm() {
  document.getElementById('f-name').value = '';
  document.getElementById('f-address').value = '';
  document.getElementById('f-lat-loc').value = '';
  document.getElementById('f-lon-loc').value = '';
  document.getElementById('f-coords-loc').textContent = 'V\u00e6lg fra listen for koordinater';
  document.getElementById('f-coords-loc').style.color = '';
  document.getElementById('f-title').value = '';
  document.getElementById('f-area').value = '';
  document.getElementById('f-lat-insp').value = '';
  document.getElementById('f-lon-insp').value = '';
  document.getElementById('f-coords-insp').textContent = 'Valgfrit';
  document.getElementById('f-notes').value = '';
  document.getElementById('f-tags').value = '';
  document.getElementById('postSearch').value = '';
  compressedImage = '';
  sourceUrl = '';
  selectedPostId = null;
  document.getElementById('imagePreview').innerHTML = '<div class="placeholder">Intet billede valgt</div>';
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// --- GitHub Integration ---
function toggleSettings() {
  document.getElementById('settingsPanel').classList.toggle('open');
  if (ghToken) document.getElementById('ghToken').value = ghToken;
}

async function saveGhToken() {
  const token = document.getElementById('ghToken').value.trim();
  if (!token) { showToast('Indtast et token'); return; }
  ghToken = token;
  await chrome.storage.local.set({ 'fotoscout-gh-token': token });
  updateGhStatus();
  showToast('GitHub token gemt');
  document.getElementById('settingsPanel').classList.remove('open');
}

function updateGhStatus() {
  const dot = document.getElementById('ghStatusDot');
  if (ghToken) {
    dot.className = 'status-dot ok';
    dot.title = 'GitHub forbundet';
  } else {
    dot.className = 'status-dot missing';
    dot.title = 'GitHub token mangler';
  }
}

async function ghApiFetch(path, options = {}) {
  const res = await fetch('https://api.github.com/repos/' + GH_REPO + path, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + ghToken,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'GitHub API fejl: ' + res.status);
  }
  return res.json();
}

async function pushToGitHub(item) {
  if (!ghToken) {
    showToast('Sæt GitHub token først (⚙)');
    return false;
  }

  try {
    // 1. Fetch current data.json
    const dataFile = await ghApiFetch('/contents/data.json?ref=' + GH_BRANCH);
    const currentData = JSON.parse(atob(dataFile.content.replace(/\n/g, '')));

    // 2. Upload photo if present
    const isLoc = !!item.address;
    let photoPath = '';
    const photoData = isLoc ? (item.photos && item.photos[0]) : item.photo;

    if (photoData && photoData.startsWith('data:')) {
      const base64 = photoData.split(',')[1];
      photoPath = 'photos/' + item.id + '_0.jpg';

      await ghApiFetch('/contents/' + photoPath, {
        method: 'PUT',
        body: JSON.stringify({
          message: 'Tilføj foto: ' + (isLoc ? item.name : item.title),
          content: base64,
          branch: GH_BRANCH
        })
      });
    }

    // 3. Update item with file path instead of base64
    const cleanItem = { ...item };
    delete cleanItem.type;
    delete cleanItem.sourceUrl;

    if (isLoc) {
      cleanItem.photos = photoPath ? ['./' + photoPath] : [];
      currentData.locations.push(cleanItem);
    } else {
      cleanItem.photo = photoPath ? './' + photoPath : '';
      currentData.inspirations.push(cleanItem);
    }

    // 4. Push updated data.json
    await ghApiFetch('/contents/data.json', {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Tilføj: ' + (isLoc ? item.name : item.title),
        content: btoa(unescape(encodeURIComponent(JSON.stringify(currentData, null, 2)))),
        sha: dataFile.sha,
        branch: GH_BRANCH
      })
    });

    return true;
  } catch (err) {
    console.error('GitHub push fejl:', err);
    showToast('GitHub fejl: ' + err.message);
    return false;
  }
}

// Start
document.addEventListener('DOMContentLoaded', init);
