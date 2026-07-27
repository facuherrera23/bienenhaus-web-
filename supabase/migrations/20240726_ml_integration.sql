-- supabase/migrations/20240726_ml_integration.sql
-- ML Integration tables for MercadoLibre sync

-- ML OAuth PKCE storage
CREATE TABLE IF NOT EXISTS ml_oauth_pkce (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_verifier TEXT NOT NULL,
    code_challenge TEXT NOT NULL,
    state TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ml_oauth_pkce_state ON ml_oauth_pkce(state);
CREATE INDEX idx_ml_oauth_pkce_user ON ml_oauth_pkce(user_id);

-- ML Webhook log
CREATE TABLE IF NOT EXISTS ml_webhook_log (
    id BIGSERIAL PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    resource_id TEXT,
    user_id UUID REFERENCES auth.users(id),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ml_webhook_log_event ON ml_webhook_log(event_id);
CREATE INDEX idx_ml_webhook_log_type ON ml_webhook_log(event_type);
CREATE INDEX idx_ml_webhook_log_user ON ml_webhook_log(user_id);
CREATE INDEX idx_ml_webhook_log_created ON ml_webhook_log(created_at);

-- ML Sync log
CREATE TABLE IF NOT EXISTS ml_sync_log (
    id BIGSERIAL PRIMARY KEY,
    propiedad_id UUID NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
    accion TEXT NOT NULL, -- 'publish', 'update', 'unpublish', 'import'
    ml_item_id TEXT,
    estado TEXT,
    detalle JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ml_sync_log_propiedad ON ml_sync_log(propiedad_id);
CREATE INDEX idx_ml_sync_log_user ON ml_sync_log(user_id);
CREATE INDEX idx_ml_sync_log_created ON ml_sync_log(created_at);

-- Price alerts
CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    min_price NUMERIC DEFAULT 0,
    max_price NUMERIC,
    location TEXT,
    property_type TEXT DEFAULT 'todos',
    operation TEXT DEFAULT 'ambos',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered TIMESTAMPTZ
);

CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_active ON price_alerts(active);

-- WhatsApp leads
CREATE TABLE IF NOT EXISTS whatsapp_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT,
    source TEXT, -- 'property_detail', 'sticky_cta', 'floating_btn', 'modal'
    property_id UUID REFERENCES propiedades(id),
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_leads_property ON whatsapp_leads(property_id);
CREATE INDEX idx_whatsapp_leads_created ON whatsapp_leads(created_at);

-- ML OAuth PKCE table (temporary storage)
ALTER TABLE ml_oauth_pkce ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own PKCE" ON ml_oauth_pkce
    FOR ALL USING (auth.uid() = user_id);

-- Webhook log policies
ALTER TABLE ml_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook log" ON ml_webhook_log
    FOR ALL USING (auth.role() = 'service_role');

-- Sync log policies
ALTER TABLE ml_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync log" ON ml_sync_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sync log" ON ml_sync_log
    FOR ALL USING (auth.role() = 'service_role');

-- Price alerts policies
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alerts" ON price_alerts
    FOR ALL USING (auth.uid() = user_id);

-- WhatsApp leads policies
ALTER TABLE whatsapp_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage leads" ON whatsapp_leads
    FOR ALL USING (auth.role() = 'service_role');

-- Add ML columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ml_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ml_user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ml_access_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ml_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ml_token_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ml_token_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ml_scope TEXT;

-- Add ML columns to propiedades
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS ml_item_id TEXT UNIQUE;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS ml_status TEXT;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS ml_price NUMERIC;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS ml_available_quantity INTEGER;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS ml_sold_quantity INTEGER DEFAULT 0;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS ml_last_sync TIMESTAMPTZ;
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS ml_sync_status TEXT DEFAULT 'not_connected';

CREATE INDEX idx_propiedades_ml_item ON propiedades(ml_item_id);
CREATE INDEX idx_propiedades_ml_sync ON propiedades(ml_sync_status);

-- Enable RLS on new columns
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update own ML fields" ON profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Function to get valid ML token (refreshes if needed)
CREATE OR REPLACE FUNCTION get_valid_ml_token(user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    token_data RECORD;
    new_token TEXT;
BEGIN
    -- Get current token data
    SELECT ml_access_token, ml_refresh_token, ml_token_expires_at
    INTO token_data
    FROM profiles
    WHERE id = user_id;
    
    IF token_data.ml_access_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Check if token is still valid (5 min buffer)
    IF token_data.ml_token_expires_at > NOW() + INTERVAL '5 minutes' THEN
        RETURN token_data.ml_access_token;
    END IF;
    
    -- Token expired, need to refresh
    -- This would need to be implemented in Edge Function
    -- For now return NULL to indicate refresh needed
    RETURN NULL;
END $$;

-- Trigger to log ML sync changes
CREATE OR REPLACE FUNCTION log_ml_sync()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND (
        OLD.ml_status IS DISTINCT FROM NEW.ml_status OR
        OLD.ml_price IS DISTINCT FROM NEW.ml_price OR
        OLD.ml_status IS DISTINCT FROM NEW.ml_status
    ) THEN
        INSERT INTO ml_sync_log (propiedad_id, accion, ml_item_id, estado, detalle, user_id)
        VALUES (
            NEW.id,
            'auto_sync',
            NEW.ml_item_id,
            NEW.ml_status,
            jsonb_build_object(
                'old_price', OLD.ml_price,
                'new_price', NEW.ml_price,
                'old_status', OLD.ml_status,
                'new_status', NEW.ml_status
            ),
            NEW.user_id
        );
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trigger_ml_sync_log
    AFTER UPDATE ON propiedades
    FOR EACH ROW EXECUTE FUNCTION log_ml_sync();