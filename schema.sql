-- Supabase PostgreSQL Schema for Math & Science Care Tuition Portal
-- Project URL: https://hfwaxhcphvzoaygalljd.supabase.co

-- 1. Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id TEXT PRIMARY KEY,
    roll INTEGER,
    name TEXT NOT NULL,
    name_bangla TEXT,
    class_level TEXT NOT NULL,
    group_name TEXT NOT NULL,
    batch TEXT NOT NULL,
    batch_time TEXT,
    school TEXT,
    school_roll TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    fathers_name TEXT,
    fathers_phone TEXT,
    mothers_name TEXT,
    mothers_phone TEXT,
    monthly_fee NUMERIC DEFAULT 0,
    admission_date TEXT,
    status TEXT DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

-- 3. Folders Table
CREATE TABLE IF NOT EXISTS public.folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    parent_id TEXT
);

-- 4. Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    subject TEXT NOT NULL,
    chapter TEXT,
    class_level TEXT,
    difficulty TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    is_favorite BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    folder_id TEXT,
    created_at TEXT
);

-- 5. Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    folder_id TEXT,
    language TEXT DEFAULT 'bn',
    last_edited TEXT,
    margins JSONB,
    font_family TEXT,
    font_size INTEGER,
    custom_footer TEXT,
    page_numbers BOOLEAN DEFAULT true
);

-- 6. Presentations Table
CREATE TABLE IF NOT EXISTS public.presentations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slides JSONB DEFAULT '[]'::jsonb,
    theme TEXT DEFAULT 'dark',
    last_edited TEXT
);

-- 7. Activities Table
CREATE TABLE IF NOT EXISTS public.activities (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    type TEXT DEFAULT 'info'
);

-- 8. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    institute_name TEXT DEFAULT 'Math & Science Care',
    logo_url TEXT DEFAULT '',
    theme_accent TEXT DEFAULT 'emerald',
    dark_mode BOOLEAN DEFAULT true,
    custom_footer_text TEXT DEFAULT 'Cared by: Nion Hassan Nirjon',
    auto_save_interval INTEGER DEFAULT 10,
    sms_service_enabled BOOLEAN DEFAULT true
);

-- 9. Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    date TEXT NOT NULL,
    subject TEXT NOT NULL,
    total_marks NUMERIC,
    class_level TEXT NOT NULL,
    time TEXT,
    question_paper_name TEXT,
    question_paper_url TEXT
);

-- 10. Exam Results Table
CREATE TABLE IF NOT EXISTS public.exam_results (
    id TEXT PRIMARY KEY,
    exam_id TEXT REFERENCES public.exams(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    marks_obtained NUMERIC,
    is_absent BOOLEAN DEFAULT false,
    remarks TEXT
);

-- 11. Uploaded Files Table
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    size NUMERIC DEFAULT 0,
    type TEXT DEFAULT 'other',
    uploaded_at TEXT NOT NULL,
    linked_class TEXT DEFAULT 'All',
    linked_group TEXT DEFAULT 'All',
    description TEXT
);

-- 12. Fee Payments Table
CREATE TABLE IF NOT EXISTS public.fee_payments (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Unpaid',
    payment_date TEXT
);

-- 13. SMS Logs Table
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id TEXT PRIMARY KEY,
    student_name TEXT,
    recipient_role TEXT,
    phone_number TEXT,
    message_type TEXT,
    message_content TEXT,
    status TEXT,
    response_raw TEXT,
    created_at TEXT DEFAULT NOW()::text
);

-- Row Level Security (RLS) Configuration - Allow Full Sync Access for App
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    EXECUTE 'CREATE POLICY "Allow all on students" ON public.students FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on folders" ON public.folders FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on questions" ON public.questions FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on documents" ON public.documents FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on presentations" ON public.presentations FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on activities" ON public.activities FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on settings" ON public.settings FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on exams" ON public.exams FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on exam_results" ON public.exam_results FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on uploaded_files" ON public.uploaded_files FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on fee_payments" ON public.fee_payments FOR ALL USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow all on sms_logs" ON public.sms_logs FOR ALL USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN 
    -- Ignore if policy already exists
END $$;

-- Insert Default Settings
INSERT INTO public.settings (id, institute_name, logo_url, theme_accent, dark_mode, custom_footer_text, auto_save_interval, sms_service_enabled)
VALUES ('default', 'Math & Science Care', '/app_logo.jpg', 'emerald', true, 'Cared by: Nion Hassan Nirjon', 10, true)
ON CONFLICT (id) DO NOTHING;

-- Insert Default Folders
INSERT INTO public.folders (id, name, type, parent_id) VALUES
('f-1', 'Mathematics Core', 'question', NULL),
('f-2', 'Science Mechanics & Light', 'question', NULL),
('f-3', 'General Science Questions', 'question', NULL),
('f-4', 'Exam Sheets 2026', 'document', NULL),
('f-5', 'Lecture Modules', 'document', NULL)
ON CONFLICT (id) DO NOTHING;
