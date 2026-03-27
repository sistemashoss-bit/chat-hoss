--------------- MODELS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS models (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- OPTIONAL RELATIONSHIPS
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- SHARING
    sharing TEXT NOT NULL DEFAULT 'private',

    -- REQUIRED
    api_key TEXT NOT NULL CHECK (char_length(api_key) <= 1000),
    base_url TEXT NOT NULL CHECK (char_length(base_url) <= 1000),
    description TEXT NOT NULL CHECK (char_length(description) <= 500),
    model_id TEXT NOT NULL CHECK (char_length(model_id) <= 1000),
    name TEXT NOT NULL CHECK (char_length(name) <= 100)
);

-- INDEXES --

CREATE INDEX IF NOT EXISTS models_user_id_idx ON models(user_id);

-- RLS --

ALTER TABLE models ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Allow full access to own models"
      ON models
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Allow view access to non-private models"
      ON models
      FOR SELECT
      USING (sharing <> 'private');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- TRIGGERS --

DROP TRIGGER IF EXISTS update_models_updated_at ON public.models;
CREATE TRIGGER update_models_updated_at
BEFORE UPDATE ON models 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();

--------------- MODEL WORKSPACES ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS model_workspaces (
    -- REQUIRED RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    PRIMARY KEY(model_id, workspace_id),

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ
);

-- INDEXES --

CREATE INDEX IF NOT EXISTS model_workspaces_user_id_idx ON model_workspaces(user_id);
CREATE INDEX IF NOT EXISTS model_workspaces_model_id_idx ON model_workspaces(model_id);
CREATE INDEX IF NOT EXISTS model_workspaces_workspace_id_idx ON model_workspaces(workspace_id);

-- RLS --

ALTER TABLE model_workspaces ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Allow full access to own model_workspaces"
      ON model_workspaces
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- TRIGGERS --

DROP TRIGGER IF EXISTS update_model_workspaces_updated_at ON public.model_workspaces;
CREATE TRIGGER update_model_workspaces_updated_at
BEFORE UPDATE ON model_workspaces 
FOR EACH ROW 
EXECUTE PROCEDURE update_updated_at_column();
