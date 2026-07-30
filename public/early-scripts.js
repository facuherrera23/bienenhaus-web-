// ================================================================
// EARLY SCRIPTS - Run before Vite/module loading
// These must execute before any module code
// ================================================================

// 1. Redirect handling for production (must run before any module)
(function() {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    var path = window.location.pathname;
    if (path !== '/' && path !== '/index.html') {
      sessionStorage.redirect = location.href;
      window.location.replace('/');
    }
  }
})();

// 2. Restore redirect after page load (must run early)
(function() {
  if (sessionStorage.redirect) {
    window.location.replace(sessionStorage.redirect);
    sessionStorage.removeItem('redirect');
  }
})();

// 3. Maintenance mode check (non-blocking, fail-open)
// Uses sessionStorage to cache result and avoid repeated 401s
(function() {
  var SUPABASE_URL = 'https://rnldqiwwzhjnurkguihu.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJubGRxaXd3emhqbnVya2d1aWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkzNzU5NjgsImV4cCI6MjA1NDk1MTk2OH0.7J7b8s0Qx5FJ-fR_6u2V9cF2nL8sX4Q8Y4L8Y7cQ7Jk';
  
  var cacheKey = 'maintenance_check';
  var cacheTime = sessionStorage.getItem(cacheKey + '_time');
  var now = Date.now();
  
  // Cache for 5 minutes
  if (cacheTime && (now - parseInt(cacheTime)) < 5 * 60 * 1000) {
    var cached = sessionStorage.getItem(cacheKey);
    if (cached === 'enabled') {
      location.replace('/maintenance.html');
    }
    return;
  }

  fetch(SUPABASE_URL + '/rest/v1/contenido_sitio?clave=eq.maintenance_mode&select=valor', {
    headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON },
    signal: AbortSignal.timeout(2500)
  })
    .then(function(r) { 
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json(); 
    })
    .then(function(d) { 
      var enabled = d?.[0]?.valor?.enabled === true;
      sessionStorage.setItem(cacheKey, enabled ? 'enabled' : 'disabled');
      sessionStorage.setItem(cacheKey + '_time', Date.now().toString());
      if (enabled) location.replace('/maintenance.html'); 
    })
    .catch(function(err) { 
      // Silently handle 401/403/adblock - fail open
      if (err?.name !== 'AbortError') {
        console.debug('Maintenance check skipped:', err?.message || err);
      }
    });
})();