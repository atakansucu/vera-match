-- Kindred — seed data for local Supabase development.
-- Mirrors src/services/backend/seed.ts so `supabase db reset` gives a comparable
-- dataset for testing the real Postgres backend.
--
-- Uses deterministic UUIDs so references are stable across resets.
-- Password for all seed users: password123

-- =========================================================================
-- 0. Auth users (GoTrue)
-- =========================================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token,
  email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'demo@kindred.app',          crypt('password123', gen_salt('bf')), '2026-08-07T09:00:00Z', '{"provider":"email","providers":["email"]}', '{}', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'liam@seed.kindred.app',     crypt('password123', gen_salt('bf')), '2026-08-07T09:00:00Z', '{"provider":"email","providers":["email"]}', '{}', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'david@seed.kindred.app',    crypt('password123', gen_salt('bf')), '2026-08-07T09:00:00Z', '{"provider":"email","providers":["email"]}', '{}', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', 'noah@seed.kindred.app',     crypt('password123', gen_salt('bf')), '2026-08-07T09:00:00Z', '{"provider":"email","providers":["email"]}', '{}', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000005', 'authenticated', 'authenticated', 'mateo@seed.kindred.app',    crypt('password123', gen_salt('bf')), '2026-08-07T09:00:00Z', '{"provider":"email","providers":["email"]}', '{}', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000006', 'authenticated', 'authenticated', 'jonas@seed.kindred.app',    crypt('password123', gen_salt('bf')), '2026-08-07T09:00:00Z', '{"provider":"email","providers":["email"]}', '{}', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000007', 'authenticated', 'authenticated', 'emil@seed.kindred.app',     crypt('password123', gen_salt('bf')), '2026-08-07T09:00:00Z', '{"provider":"email","providers":["email"]}', '{}', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000008', 'authenticated', 'authenticated', 'ben@seed.kindred.app',      crypt('password123', gen_salt('bf')), '2026-08-07T09:00:00Z', '{"provider":"email","providers":["email"]}', '{}', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-000000000009', 'authenticated', 'authenticated', 'sophia@seed.kindred.app',   crypt('password123', gen_salt('bf')), '2026-08-07T09:00:00Z', '{"provider":"email","providers":["email"]}', '{}', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-00000000000a', 'authenticated', 'authenticated', 'elif@seed.kindred.app',     crypt('password123', gen_salt('bf')), '2026-08-07T09:00:00Z', '{"provider":"email","providers":["email"]}', '{}', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-a000-00000000000b', 'authenticated', 'authenticated', 'maya@seed.kindred.app',     crypt('password123', gen_salt('bf')), '2026-08-07T09:00:00Z', '{"provider":"email","providers":["email"]}', '{}', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '', '', '', '');

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', '{"sub":"00000000-0000-4000-a000-000000000001","email":"demo@kindred.app"}',        'email', '00000000-0000-4000-a000-000000000001', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000002', '{"sub":"00000000-0000-4000-a000-000000000002","email":"liam@seed.kindred.app"}',   'email', '00000000-0000-4000-a000-000000000002', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000003', '{"sub":"00000000-0000-4000-a000-000000000003","email":"david@seed.kindred.app"}',  'email', '00000000-0000-4000-a000-000000000003', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000004', '{"sub":"00000000-0000-4000-a000-000000000004","email":"noah@seed.kindred.app"}',   'email', '00000000-0000-4000-a000-000000000004', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000005', '{"sub":"00000000-0000-4000-a000-000000000005","email":"mateo@seed.kindred.app"}',  'email', '00000000-0000-4000-a000-000000000005', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000006', '00000000-0000-4000-a000-000000000006', '{"sub":"00000000-0000-4000-a000-000000000006","email":"jonas@seed.kindred.app"}',  'email', '00000000-0000-4000-a000-000000000006', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000007', '00000000-0000-4000-a000-000000000007', '{"sub":"00000000-0000-4000-a000-000000000007","email":"emil@seed.kindred.app"}',   'email', '00000000-0000-4000-a000-000000000007', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000008', '00000000-0000-4000-a000-000000000008', '{"sub":"00000000-0000-4000-a000-000000000008","email":"ben@seed.kindred.app"}',    'email', '00000000-0000-4000-a000-000000000008', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000009', '00000000-0000-4000-a000-000000000009', '{"sub":"00000000-0000-4000-a000-000000000009","email":"sophia@seed.kindred.app"}', 'email', '00000000-0000-4000-a000-000000000009', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000a', '{"sub":"00000000-0000-4000-a000-00000000000a","email":"elif@seed.kindred.app"}',   'email', '00000000-0000-4000-a000-00000000000a', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-00000000000b', '00000000-0000-4000-a000-00000000000b', '{"sub":"00000000-0000-4000-a000-00000000000b","email":"maya@seed.kindred.app"}',   'email', '00000000-0000-4000-a000-00000000000b', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z', '2026-08-07T09:00:00Z');

-- =========================================================================
-- 1. Profiles
-- =========================================================================
-- Timestamps: created_at = T0 − 25 days, onboarding_completed_at = T0 − 20 days
-- where T0 = 2026-09-01 09:00 UTC.

insert into public.profiles (
  id, display_name, date_of_birth, gender, city, area,
  approx_lat, approx_lng, occupation, show_occupation, bio,
  smokes, moderation_status, verification_status,
  onboarding_completed_at, created_at
) values
  ('00000000-0000-4000-a000-000000000001', 'Ava',    '1999-04-12', 'woman', 'Munich', 'Maxvorstadt',        48.147, 11.567, 'Architecture MSc',   true, 'Slow mornings, long museum afternoons, and a good bookshop are my ideal Saturday.', 'no',  'active', 'selfie_verified',  '2026-08-12T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000002', 'Liam',   '1997-02-20', 'man',   'Munich', 'Schwabing',          48.161, 11.586, 'Product designer',   true, 'Cyclist, amateur potter, and a firm believer that the best plans are made a week ahead.', 'no', 'active', 'selfie_verified', '2026-08-12T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000003', 'David',  '1995-11-05', 'man',   'Munich', 'Glockenbachviertel', 48.130, 11.573, 'Data scientist',     true, 'Runner, ramen obsessive, and always up for a spontaneous weekend trip.', 'no', 'active', 'selfie_verified', '2026-08-12T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000004', 'Noah',   '1998-07-19', 'man',   'Munich', 'Haidhausen',         48.130, 11.600, 'Musician',           true, 'Late nights, spontaneous gigs, and a very full social calendar.', 'no', 'active', 'email_verified', '2026-08-12T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000005', 'Mateo',  '2000-01-30', 'man',   'Munich', 'Neuhausen',          48.155, 11.540, 'Startup founder',    true, 'Building something ambitious. Weekends are for recharging and good espresso.', 'no', 'active', 'selfie_verified', '2026-08-12T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000006', 'Jonas',  '1996-05-14', 'man',   'Munich', 'Sendling',           48.121, 11.545, 'Chef',               true, 'Cigarette on the balcony, wine with friends, and long dinners that run past midnight.', 'yes', 'active', 'email_verified', '2026-08-12T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000007', 'Emil',   '1994-09-02', 'man',   'Munich', 'Bogenhausen',        48.150, 11.620, 'Lawyer',             true, 'Settled, certain about the big things, and looking for the same.', 'no', 'active', 'selfie_verified', '2026-08-12T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000008', 'Ben',    '1997-12-11', 'man',   'Munich', 'Au',                 48.123, 11.580, 'Journalist',         true, 'Curious about everything. Ask me about the last thing I fell down a rabbit hole on.', 'no', 'active', 'selfie_verified', '2026-08-12T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-000000000009', 'Sophia', '1998-03-08', 'woman', 'Munich', 'Schwabing',          48.160, 11.580, 'Researcher',         true, 'Climbing, cold-water swimming, and quiet Sundays.', 'no', 'active', 'selfie_verified', '2026-08-12T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-00000000000a', 'Elif',   '1996-06-25', 'woman', 'Munich', 'Maxvorstadt',        48.148, 11.570, 'Doctor',             true, 'Long shifts, longer coffees. Looking for calm and warmth.', 'no', 'active', 'selfie_verified', '2026-08-12T09:00:00Z', '2026-08-07T09:00:00Z'),
  ('00000000-0000-4000-a000-00000000000b', 'Maya',   '2001-10-17', 'woman', 'Munich', 'Glockenbachviertel', 48.131, 11.574, 'Illustrator',        true, 'Sketchbooks, second-hand shops, and very strong opinions about typography.', 'no', 'active', 'email_verified', '2026-08-12T09:00:00Z', '2026-08-07T09:00:00Z');

-- =========================================================================
-- 2. Dating preferences
-- =========================================================================

insert into public.dating_preferences (
  user_id, preferred_genders, min_age, max_age, max_distance_km,
  relationship_goal, smoking_dealbreaker, children_intent, children_dealbreaker
) values
  ('00000000-0000-4000-a000-000000000001', '{woman}',     25, 33, 25, 'long_term',    true,  'open',      false), -- Ava — prefers men but we match via preferred_genders
  ('00000000-0000-4000-a000-000000000002', '{woman}',     24, 32, 20, 'long_term',    false, 'open',      false), -- Liam
  ('00000000-0000-4000-a000-000000000003', '{woman}',     24, 33, 30, 'long_term',    false, 'open',      false), -- David
  ('00000000-0000-4000-a000-000000000004', '{woman}',     23, 32, 25, 'long_term',    false, 'open',      false), -- Noah
  ('00000000-0000-4000-a000-000000000005', '{woman}',     24, 31, 20, 'long_term',    false, 'open',      false), -- Mateo
  ('00000000-0000-4000-a000-000000000006', '{woman}',     24, 34, 25, 'long_term',    false, 'open',      false), -- Jonas
  ('00000000-0000-4000-a000-000000000007', '{woman}',     24, 32, 20, 'life_partner', false, 'dont_want', true),  -- Emil
  ('00000000-0000-4000-a000-000000000008', '{woman}',     24, 33, 30, 'long_term',    false, 'open',      false), -- Ben
  ('00000000-0000-4000-a000-000000000009', '{woman}',     24, 32, 20, 'long_term',    false, 'open',      false), -- Sophia
  ('00000000-0000-4000-a000-00000000000a', '{man}',       27, 36, 25, 'life_partner', true,  'want',      true),  -- Elif
  ('00000000-0000-4000-a000-00000000000b', '{man,woman}', 22, 30, 15, 'short_term',   false, 'unsure',    false); -- Maya

-- Fix: Ava prefers men, not women (TypeScript seed has preferredGenders: ['man']).
update public.dating_preferences
  set preferred_genders = '{man}'
  where user_id = '00000000-0000-4000-a000-000000000001';

-- =========================================================================
-- 3. Sensitive consents (3 per person)
-- =========================================================================

insert into public.sensitive_consents (user_id, consent_type, granted, granted_at, version)
select
  p.id,
  ct.consent_type,
  true,
  '2026-08-12T09:00:00Z'::timestamptz,
  '1.0'
from public.profiles p
cross join (
  values ('partner_gender_matching'::consent_type),
         ('photo_processing'::consent_type),
         ('ai_processing'::consent_type)
) as ct(consent_type);

-- =========================================================================
-- 4. Profile photos (2 per person, pravatar.cc placeholders)
-- =========================================================================

insert into public.profile_photos (user_id, storage_path, position, is_primary, moderation_status) values
  -- Ava (img 5, 6)
  ('00000000-0000-4000-a000-000000000001', 'https://i.pravatar.cc/600?img=5',  0, true,  'active'),
  ('00000000-0000-4000-a000-000000000001', 'https://i.pravatar.cc/600?img=6',  1, false, 'active'),
  -- Liam (img 12, 13)
  ('00000000-0000-4000-a000-000000000002', 'https://i.pravatar.cc/600?img=12', 0, true,  'active'),
  ('00000000-0000-4000-a000-000000000002', 'https://i.pravatar.cc/600?img=13', 1, false, 'active'),
  -- David (img 15, 16)
  ('00000000-0000-4000-a000-000000000003', 'https://i.pravatar.cc/600?img=15', 0, true,  'active'),
  ('00000000-0000-4000-a000-000000000003', 'https://i.pravatar.cc/600?img=16', 1, false, 'active'),
  -- Noah (img 33, 34)
  ('00000000-0000-4000-a000-000000000004', 'https://i.pravatar.cc/600?img=33', 0, true,  'active'),
  ('00000000-0000-4000-a000-000000000004', 'https://i.pravatar.cc/600?img=34', 1, false, 'active'),
  -- Mateo (img 51, 52)
  ('00000000-0000-4000-a000-000000000005', 'https://i.pravatar.cc/600?img=51', 0, true,  'active'),
  ('00000000-0000-4000-a000-000000000005', 'https://i.pravatar.cc/600?img=52', 1, false, 'active'),
  -- Jonas (img 60, 61)
  ('00000000-0000-4000-a000-000000000006', 'https://i.pravatar.cc/600?img=60', 0, true,  'active'),
  ('00000000-0000-4000-a000-000000000006', 'https://i.pravatar.cc/600?img=61', 1, false, 'active'),
  -- Emil (img 68, 69)
  ('00000000-0000-4000-a000-000000000007', 'https://i.pravatar.cc/600?img=68', 0, true,  'active'),
  ('00000000-0000-4000-a000-000000000007', 'https://i.pravatar.cc/600?img=69', 1, false, 'active'),
  -- Ben (img 11, 12) — note: 12 overlaps with Liam but that is fine for placeholders
  ('00000000-0000-4000-a000-000000000008', 'https://i.pravatar.cc/600?img=11', 0, true,  'active'),
  ('00000000-0000-4000-a000-000000000008', 'https://i.pravatar.cc/600?img=12', 1, false, 'active'),
  -- Sophia (img 20, 21)
  ('00000000-0000-4000-a000-000000000009', 'https://i.pravatar.cc/600?img=20', 0, true,  'active'),
  ('00000000-0000-4000-a000-000000000009', 'https://i.pravatar.cc/600?img=21', 1, false, 'active'),
  -- Elif (img 45, 46)
  ('00000000-0000-4000-a000-00000000000a', 'https://i.pravatar.cc/600?img=45', 0, true,  'active'),
  ('00000000-0000-4000-a000-00000000000a', 'https://i.pravatar.cc/600?img=46', 1, false, 'active'),
  -- Maya (img 26, 27)
  ('00000000-0000-4000-a000-00000000000b', 'https://i.pravatar.cc/600?img=26', 0, true,  'active'),
  ('00000000-0000-4000-a000-00000000000b', 'https://i.pravatar.cc/600?img=27', 1, false, 'active');

-- =========================================================================
-- 5. User claims (all stated, confirmed, onboarding_answer)
-- =========================================================================

insert into public.user_claims (
  id, user_id, dimension, value, claim_type, confidence,
  importance, status, source_type, created_at, updated_at
) values
  -- Ava (4 claims)
  ('f0000000-0000-4000-a001-000000000001', '00000000-0000-4000-a000-000000000001', 'independence',      'independent', 'stated', 'explicit_high', 4, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a001-000000000002', '00000000-0000-4000-a000-000000000001', 'planning_style',    'planner',     'stated', 'explicit_high', 4, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a001-000000000003', '00000000-0000-4000-a000-000000000001', 'social_frequency',  'balanced',    'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a001-000000000004', '00000000-0000-4000-a000-000000000001', 'work_life_balance', 'balanced',    'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  -- Liam (4 claims)
  ('f0000000-0000-4000-a002-000000000001', '00000000-0000-4000-a000-000000000002', 'independence',      'independent', 'stated', 'explicit_high', 4, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a002-000000000002', '00000000-0000-4000-a000-000000000002', 'planning_style',    'planner',     'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a002-000000000003', '00000000-0000-4000-a000-000000000002', 'social_frequency',  'balanced',    'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a002-000000000004', '00000000-0000-4000-a000-000000000002', 'emotional_openness','open',        'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  -- David (2 claims)
  ('f0000000-0000-4000-a003-000000000001', '00000000-0000-4000-a000-000000000003', 'independence',      'balanced',    'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a003-000000000002', '00000000-0000-4000-a000-000000000003', 'emotional_openness','open',        'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  -- Noah (3 claims)
  ('f0000000-0000-4000-a004-000000000001', '00000000-0000-4000-a000-000000000004', 'planning_style',    'spontaneous', 'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a004-000000000002', '00000000-0000-4000-a000-000000000004', 'independence',      'togetherness','stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a004-000000000003', '00000000-0000-4000-a000-000000000004', 'social_frequency',  'social',      'stated', 'explicit_high', 4, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  -- Mateo (3 claims)
  ('f0000000-0000-4000-a005-000000000001', '00000000-0000-4000-a000-000000000005', 'work_life_balance', 'work_focused','stated', 'explicit_high', 4, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a005-000000000002', '00000000-0000-4000-a000-000000000005', 'ambition',          'driven',      'stated', 'explicit_high', 4, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a005-000000000003', '00000000-0000-4000-a000-000000000005', 'planning_style',    'planner',     'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  -- Jonas (2 claims: social_frequency + alcohol)
  ('f0000000-0000-4000-a006-000000000001', '00000000-0000-4000-a000-000000000006', 'social_frequency',  'social',      'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a006-000000000002', '00000000-0000-4000-a000-000000000006', 'alcohol',           'regular',     'stated', 'explicit_high', 2, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  -- Emil (1 claim)
  ('f0000000-0000-4000-a007-000000000001', '00000000-0000-4000-a000-000000000007', 'long_term_orientation','serious',  'stated', 'explicit_high', 5, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  -- Ben (2 claims)
  ('f0000000-0000-4000-a008-000000000001', '00000000-0000-4000-a000-000000000008', 'work_life_balance', 'work_focused','stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  ('f0000000-0000-4000-a008-000000000002', '00000000-0000-4000-a000-000000000008', 'planning_style',    'spontaneous', 'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  -- Sophia (1 claim)
  ('f0000000-0000-4000-a009-000000000001', '00000000-0000-4000-a000-000000000009', 'activity_level',    'high',        'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  -- Elif (1 claim)
  ('f0000000-0000-4000-a00a-000000000001', '00000000-0000-4000-a000-00000000000a', 'emotional_openness','open',        'stated', 'explicit_high', 4, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z'),
  -- Maya (1 claim)
  ('f0000000-0000-4000-a00b-000000000001', '00000000-0000-4000-a000-00000000000b', 'social_frequency',  'social',      'stated', 'explicit_high', 3, 'confirmed', 'onboarding_answer', '2026-08-12T09:00:00Z', '2026-08-12T09:00:00Z');

-- =========================================================================
-- 6. Introductions
-- =========================================================================

insert into public.introductions (
  id, user_a, user_b, status, rank_score, algo_version, created_at
) values
  -- Ava ↔ Liam: active (pending decision)
  ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', 'active',  0.82, 'heuristic-v1', '2026-08-31T09:00:00Z'),
  -- Ava ↔ David: matched
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', 'matched', 0.71, 'heuristic-v1', '2026-08-26T09:00:00Z'),
  -- Ava ↔ Ben: matched (past, with reflection)
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000008', 'matched', 0.64, 'heuristic-v1', '2026-08-18T09:00:00Z');

-- =========================================================================
-- 7. Introduction decisions (double-blind)
-- =========================================================================

insert into public.introduction_decisions (introduction_id, user_id, decision, decided_at) values
  -- Ava ↔ David: both interested
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000001', 'interested', '2026-08-27T09:00:00Z'),
  ('00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000003', 'interested', '2026-08-27T09:00:00Z'),
  -- Ava ↔ Ben: both interested
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000001', 'interested', '2026-08-19T09:00:00Z'),
  ('00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000008', 'interested', '2026-08-19T09:00:00Z');

-- =========================================================================
-- 8. Matches
-- =========================================================================

insert into public.matches (id, introduction_id, user_a, user_b, created_at) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000002', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', '2026-08-27T09:00:00Z'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-000000000003', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000008', '2026-08-19T09:00:00Z');

-- =========================================================================
-- 9. Conversations
-- =========================================================================

insert into public.conversations (id, match_id, created_at, last_message_at) values
  ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-c000-000000000001', '2026-08-27T09:00:00Z', '2026-08-28T09:00:00Z');

-- =========================================================================
-- 10. Messages
-- =========================================================================

insert into public.messages (id, conversation_id, sender_id, body, created_at, read_at) values
  ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000003',
   'Hi Ava! Your museum-Saturday plan sounds perfect. What are you into lately?',
   '2026-08-27T09:00:00Z', '2026-08-27T09:00:00Z'),
  ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000001',
   'Currently deep in a Bauhaus phase. Also always accepting ramen recommendations.',
   '2026-08-28T09:00:00Z', '2026-08-28T09:00:00Z'),
  ('00000000-0000-4000-e000-000000000003', '00000000-0000-4000-d000-000000000001', '00000000-0000-4000-a000-000000000003',
   'Then I know exactly where we should go. Free next Thursday?',
   '2026-08-28T09:00:00Z', null);

-- =========================================================================
-- 11. Reflection events (private)
-- =========================================================================

insert into public.reflection_events (id, user_id, introduction_id, raw_text, ai_processed, created_at) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000003',
   'Really easy conversation, but it felt like we had completely different attitudes toward planning our week. I still think about how I was cheated on in my last relationship — that stays between us.',
   true, '2026-08-21T09:00:00Z');
