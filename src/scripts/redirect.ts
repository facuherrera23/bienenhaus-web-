// ================================================================
// REDIRECT HANDLING - Runs before app initialization
// Handles sessionStorage redirect for production
// ================================================================

export function handleRedirect(): void {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const path = window.location.pathname;
    if (path !== '/' && path !== '/bienenhaus-web-/') {
      sessionStorage.redirect = location.href;
      window.location.replace('/');
    }
  }
}

export function restoreRedirect(): void {
  if (sessionStorage.redirect) {
    window.location.replace(sessionStorage.redirect);
    sessionStorage.removeItem('redirect');
  }
}

// Run immediately
handleRedirect();
restoreRedirect();

// Export empty for module side-effect
export {};