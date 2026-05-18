/* =========================================================
   Georgie Vergaderzaal — data layer (prototype)
   ---------------------------------------------------------
   Bron van waarheid voor de publieke kalender:
     vergaderzaal/availability.json (statisch, in repo)

   Lokaal beheer (in browser van de uitbater):
     localStorage onder de keys hieronder.

   Zodra er een echte backend is (Supabase / Firebase / eigen API),
   vervang fetchPublicAvailability + saveAdminAvailability + saveRequest
   door de echte calls. De rest van de UI hoeft niet te veranderen.
   ========================================================= */

(function (global) {
  const STORAGE_KEY_AVAILABILITY = 'georgie.vergaderzaal.availability';
  const STORAGE_KEY_REQUESTS = 'georgie.vergaderzaal.requests';
  const PUBLIC_AVAILABILITY_URL = 'vergaderzaal/availability.json';

  const SLOT_DEFS = [
    { key: 'morning',   label: 'Voormiddag', time: '09:00 – 13:00' },
    { key: 'afternoon', label: 'Namiddag',   time: '13:30 – 17:30' },
    { key: 'evening',   label: 'Avond',      time: '18:00 – 22:00' }
  ];

  const PRICES = {
    morning: 150,
    afternoon: 150,
    evening: 175,
    fullday: 275,
    fulldayEvening: 420
  };

  const ADDONS = [
    { key: 'coffee', label: 'Koffie / thee / water',  pricePerPerson: 4,  desc: 'doorlopend tijdens uw verblijf' },
    { key: 'lunch',  label: 'Lunch (broodjes & soep)', pricePerPerson: 18, desc: 'gemaakt met verse ingrediënten' },
    { key: 'apero',  label: 'Apero (cava & hapjes)',  pricePerPerson: 15, desc: 'om de dag af te sluiten' }
  ];

  // --------- helpers ---------

  function slotKey(dateStr, slot) { return dateStr + ':' + slot; }

  function parseSlotKey(key) {
    const [date, slot] = key.split(':');
    return { date, slot };
  }

  function todayIso() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return isoDate(d);
  }

  function isoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function uid() {
    return 'req_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  // --------- availability ---------

  async function fetchPublicAvailability() {
    try {
      const res = await fetch(PUBLIC_AVAILABILITY_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('http ' + res.status);
      const data = await res.json();
      return Array.isArray(data.unavailable) ? data.unavailable : [];
    } catch (e) {
      console.warn('availability.json kon niet geladen worden, kalender start leeg.', e);
      return [];
    }
  }

  function loadAdminAvailability() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AVAILABILITY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.unavailable) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveAdminAvailability(unavailable) {
    const payload = {
      updated: new Date().toISOString(),
      unavailable: Array.from(new Set(unavailable)).sort()
    };
    localStorage.setItem(STORAGE_KEY_AVAILABILITY, JSON.stringify(payload));
    return payload;
  }

  async function getEffectiveAvailability() {
    // Admin draft (in localStorage) wint van de publieke JSON.
    const admin = loadAdminAvailability();
    if (admin) return admin.unavailable;
    return await fetchPublicAvailability();
  }

  // --------- requests ---------

  function loadRequests() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REQUESTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.requests) ? parsed.requests : [];
    } catch (e) {
      return [];
    }
  }

  function saveRequests(requests) {
    const payload = { version: 1, requests };
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(payload));
  }

  function addRequest(req) {
    const requests = loadRequests();
    const full = Object.assign({
      id: uid(),
      status: 'pending',
      createdAt: new Date().toISOString()
    }, req);
    requests.unshift(full);
    saveRequests(requests);
    return full;
  }

  function updateRequest(id, patch) {
    const requests = loadRequests();
    const idx = requests.findIndex(r => r.id === id);
    if (idx === -1) return null;
    requests[idx] = Object.assign({}, requests[idx], patch);
    saveRequests(requests);
    return requests[idx];
  }

  function removeRequest(id) {
    const requests = loadRequests().filter(r => r.id !== id);
    saveRequests(requests);
  }

  // --------- pricing ---------

  function priceForSlots(slots) {
    if (!slots || slots.length === 0) return 0;
    const unique = Array.from(new Set(slots));
    const hasM = unique.includes('morning');
    const hasA = unique.includes('afternoon');
    const hasE = unique.includes('evening');
    if (hasM && hasA && hasE) return PRICES.fulldayEvening;
    if (hasM && hasA) return PRICES.fullday;
    return unique.reduce((sum, s) => sum + (PRICES[s] || 0), 0);
  }

  function formatPrice(eur) {
    return '€' + eur.toLocaleString('nl-BE');
  }

  // --------- export ---------

  global.VergaderzaalData = {
    SLOT_DEFS,
    PRICES,
    ADDONS,
    slotKey,
    parseSlotKey,
    todayIso,
    isoDate,
    fetchPublicAvailability,
    loadAdminAvailability,
    saveAdminAvailability,
    getEffectiveAvailability,
    loadRequests,
    saveRequests,
    addRequest,
    updateRequest,
    removeRequest,
    priceForSlots,
    formatPrice
  };
})(window);
