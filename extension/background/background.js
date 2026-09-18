// Background Service Worker
// API iletişimi ve koordinasyon

const API_BASE = 'http://localhost:3000';

// Extension kurulduğunda
chrome.runtime.onInstalled.addListener(() => {
  console.log('Portfolio Intel extension installed');
});

// Tab güncellendiğinde
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('sahibinden.com')) {
    // Sayfa yüklendi, content script otomatik çalışacak
    console.log('Sahibinden page loaded:', tab.url);
  }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'apiCall') {
    handleApiCall(request)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

async function handleApiCall(request) {
  const { endpoint, method = 'GET', body } = request;

  const response = await fetch(`${API_BASE}${endpoint}`, {
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