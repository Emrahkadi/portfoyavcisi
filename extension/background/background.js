// Background Service Worker
// Leadseak - Lead Seek extension

// Tab güncellendiğinde Sahibinden'de bildirim göster
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('sahibinden.com')) {
    // Toolbar icon'a badge ekle
    chrome.action.setBadgeText({
      tabId,
      text: '●',
    });
    chrome.action.setBadgeBackgroundColor({
      tabId,
      color: '#10b981', // yeşil
    });

    // Sayfaya bilgilendirme mesajı gönder
    chrome.tabs.sendMessage(tabId, {
      action: 'sahibindenDetected',
      url: tab.url,
    }).catch(() => {
      // Content script henüz yüklenmemiş olabilir
    });
  } else if (changeInfo.status === 'complete') {
    // Sahibinden dışındaki sayfalarda badge'i kaldır
    chrome.action.setBadgeText({ tabId, text: '' });
  }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    // Mevcut tab için popup'ı aç
    chrome.action.openPopup();
    return true;
  }

  if (request.action === 'apiCall') {
    handleApiCall(request)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.action === 'getApiBase') {
    chrome.storage.local.get(['apiBase']).then(stored => {
      sendResponse({ apiBase: stored.apiBase || 'http://localhost:3002' });
    });
    return true;
  }
});

async function handleApiCall(request) {
  const { endpoint, method = 'GET', body, useStoredApiBase = false } = request;

  let apiBase = 'http://localhost:3002';
  if (useStoredApiBase) {
    const stored = await chrome.storage.local.get(['apiBase']);
    apiBase = stored.apiBase || apiBase;
  }

  const response = await fetch(`${apiBase}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'API error');
  }
  return data;
}
