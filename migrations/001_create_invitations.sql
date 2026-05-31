-- ============================================
-- Enkarta — Digital Invitations Schema
-- Migration 001: Create invitations table
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready')),
  template TEXT NOT NULL DEFAULT 'perla' CHECK (template IN ('perla', 'marmol', 'terra', 'sobre', 'carmesi', 'gerbera')),
  type TEXT NOT NULL DEFAULT 'boda' CHECK (type IN ('boda', 'xv', 'cumpleanos', 'baby_shower', 'bautizo')),

  -- Datos principales
  names TEXT, -- "Camila & Alejandro"
  event_date DATE,
  ceremony_time TEXT,
  ceremony_place TEXT,
  ceremony_address TEXT,
  reception_time TEXT,
  reception_place TEXT,
  reception_address TEXT,

  -- Personalización del invitado
  guest_name TEXT,
  guest_passes INTEGER DEFAULT 1,

  -- Contenido opcional
  message TEXT,
  dress_code TEXT,
  no_kids BOOLEAN DEFAULT false,
  parents_groom TEXT, -- JSON array de strings
  parents_bride TEXT, -- JSON array de strings
  sponsors TEXT, -- JSON array de {role, names}
  itinerary TEXT, -- JSON array de {time, label}
  gift_message TEXT,
  bank_account TEXT,
  cover_image_url TEXT,
  gallery_url TEXT, -- Link externo (Google Photos)

  -- Colores personalizables
  color_primary TEXT DEFAULT '#B8975A',
  color_secondary TEXT DEFAULT '#FAF7F2',
  color_accent TEXT DEFAULT '#2C2519',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  phone_raw TEXT -- Datos crudos del bot de WhatsApp
);

-- Index para búsquedas rápidas por slug
CREATE INDEX IF NOT EXISTS idx_invitations_slug ON invitations(slug);

-- Index para filtrar por status
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede ver invitaciones publicadas (status = 'ready')
CREATE POLICY "Public can view ready invitations"
  ON invitations
  FOR SELECT
  USING (status = 'ready');

-- Política: Service role tiene acceso completo (para el admin y API)
CREATE POLICY "Service role has full access"
  ON invitations
  FOR ALL
  USING (true)
  WITH CHECK (true);
