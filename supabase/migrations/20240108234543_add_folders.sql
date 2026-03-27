--------------- FOLDERS ---------------

-- TABLE --

CREATE TABLE IF NOT EXISTS folders (
    -- ID
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- RELATIONSHIPS
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- METADATA
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ,

    -- REQUIRED
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL
);

-- INDEXES --

CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders(user_id);
CREATE INDEX IF NOT EXISTS folders_workspace_id_idx ON folders(workspace_id);

-- RLS --

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Allow full access to own folders"
      ON folders
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- TRIGGERS --

DROP TRIGGER IF EXISTS update_folders_updated_at ON public.folders;
CREATE TRIGGER update_folders_updated_at
BEFORE UPDATE ON folders
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();