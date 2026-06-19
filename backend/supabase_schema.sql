-- GreenBit Supabase PostgreSQL Database Schema
-- Run this in your Supabase SQL Editor to initialize tables.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CALCULATOR RECORDS TABLE
CREATE TABLE IF NOT EXISTS calculator_records (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    travel_distance NUMERIC NOT NULL CHECK (travel_distance >= 0),
    fuel_type VARCHAR(50) NOT NULL,
    electricity_usage NUMERIC NOT NULL CHECK (electricity_usage >= 0),
    diet_preference VARCHAR(50) NOT NULL,
    waste_generation NUMERIC NOT NULL CHECK (waste_generation >= 0),
    daily_footprint NUMERIC NOT NULL CHECK (daily_footprint >= 0),
    monthly_footprint NUMERIC NOT NULL CHECK (monthly_footprint >= 0),
    yearly_footprint NUMERIC NOT NULL CHECK (yearly_footprint >= 0),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DAILY ACTIVITIES TABLE
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    value NUMERIC NOT NULL CHECK (value >= 0),
    impact NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- GOALS TABLE
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    target_value NUMERIC NOT NULL CHECK (target_value >= 0),
    current_value NUMERIC NOT NULL DEFAULT 0 CHECK (current_value >= 0),
    unit VARCHAR(25),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    date_created DATE NOT NULL DEFAULT CURRENT_DATE
);

-- SIMULATION HISTORY TABLE
CREATE TABLE IF NOT EXISTS simulations (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    commute_shift NUMERIC NOT NULL CHECK (commute_shift >= 0),
    ac_reduction NUMERIC NOT NULL CHECK (ac_reduction >= 0),
    vegetarian_meals INT NOT NULL CHECK (vegetarian_meals >= 0),
    current_emissions NUMERIC NOT NULL CHECK (current_emissions >= 0),
    future_emissions NUMERIC NOT NULL CHECK (future_emissions >= 0),
    savings_percent NUMERIC NOT NULL,
    annual_impact NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- INDEXES FOR RETRIEVAL OPTIMIZATION
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_calculator_user ON calculator_records(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_user ON simulations(user_id);
