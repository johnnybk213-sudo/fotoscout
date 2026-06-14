// FotoScout Chrome Extension — Background Service Worker

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'fotoscout-add',
    title: 'Tilføj til FotoScout',
    contexts: ['image']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'fotoscout-add') return;

  // Store image URL and page info for the popup to pick up
  await chrome.storage.local.set({
    pendingImage: {
      srcUrl: info.srcUrl,
      pageUrl: tab?.url || '',
      pageTitle: tab?.title || '',
      timestamp: Date.now()
    }
  });

  // Open popup as a window (context menu can't trigger the action popup directly)
  chrome.windows.create({
    url: 'popup.html',
    type: 'popup',
    width: 480,
    height: 640
  });
});

// Update badge when pending count changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes['fotoscout-pending']) {
    const items = changes['fotoscout-pending'].newValue || [];
    const count = items.length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#f0a030' });
  }
});

// Handle sync from content script (admin.html)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'sync-posts' && message.posts) {
    chrome.storage.local.set({
      'fotoscout-posts': message.posts,
      'fotoscout-synk-time': Date.now()
    });
  }
});

// Set initial badge on startup
chrome.storage.local.get('fotoscout-pending', (result) => {
  const items = result['fotoscout-pending'] || [];
  const count = items.length;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#f0a030' });
});
