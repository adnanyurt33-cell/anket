-- Drop existing tables (Optional, use with caution)
DROP TABLE IF EXISTS response_answers;
DROP TABLE IF EXISTS responses;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS surveys;

-- Surveys Table (user_id is now just a plain UUID from localstorage)
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  title TEXT NOT NULL,
  require_name BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Questions Table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  type TEXT DEFAULT 'text', -- 'text', 'textarea', 'radio'
  options JSONB DEFAULT '[]'::jsonb, -- Çoktan seçmeli şıklar için
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Responses Table (Participants)
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  respondent_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Response Answers Table
CREATE TABLE response_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS'yi kapatıyoruz çünkü tamamen anonim bir görünmez veritabanı isteniyor.
-- (Verileri frontend'deki adminId filtresiyle ayırıyoruz)
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE response_answers DISABLE ROW LEVEL SECURITY;

-- Enable Realtime for Responses table
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table responses;
