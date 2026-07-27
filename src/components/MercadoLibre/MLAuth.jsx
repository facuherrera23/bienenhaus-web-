// ================================================================
// ML AUTH PROTOTYPE - PKCE Flow with sessionStorage backup
// ================================================================

import { useState, useEffect, useCallback } from 'preact/hooks';
import { supabase } from '../../supabase.js';
import './MLAuth.css';

export function MLAuth({ 
  onConnect, 
  onDisconnect, 
  initialStatus = null 
}) {
  const [status, setStatus] = useState(initialStatus || {
    connected: false,
    connecting: false,
    userId: null,
    expiresAt: null
  });
  const [error, setError] = useState(null);
  
  // PKCE state
  const [pkce, setPkce] = useState(null);

  // Generate PKCE challenge
  const generatePKCE = useCallback(() => {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const state = generateState();
    
    const pkceData = { verifier, challenge, state };
    setPkce(pkceData);
    
    // Store in sessionStorage for page reload recovery
    sessionStorage.setItem('ml_pkce', JSON.stringify(pkceData));
    
    return pkceData;
  }, []);

  // Restore PKCE from sessionStorage on load
  useEffect(() => {
    const stored = sessionStorage.getItem('ml_pkce');
    if (stored) {
      try {
        setPkce(JSON.parse(stored));
      } catch (e) {
        sessionStorage.removeItem('ml_pkce');
      }
    }
  }, []);

  // Initiate ML OAuth
  const handleConnect = useCallback(async () => {
    setStatus(prev => ({ ...prev, connecting: true }));
    setError(null);

    try {
      // Generate PKCE if not exists
      if (!pkce) {
        generatePKCE();
        // Wait for state update
        await new Promise(r => setTimeout(r, 0));
      }

      const { data, error } = await supabase.functions.invoke('ml-oauth-init', {
        body: {
          code_challenge: pkce?.challenge,
          code_challenge_method: 'S256',
          state: pkce?.state,
          redirect_uri: `${window.location.origin}/ml-callback`
        }
      });

      if (error) throw error;

      if (data?.auth_url) {
        // Store verifier for callback
        sessionStorage.setItem('ml_oauth_verifier', pkce.verifier);
        sessionStorage.setItem('ml_oauth_state', pkce.state);
        
        // Redirect to ML OAuth
        window.location.href = data.auth_url;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (err) {
      console.error('ML Connect error:', err);
      setError(err.message || 'Error al conectar con MercadoLibre');
      setStatus(prev => ({ ...prev, connecting: false }));
    }
  }, [pkce]);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        setError(`ML OAuth error: ${error}`);
        cleanupAuthState();
        return;
      }

      if (!code || !state) return; // Not a callback

      const storedState = sessionStorage.getItem('ml_oauth_state');
      const verifier = sessionStorage.getItem('ml_oauth_verifier');

      if (!verifier || state !== storedState) {
        setError('Estado OAuth inválido. Intenta nuevamente.');
        cleanupAuthState();
        return;
      }

      setStatus(prev => ({ ...prev, connecting: true }));

      try {
        const { data, error } = await supabase.functions.invoke('ml-oauth-callback', {
          body: { code, verifier, state }
        });

        if (error) throw error;

        if (data?.connected) {
          setStatus({
            connected: true,
            connecting: false,
            userId: data.user_id,
            expiresAt: data.expires_at
          });
          
          // Cleanup
          cleanupAuthState();
          onConnect?.(data);
        } else {
          throw new Error(data?.error || 'Error en callback');
        }
      } catch (err) {
        console.error('ML Callback error:', err);
        setError(err.message || 'Error al completar conexión');
        setStatus(prev => ({ ...prev, connecting: false }));
      } finally {
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    handleCallback();
  }, [onConnect]);

  const handleDisconnect = useCallback(async () => {
    setStatus(prev => ({ ...prev, connecting: true }));
    
    try {
      const { error } = await supabase.functions.invoke('ml-disconnect');
      if (error) throw error;

      setStatus({
        connected: false,
        connecting: false,
        userId: null,
        expiresAt: null
      });
      onDisconnect?.();
    } catch (err) {
      console.error('ML Disconnect error:', err);
      setError(err.message);
      setStatus(prev => ({ ...prev, connecting: false }));
    }
  }, [onDisconnect]);

  const cleanupAuthState = () => {
    sessionStorage.removeItem('ml_pkce');
    sessionStorage.removeItem('ml_oauth_verifier');
    sessionStorage.removeItem('ml_oauth_state');
  };

  // Render
  if (status.connecting) {
    return (
      <div className="ml-auth__connecting">
        <div className="spinner" aria-label="Conectando..."></div>
        <p>Conectando con MercadoLibre...</p>
      </div>
    );
  }

  return (
    <div className="ml-auth">
      {error && <div className="ml-auth__error" role="alert">{error}</div>}
      
      {status.connected ? (
        <div className="ml-auth__connected">
          <div className="ml-auth__status">
            <i className="fas fa-check-circle" aria-hidden="true"></i>
            <span>Conectado como {status.userId}</span>
          </div>
          {status.expiresAt && (
            <p className="ml-auth__expires">
              Expira: {new Date(status.expiresAt).toLocaleString('es-AR')}
            </p>
          )}
          <button 
            className="btn btn-danger"
            onClick={handleDisconnect}
            disabled={status.connecting}
          >
            <i className="fas fa-unlink" aria-hidden="true"></i>
            Desconectar
          </button>
        </div>
      ) : (
        <button 
          className="btn btn-primary ml-auth__connect-btn"
          onClick={handleConnect}
          disabled={status.connecting}
        >
          <i className="fab fa-mercadolibre" aria-hidden="true"></i>
          Conectar MercadoLibre
        </button>
      )}

      {error && <p className="ml-auth__error" role="alert">{error}</p>}
    </div>
  );
}

// PKCE Helpers
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlencode(array);
}

function generateCodeChallenge(verifier) {
  return crypto.subtle.digest('SHA-256', stringToArrayBuffer(verifier))
    .then(digest => base64urlencode(new Uint8Array(digest)));
}

function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlencode(array);
}

function base64urlencode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function stringToArrayBuffer(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlencode(array);
}

function generateCodeChallenge(verifier) {
  return crypto.subtle.digest('SHA-256', stringToArrayBuffer(verifier))
    .then(digest => base64urlencode(new Uint8Array(digest)));
}

function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64urlencode(array);
}

function base64urlencode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function stringToArrayBuffer(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

export default MLAuth;