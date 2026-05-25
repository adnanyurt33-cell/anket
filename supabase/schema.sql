-- Drop existing tables (Optional, use with caution)
DROP TABLE IF EXISTS response_answers;
DROP TABLE IF EXISTS responses;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS surveys;

-- Surveys Table
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
  type TEXT DEFAULT 'text',
  options JSONB DEFAULT '[]'::jsonb,
  image TEXT DEFAULT '',
  "isRequired" BOOLEAN DEFAULT true,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Responses Table
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

-- ANON role yetkileri
GRANT ALL ON TABLE public.surveys TO anon;
GRANT ALL ON TABLE public.questions TO anon;
GRANT ALL ON TABLE public.responses TO anon;
GRANT ALL ON TABLE public.response_answers TO anon;

-- Güvenlik Politikaları (Tam Açık Erişim)
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON public.surveys FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON public.questions FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON public.responses FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.response_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_access" ON public.response_answers FOR ALL TO anon USING (true) WITH CHECK (true);

-- Enable Realtime for Responses table
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table responses;
