-- ==========================================
-- ESQUEMA DE BASE DE DATOS: GACIP APP
-- ==========================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL
);
INSERT INTO roles (name) VALUES ('sudo'), ('admin'), ('usuario');

-- 2. Tabla de Usuarios (Voluntarios)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- En prod, referenciar a auth.users
    role_id INT REFERENCES roles(id) DEFAULT 3,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    qr_code VARCHAR(255) UNIQUE NOT NULL, -- Cadena única generada para el QR
    total_points INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Asistencia (Control Ultrarrápido)
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE DEFAULT CURRENT_DATE,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- REGLA DE NEGOCIO: Solo 1 asistencia por usuario por día
    CONSTRAINT unique_daily_attendance UNIQUE (user_id, attendance_date)
);

-- 4. Tabla de Perfiles de Liderazgo Transformacional
CREATE TABLE leadership_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Métricas Cuantitativas (Puntuaciones 1-100 o escala Likert)
    idealized_influence INT DEFAULT 0,
    individualized_consideration INT DEFAULT 0,
    inspirational_motivation INT DEFAULT 0,
    intellectual_stimulation INT DEFAULT 0,
    
    -- Métricas Cualitativas
    improvements TEXT,
    weak_areas TEXT,
    strengths TEXT,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- ==========================================
-- (Nota: Adaptar usando auth.uid() en producción con Supabase Auth)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadership_profiles ENABLE ROW LEVEL SECURITY;

-- Ejemplo de política: Un usuario solo puede ver su propio perfil
CREATE POLICY "Users can view own profile" 
ON leadership_profiles FOR SELECT 
USING (user_id = auth.uid());
