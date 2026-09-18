// Content Script - Sahibinden sayfasından ilan bilgilerini çıkarır
// Bu script sadece kullanıcının aktif olarak gezindiği sayfada çalışır
// Otomatik gezinme YAPMAZ - kullanıcı tıklamadan hiçbir şey yapmaz

(function() {
  'use strict';

  // Sayfa tipini algıla
  function detectPageType() {
    const url = window.location.href;
    if (url.includes('/ilan/') || url.includes('/detay/')) {
      return 'detail';
    }
    if (url.includes('/satilik') || url.includes('/kiralik') || url.includes('/arama')) {
      return 'list';
    }
    return 'other';
  }

  // Arama sonuçları sayfasından ilanları çıkar
  function extractListings() {
    const listings = [];

    // Sahibinden'in güncel HTML yapısı - 2024/2025
    const selectors = [
      'tr.searchResultsItem',
      'li.searchResultsItem',
      'div.searchResultsItem',
      'a.classifiedTitle',
      '[data-id]',
      'tr[class*="search"]',
      'li[class*="search"]',
    ];

    let items = [];
    for (const selector of selectors) {
      items = document.querySelectorAll(selector);
      if (items.length > 0) break;
    }

    console.log(`Found ${items.length} items with selectors`);

    items.forEach((item, index) => {
      try {
        const listing = parseListingItem(item, index);
        if (listing && listing.title) {
          listings.push(listing);
        }
      } catch (err) {
        console.warn('Parse error:', err);
      }
    });

    return listings;
  }

  // Tek bir ilan öğesini parse et
  function parseListingItem(item, index) {
    // Başlık - birden fazla selector dene
    const titleEl = item.querySelector(
      'a.classifiedTitle, .classifiedTitle, h3 a, .title, ' +
      'a[title], td[class*="title"] a, .classified-title'
    );
    const title = titleEl?.textContent?.trim() || titleEl?.getAttribute('title') || '';

    // URL
    let url = titleEl?.href || item.querySelector('a')?.href || '';
    if (url && !url.startsWith('http')) {
      url = 'https://www.sahibinden.com' + url;
    }

    // Fiyat - birden fazla selector dene
    const priceEl = item.querySelector(
      '.searchResultsPriceValue, .price, .classifiedPrice, ' +
      'td[class*="price"], .search-results-price, [class*="price"]'
    );
    const priceText = priceEl?.textContent?.trim() || '';
    const price = parsePrice(priceText);

    // m² - Sahibinden'in gerçek HTML yapısı
    // Genellikle "searchResultsAttributeValue" class'ında veya "m²" içeren elementte
    let sizeSqm = 0;

    // Yöntem 1: Attribute value'larından
    const attrEls = item.querySelectorAll('.searchResultsAttributeValue, [class*="attribute"]');
    for (const el of attrEls) {
      const text = el.textContent.trim();
      const m = text.match(/(\d+)\s*m²/);
      if (m) {
        sizeSqm = parseInt(m[1]);
        break;
      }
    }

    // Yöntem 2: Tüm text'ten
    if (!sizeSqm) {
      const allText = item.textContent || '';
      const m = allText.match(/(\d+)\s*m²/);
      if (m) sizeSqm = parseInt(m[1]);
    }

    // Yöntem 3: Br/span içindeki değerlerden
    if (!sizeSqm) {
      const spans = item.querySelectorAll('span, div');
      for (const span of spans) {
        const text = span.textContent.trim();
        if (/^\d+\s*m²?$/.test(text)) {
          sizeSqm = parseInt(text);
          break;
        }
      }
    }

    // Oda sayısı
    const allText = item.textContent || '';
    const rooms = parseRooms(allText);

    // Konum
    const locationEl = item.querySelector(
      '.searchResultsLocation, .location, ' +
      'td[class*="location"], [class*="location"]'
    );
    const location = locationEl?.textContent?.trim() || '';

    // Tarih
    const dateEl = item.querySelector(
      '.searchResultsDateValue, .date, ' +
      'td[class*="date"], [class*="date"]'
    );
    const dateText = dateEl?.textContent?.trim() || '';

    // External ID (URL'den veya data-id'den)
    let externalId = extractIdFromUrl(url);
    if (!externalId) {
      externalId = item.getAttribute('data-id') || `item-${index}-${Date.now()}`;
    }

    // İlan sahibi mi?
    const isOwner = !url.includes('/emlak-ofisi/') &&
                    !item.querySelector('.storeName, [class*="store"]');

    // Debug log
    if (index < 3) {
      console.log(`Item ${index}:`, {
        title: title.substring(0, 30),
        price,
        sizeSqm,
        rooms,
        url: url.substring(0, 50),
      });
    }

    return {
      externalId,
      url,
      title,
      price,
      sizeSqm,
      rooms,
      city: extractCity(location) || 'İstanbul',
      district: extractDistrict(location),
      neighborhood: extractNeighborhood(location),
      isOwner,
      daysOnMarket: parseDays(dateText),
      propertyType: 'APARTMENT',
    };
  }

  // İlan detay sayfasından bilgi çıkar
  function extractDetail() {
    const url = window.location.href;
    const externalId = extractIdFromUrl(url) || `detail-${Date.now()}`;

    // Başlık
    const title = document.querySelector('h1.classifiedDetailTitle, h1')?.textContent?.trim() || '';

    // Fiyat - birden fazla selector dene
    const priceEl = document.querySelector(
      '.classifiedDetailPrice .classifiedPrice, ' +
      '.classifiedDetailPrice, ' +
      '.price, ' +
      '[class*="price"]'
    );
    const priceText = priceEl?.textContent?.trim() || '';
    const price = parsePrice(priceText);

    // Özellikler - Sahibinden'in detay sayfası yapısı
    const infoItems = document.querySelectorAll(
      '.classifiedInfoList li, ' +
      '.detail-info-item, ' +
      'ul[class*="info"] li, ' +
      '[class*="classifiedInfo"] li'
    );

    let sizeSqm = 0;
    let rooms = '';
    let floor = null;
    let buildingAge = null;

    infoItems.forEach(item => {
      const text = item.textContent.trim();
      // m²
      const m2Match = text.match(/(\d+)\s*m\s*[²2]/i);
      if (m2Match) sizeSqm = parseInt(m2Match[1]);

      // Oda sayısı
      const roomMatch = text.match(/(\d+\+\d+)/);
      if (roomMatch) rooms = roomMatch[1];

      // Kat
      if (text.includes('Kat') && !text.includes('Kat Sayısı')) {
        const floorMatch = text.match(/(\d+)/);
        if (floorMatch) floor = parseInt(floorMatch[1]);
      }

      // Bina Yaşı
      if (text.includes('Bina Yaşı') || text.includes('Yaşı')) {
        const ageMatch = text.match(/(\d+)/);
        if (ageMatch) buildingAge = parseInt(ageMatch[1]);
      }
    });

    // Eğer hâlâ m² bulunamadıysa, tüm sayfa text'inden ara
    if (!sizeSqm) {
      const allText = document.body.textContent || '';
      const m2Match = allText.match(/(\d+)\s*m\s*[²2]/);
      if (m2Match) sizeSqm = parseInt(m2Match[1]);
    }

    // Konum
    const locationEl = document.querySelector(
      '.classifiedDetailLocation, ' +
      '.location, ' +
      '[class*="location"]'
    );
    const location = locationEl?.textContent?.trim() || '';

    // İlan sahibi
    const ownerEl = document.querySelector(
      '.userName, ' +
      '.seller-name, ' +
      '[class*="userName"], ' +
      '[class*="seller"]'
    );
    const ownerName = ownerEl?.textContent?.trim() || '';

    // Telefon (gösterilmiyorsa boş)
    const phoneEl = document.querySelector(
      '.phone-number, ' +
      '[data-phone], ' +
      '[class*="phone"]'
    );
    const phone = phoneEl?.dataset?.phone || phoneEl?.textContent?.trim() || '';

    console.log('Extracted detail:', { title, price, sizeSqm, rooms, phone });

    return {
      externalId,
      url,
      title,
      price,
      sizeSqm,
      rooms,
      floor,
      buildingAge,
      city: extractCity(location) || 'İstanbul',
      district: extractDistrict(location),
      neighborhood: extractNeighborhood(location),
      isOwner: !url.includes('/emlak-ofisi/'),
      contactName: ownerName,
      contactPhone: phone,
      propertyType: 'APARTMENT',
    };
  }

  // Helper functions
  function parsePrice(text) {
    if (!text) return 0;
    const cleaned = text.replace(/[^\d]/g, '');
    return parseInt(cleaned) || 0;
  }

  function parseSize(text) {
    if (!text) return 0;
    // "105 m²", "105m2", "105 m2" gibi formatları yakala
    const match = text.match(/(\d+)\s*m\s*[²2]/i);
    return match ? parseInt(match[1]) : 0;
  }

  function parseRooms(text) {
    if (!text) return '';
    const match = text.match(/(\d+\+\d+)/);
    return match ? match[1] : '';
  }

  function parseDays(text) {
    if (!text) return 0;
    if (text.includes('Bugün')) return 0;
    if (text.includes('Dün')) return 1;
    const match = text.match(/(\d+)\s*(gün|gun)/i);
    return match ? parseInt(match[1]) : 0;
  }

  function extractIdFromUrl(url) {
    if (!url) return '';
    const match = url.match(/\/ilan\/[^/]*-(\d+)/);
    return match ? match[1] : '';
  }

  function extractCity(location) {
    if (!location) return '';
    const parts = location.split(/[,\/\-]/).map(p => p.trim());
    return parts[0] || '';
  }

  function extractDistrict(location) {
    if (!location) return '';
    const parts = location.split(/[,\/\-]/).map(p => p.trim());
    return parts[1] || '';
  }

  function extractNeighborhood(location) {
    if (!location) return '';
    const parts = location.split(/[,\/\-]/).map(p => p.trim());
    return parts[2] || '';
  }

  // Message listener
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractListings') {
      const pageType = detectPageType();
      let listings = [];

      if (pageType === 'list') {
        listings = extractListings();
      } else if (pageType === 'detail') {
        const detail = extractDetail();
        if (detail) listings = [detail];
      }

      // Filtreleme: sadece bugün eklenenler
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const filtered = listings.filter(l => {
        // daysOnMarket 0 veya 1 olanlar (bugün veya dün)
        return l.daysOnMarket <= 1;
      });

      sendResponse({ listings: filtered, total: listings.length });
      return true;
    }

    if (request.action === 'extractDetail') {
      const detail = extractDetail();
      sendResponse({ listing: detail });
      return true;
    }

    if (request.action === 'fetchDetail') {
      // URL'den detay bilgisi çıkar (fetch kullanarak)
      fetch(request.url)
        .then(r => r.text())
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          // Başlık
          const title = doc.querySelector('h1.classifiedDetailTitle, h1')?.textContent?.trim() || '';

          // Fiyat
          const priceText = doc.querySelector('.classifiedDetailPrice .classifiedPrice, .price')?.textContent?.trim() || '';
          const price = parsePrice(priceText);

          // m²
          const infoItems = doc.querySelectorAll('.classifiedInfoList li, .detail-info-item');
          let sizeSqm = 0;
          let rooms = '';

          infoItems.forEach(item => {
            const text = item.textContent.trim();
            const m = text.match(/(\d+)\s*m\s*[²2]/i);
            if (m) sizeSqm = parseInt(m[1]);
            const r = text.match(/(\d+\+\d+)/);
            if (r) rooms = r[1];
          });

          sendResponse({
            listing: {
              title,
              price,
              sizeSqm,
              rooms,
            }
          });
        })
        .catch(err => {
          console.error('Fetch detail error:', err);
          sendResponse({ error: err.message });
        });
      return true; // async response
    }
  });

  // Sayfa yüklendiğinde bildir
  console.log('Portfolio Intel content script loaded');

  // Sayfa yüklendiğinde bir event gönder
  document.dispatchEvent(new CustomEvent('portfolio-intel-ready'));

  // Sayfa tamamen yüklendiğinde tekrar bildir
  if (document.readyState === 'complete') {
    document.dispatchEvent(new CustomEvent('portfolio-intel-page-ready'));
  } else {
    window.addEventListener('load', () => {
      document.dispatchEvent(new CustomEvent('portfolio-intel-page-ready'));
    });
  }
})();