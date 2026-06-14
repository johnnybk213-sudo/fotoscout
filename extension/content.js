// FotoScout Content Script — runs on admin.html
// Automatically syncs post list to extension storage

function syncPosts() {
  const raw = localStorage.getItem('fotoscout-data');
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    const posts = [];

    for (const loc of (data.locations || [])) {
      posts.push({ id: loc.id, type: 'location', name: loc.name });
    }
    for (const insp of (data.inspirations || [])) {
      posts.push({ id: insp.id, type: 'inspiration', name: insp.title });
    }

    chrome.runtime.sendMessage({
      type: 'sync-posts',
      posts: posts
    });
  } catch (e) {
    console.error('FotoScout sync fejl:', e);
  }
}

// Sync on page load
syncPosts();

// Sync whenever localStorage changes (covers saves from admin.html)
window.addEventListener('storage', syncPosts);

// Also watch for changes made in the same tab (storage event only fires cross-tab)
// Override localStorage.setItem to detect saves in current tab
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  originalSetItem(key, value);
  if (key === 'fotoscout-data') {
    syncPosts();
  }
};
