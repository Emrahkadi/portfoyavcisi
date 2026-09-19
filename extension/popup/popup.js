// Popup script - Basit ve etkili
// Token-based auth kullanır

// Leadseak - Lead Seek (Müşteri Adayı Ara)
// Development ve Production URL'leri - hangisi çalışıyorsa onu kullan
const API_URLS = {
  production: 'https://leadseak.com',
  development: 'http://localhost:3002',
};

// Başlangıçta development URL'i kullan, gerekirse production'a geç
let API_BASE = API_URLS.development;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const mainSection = document.getElementById('mainSection');
const statusEl = document.getElementById('status');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const fetchBtn = document.getElementById('fetchBtn');
const reloadPageBtn = document.getElementById('reloadPageBtn');
const listingsList = document.getElementById('listingsList');
const listingCount = document.getElementById('listingCount');
const logoutBtn = document.getElementById('logoutBtn');

// State
let authToken = null;
let currentListings = [];
let addedListings = new Set();

// Initialize
init();

async function init() {
  const stored = await chrome.storage.local.get(['authToken', 'userEmail']);
  if (stored.authToken) {
    authToken = stored.authToken;
    API_BASE = stored.apiBase || API_BASE;
    showMainSection(stored.userEmail, stored.userName);
  } else {
    showLoginSection();
    // Sahibinden'de login olmuşsa otomatik dene
    trySahibindenAutoAuth();
  }

  loginBtn.addEventListener('click', handleLogin);
  fetchBtn.addEventListener('click', handleFetchListings);
  reloadPageBtn.addEventListener('click', handleReloadPage);
  logoutBtn.addEventListener('click', handleLogout);
}

// Sahibinden'deki kullanıcı ile otomatik login/register dene
async function trySahibindenAutoAuth() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.includes('sahibinden.com')) return;

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'extractSahibindenUser',
    });

    if (response?.user?.loggedIn) {
      const sbUser = response.user;
      showNotification('🔄 Sahibinden hesabınızla giriş yapılıyor...');

      const authResponse = await fetch(`${API_BASE}/api/extension/sahibinden-auto-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sbUser),
      });

      const data = await authResponse.json();
      if (authResponse.ok) {
        authToken = data.token;
        await chrome.storage.local.set({
          authToken,
          apiBase: API_BASE,
          userEmail: data.user.email,
          userName: data.user.name,
        });
        showMainSection(data.user.email, data.user.name);
        if (data.user.isNewUser) {
          showNotification(`✅ Hoş geldiniz ${data.user.name}! Hesabınız oluşturuldu.`);
        } else {
          showNotification(`✅ Hoş geldiniz ${data.user.name}!`);
        }
      }
    }
  } catch (err) {
    // Sessizce devam et - normal login gösterilecek
    console.log('Sahibinden auto-auth skipped:', err.message);
  }
}

// Login
async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showError('E-posta ve şifre gerekli');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Giriş yapılıyor...';

  try {
    const response = await fetch(`${API_BASE}/api/extension/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Giriş başarısız');
    }

    authToken = data.token;
    // Başarılı giriş URL'ini sakla
    await chrome.storage.local.set({
      authToken,
      apiBase: API_BASE,
      userEmail: data.user.email,
      userName: data.user.name,
    });

    showMainSection(data.user.email);
  } catch (err) {
    showError(err.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Giriş Yap';
  }
}

// Fetch listings - Sahibinden'in mevcut sayfasından
async function handleFetchListings() {
  fetchBtn.disabled = true;
  fetchBtn.innerHTML = '<span class="spinner"></span>Getiriliyor...';
  listingsList.innerHTML = '<div class="loading"><span class="spinner"></span>İlanlar aranıyor...</div>';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url || !tab.url.includes('sahibinden.com')) {
      listingsList.innerHTML = '<div class="empty-state">Lütfen Sahibinden.com\'da bir arama sayfası açın.</div>';
      return;
    }

    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractListings',
      });
    } catch (err) {
      // Content script yüklü değil — sayfayı yenile
      await chrome.tabs.reload(tab.id);
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        response = await chrome.tabs.sendMessage(tab.id, {
          action: 'extractListings',
        });
      } catch (err2) {
        throw new Error('Sayfa yenilendi ama yine analiz edilemedi.');
      }
    }

    if (response && response.listings && response.listings.length > 0) {
      currentListings = response.listings;
      renderListings(currentListings);
    } else {
      listingsList.innerHTML = '<div class="empty-state">Bu sayfada bugün ilan yok.</div>';
      listingCount.textContent = '0';
    }
  } catch (err) {
    listingsList.innerHTML = `<div class="empty-state">Hata: ${err.message}</div>`;
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = '📥 Günlük İlanları Getir';
  }
}

// Render listings
function renderListings(listings) {
  listingCount.textContent = listings.length;

  if (listings.length === 0) {
    listingsList.innerHTML = '<div class="empty-state">Bu sayfada bugün ilan yok.</div>';
    return;
  }

  listingsList.innerHTML = listings.map((listing, index) => `
    <div class="listing-item" data-index="${index}">
      <div class="listing-info">
        <div class="listing-title">${escapeHtml(listing.title)}</div>
        <div class="listing-meta">
          ${listing.rooms || ''} • ${listing.sizeSqm || '?'} m² •
          ${listing.neighborhood || listing.district || ''}
        </div>
        <div class="listing-price">${formatPrice(listing.price)}</div>
      </div>
      <button class="btn-add ${addedListings.has(listing.externalId) ? 'added' : ''}"
              data-id="${listing.externalId}"
              ${addedListings.has(listing.externalId) ? 'disabled' : ''}>
        ${addedListings.has(listing.externalId) ? '✓ Eklendi' : '+ Ekle'}
      </button>
    </div>
  `).join('');

  listingsList.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', () => handleAddListing(btn.dataset.id));
  });
}

// Add listing - Detay sayfasından m² al, AI mesaj oluştur
async function handleAddListing(externalId) {
  const listing = currentListings.find(l => l.externalId === externalId);
  if (!listing) return;

  const btn = listingsList.querySelector(`[data-id="${externalId}"]`);
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    // m² yoksa detay sayfasından al
    let sizeSqm = listing.sizeSqm || 0;
    let price = listing.price || 0;
    let fullTitle = listing.title || '';
    let rooms = listing.rooms || '';
    let contactPhone = listing.contactPhone || '';
    let contactName = listing.contactName || '';

    if (sizeSqm <= 0 && listing.url) {
      showNotification('🔄 Detay sayfası açılıyor...');
      const detailTab = await chrome.tabs.create({ url: listing.url, active: false });
      await new Promise(resolve => setTimeout(resolve, 4000));

      try {
        const detailResponse = await chrome.tabs.sendMessage(detailTab.id, {
          action: 'extractDetailFull',
        });
        if (detailResponse && detailResponse.detail) {
          const d = detailResponse.detail;
          sizeSqm = d.sizeSqm || sizeSqm;
          price = d.price || price;
          fullTitle = d.title || fullTitle;
          rooms = d.rooms || rooms;
          contactPhone = d.contactPhone || contactPhone;
          contactName = d.contactName || contactName;
          // Tüm yeni alanları sakla
          listing._fullDetail = d;
        }
      } catch (e) {}

      try { await chrome.tabs.remove(detailTab.id); } catch (e) {}
    }

    const d = listing._fullDetail || {};
    const payload = {
      externalId: listing.externalId || `ext-${Date.now()}-${Math.random()}`,
      title: fullTitle || listing.title || 'İsimsiz İlan',
      price: price,
      sizeSqm: sizeSqm,
      rooms: rooms,
      city: listing.city || d.city || 'İstanbul',
      district: listing.district || d.district || '',
      neighborhood: listing.neighborhood || d.neighborhood || '',
      isOwner: listing.isOwner ?? d.isOwner ?? true,
      daysOnMarket: listing.daysOnMarket || 0,
      url: listing.url || '',
      contactName: contactName || d.contactName || '',
      contactPhone: contactPhone || d.contactPhone || '',
      propertyType: listing.propertyType || d.propertyType || 'APARTMENT',
      // Tüm yeni alanlar
      description: d.description || '',
      photos: d.photos || [],
      allFeatures: d.allFeatures || [],
      floor: d.floor || null,
      totalFloors: d.totalFloors || null,
      buildingAge: d.buildingAge || null,
      heatingType: d.heatingType || '',
      bathroomCount: d.bathroomCount || null,
      balcony: d.balcony || false,
      furnished: d.furnished || false,
      parking: d.parking || false,
      elevator: d.elevator || false,
      inComplex: d.inComplex || false,
      location: d.location || '',
      priceText: d.priceText || '',
    };

    if (!payload.title || payload.price <= 0 || payload.sizeSqm <= 0) {
      throw new Error(`Eksik bilgi: ${!payload.title ? 'başlık' : !payload.price ? 'fiyat' : 'm²'}`);
    }

    // İlanı ekle
    const response = await fetch(`${API_BASE}/api/extension/add-listing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error('Sunucu beklenmeyen yanıt verdi.');
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Eklenemedi');

    addedListings.add(externalId);
    btn.classList.add('added');
    btn.innerHTML = '🤖 AI Mesaj Hazırlanıyor...';

    // WhatsApp otomatik gönderim (AI mesaj oluştur + WhatsApp gönder)
    btn.classList.add('added');
    btn.innerHTML = '🤖 AI + WhatsApp...';

    try {
      const waResponse = await fetch(`${API_BASE}/api/extension/whatsapp-auto-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ listingId: data.listing.id, sendWhatsApp: true }),
      });

      const waData = await waResponse.json();

      if (waResponse.ok && waData.success) {
        const sent = waData.whatsapp?.sent;
        if (sent) {
          btn.innerHTML = '✓ WhatsApp Gönderildi';
          showNotification(`📲 WhatsApp mesajı gönderildi! AI: ${waData.message.substring(0, 60)}...`);
        } else if (waData.whatsapp?.enabled) {
          btn.innerHTML = '⚠ Mesaj Hazır';
          showNotification(`⚠ Mesaj hazır ama gönderilemedi: ${waData.whatsapp?.error || 'bilinmeyen hata'}`);
        } else {
          btn.innerHTML = '✓ AI Mesaj Hazır';
          showNotification(`🤖 AI mesajı hazır! WhatsApp API yapılandırılmamış. Dashboard'dan gönderebilirsiniz.`);
        }
      } else {
        btn.innerHTML = '✓ Eklendi';
        showNotification(`✅ Eklendi! AI mesajı daha sonra hazırlanacak.`);
      }
    } catch (err) {
      btn.innerHTML = '✓ Eklendi';
      showNotification(`✅ Eklendi! (${err.message})`);
    }
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '+ Ekle';
    showNotification(`❌ Hata: ${err.message}`);
  }
}

// Reload Sahibinden page
async function handleReloadPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.includes('sahibinden.com')) {
    await chrome.tabs.reload(tab.id);
    showNotification('🔄 Sayfa yenileniyor... 3 saniye bekleyin.');
  } else {
    showNotification('❌ Lütfen Sahibinden.com\'da bir sayfa açın');
  }
}

// Logout
async function handleLogout() {
  await chrome.storage.local.clear();
  authToken = null;
  showLoginSection();
}

// UI helpers
function showLoginSection() {
  loginSection.classList.remove('hidden');
  mainSection.classList.add('hidden');
  statusEl.textContent = 'Bağlı değil';
  statusEl.className = 'status disconnected';
}

function showMainSection(email, name) {
  loginSection.classList.add('hidden');
  mainSection.classList.remove('hidden');
  statusEl.textContent = 'Bağlı';
  statusEl.className = 'status connected';
  statusEl.title = name ? `${name} (${email})` : email;

  // Kullanıcı adını göster
  const currentUserEl = document.getElementById('currentUser');
  if (currentUserEl && name) {
    currentUserEl.textContent = `👤 ${name}`;
    currentUserEl.classList.remove('hidden');
  }

  // Info box'taki email
  const loggedInEmailEl = document.getElementById('loggedInUserEmail');
  if (loggedInEmailEl) {
    loggedInEmailEl.textContent = email;
  }
}

function showError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove('hidden');
  setTimeout(() => loginError.classList.add('hidden'), 5000);
}

function showNotification(msg) {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: #1f2937;
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  notif.textContent = msg;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function formatPrice(price) {
  if (!price) return '';
  return new Intl.NumberFormat('tr-TR').format(price) + ' TL';
}