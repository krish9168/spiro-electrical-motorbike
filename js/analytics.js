/* ═══════════════════════════════════════════════════════
   SPIRO ANALYTICS TRACKER
   Lightweight client-side visit tracking with localStorage
═══════════════════════════════════════════════════════ */

(function SpiroAnalytics() {
  'use strict';

  const STORAGE_KEY = 'spiro_analytics';
  const SESSION_KEY = 'spiro_session';
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // ── Utilities ──
  function today() {
    return new Date().toISOString().slice(0, 10); // "2026-06-10"
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function getWeekNumber(d) {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return Math.round(((date - week1) / 86400000 + 3 - (week1.getDay() + 6) % 7) / 7) + 1;
  }

  function getWeekKey(d) {
    const date = new Date(d);
    return `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`;
  }

  function getMonthKey(d) {
    return new Date(d).toISOString().slice(0, 7); // "2026-06"
  }

  // ── Storage ──
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createFreshData();
      return JSON.parse(raw);
    } catch {
      return createFreshData();
    }
  }

  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[SpiroAnalytics] Storage save failed:', e);
    }
  }

  function createFreshData() {
    return {
      totalVisits: 0,
      totalPageViews: 0,
      uniqueVisitors: 0,
      firstVisit: nowISO(),
      daily: {},     // { "2026-06-10": { visits: 5, pageViews: 12, unique: 3 } }
      weekly: {},    // { "2026-W24": { visits: 20, pageViews: 55, unique: 12 } }
      monthly: {},   // { "2026-06": { visits: 80, pageViews: 200, unique: 40 } }
      pages: {},     // { "/": 50, "/#bikes": 20 }
      devices: { mobile: 0, tablet: 0, desktop: 0 },
      referrers: {},
      events: [],    // last 200 events
      hourly: {},    // { "14": 20 } — hour distribution
      sessions: []   // last 50 sessions with timestamps
    };
  }

  // ── Session Management ──
  function getOrCreateSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw);
        const elapsed = Date.now() - session.lastActivity;
        if (elapsed < SESSION_TIMEOUT) {
          session.lastActivity = Date.now();
          session.pageViews++;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
          return { session, isNew: false };
        }
      }
    } catch {}

    // New session
    const session = {
      id: Math.random().toString(36).slice(2, 10),
      start: Date.now(),
      lastActivity: Date.now(),
      pageViews: 1,
      entryPage: location.pathname + location.hash
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { session, isNew: true };
  }

  // ── Device Detection ──
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua)) return 'mobile';
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  // ── Track Visit ──
  function trackPageView() {
    const data = loadData();
    const d = today();
    const wk = getWeekKey(d);
    const mo = getMonthKey(d);
    const page = location.pathname + location.hash;
    const hour = String(new Date().getHours());
    const device = getDeviceType();
    const referrer = document.referrer ? new URL(document.referrer).hostname : 'direct';

    const { session, isNew } = getOrCreateSession();

    // -- Total counters --
    data.totalPageViews++;
    if (isNew) {
      data.totalVisits++;
    }

    // -- Daily --
    if (!data.daily[d]) data.daily[d] = { visits: 0, pageViews: 0, unique: 0 };
    data.daily[d].pageViews++;
    if (isNew) data.daily[d].visits++;

    // -- Weekly --
    if (!data.weekly[wk]) data.weekly[wk] = { visits: 0, pageViews: 0, unique: 0 };
    data.weekly[wk].pageViews++;
    if (isNew) data.weekly[wk].visits++;

    // -- Monthly --
    if (!data.monthly[mo]) data.monthly[mo] = { visits: 0, pageViews: 0, unique: 0 };
    data.monthly[mo].pageViews++;
    if (isNew) data.monthly[mo].visits++;

    // -- Pages --
    data.pages[page] = (data.pages[page] || 0) + 1;

    // -- Devices --
    data.devices[device] = (data.devices[device] || 0) + 1;

    // -- Referrers --
    data.referrers[referrer] = (data.referrers[referrer] || 0) + 1;

    // -- Hourly distribution --
    data.hourly[hour] = (data.hourly[hour] || 0) + 1;

    // -- Sessions log (keep last 50) --
    if (isNew) {
      data.sessions.unshift({
        id: session.id,
        timestamp: nowISO(),
        device: device,
        page: page,
        referrer: referrer
      });
      if (data.sessions.length > 50) data.sessions.length = 50;
    }

    // -- Events log (keep last 200) --
    data.events.unshift({
      type: 'pageview',
      page: page,
      timestamp: nowISO(),
      device: device
    });
    if (data.events.length > 200) data.events.length = 200;

    // Prune old daily data (keep 90 days)
    const dailyKeys = Object.keys(data.daily).sort();
    if (dailyKeys.length > 90) {
      dailyKeys.slice(0, dailyKeys.length - 90).forEach(k => delete data.daily[k]);
    }

    saveData(data);
  }

  // ── Track Custom Events ──
  window.spiroTrackEvent = function(eventName, details) {
    const data = loadData();
    data.events.unshift({
      type: eventName,
      details: details || {},
      timestamp: nowISO(),
      page: location.pathname + location.hash,
      device: getDeviceType()
    });
    if (data.events.length > 200) data.events.length = 200;
    saveData(data);
  };

  // ── Public API for Dashboard ──
  window.SpiroAnalytics = {
    getData: loadData,
    getWeekKey: getWeekKey,
    getMonthKey: getMonthKey,
    today: today,
    clearData: function() {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    }
  };

  // ── Initialize ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', trackPageView);
  } else {
    trackPageView();
  }

  // Track WhatsApp clicks
  const origOpenWA = window.openWA;
  if (typeof origOpenWA === 'function') {
    window.openWA = function() {
      window.spiroTrackEvent('whatsapp_click', { type: arguments[0], model: arguments[1] });
      return origOpenWA.apply(this, arguments);
    };
  } else {
    // Wrap after DOM ready if openWA isn't defined yet
    document.addEventListener('DOMContentLoaded', function() {
      if (typeof window.openWA === 'function') {
        const fn = window.openWA;
        window.openWA = function() {
          window.spiroTrackEvent('whatsapp_click', { type: arguments[0], model: arguments[1] });
          return fn.apply(this, arguments);
        };
      }
    });
  }

})();
