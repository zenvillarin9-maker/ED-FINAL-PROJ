-- Supabase SQL for Announcements Dashboard
-- Run this in Supabase SQL Editor

-- Create tables
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section TEXT,
  subject TEXT,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'schedule_change', 'room_update', 'reminder')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'announcement',
  related_id UUID,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_teacher ON announcements(teacher_id);
CREATE INDEX IF NOT EXISTS idx_announcements_class ON announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Classes Policies
CREATE POLICY "teachers_manage_own_classes" ON classes FOR ALL USING (auth.uid() = teacher_id);
CREATE POLICY "students_view_enrolled_classes" ON classes FOR SELECT USING (
  EXISTS (SELECT 1 FROM enrollments WHERE enrollments.class_id = classes.id AND enrollments.student_id = auth.uid())
);
CREATE POLICY "admins_manage_all_classes" ON classes FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Enrollments Policies
CREATE POLICY "teachers_manage_class_enrollments" ON enrollments FOR ALL USING (
  EXISTS (SELECT 1 FROM classes WHERE classes.id = enrollments.class_id AND classes.teacher_id = auth.uid())
);
CREATE POLICY "students_view_own_enrollments" ON enrollments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "admins_manage_all_enrollments" ON enrollments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Announcements Policies
CREATE POLICY "teachers_manage_own_announcements" ON announcements 
  FOR ALL 
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "teachers_insert_own_announcements" ON announcements 
  FOR INSERT 
  WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "students_view_relevant_announcements" ON announcements FOR SELECT USING (
  class_id IS NULL OR EXISTS (
    SELECT 1 FROM enrollments WHERE enrollments.class_id = announcements.class_id AND enrollments.student_id = auth.uid()
  )
);
CREATE POLICY "admins_manage_all_announcements" ON announcements FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Notifications Policies
CREATE POLICY "users_view_own_notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_update_own_notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "allow_insert_notifications" ON notifications FOR INSERT WITH CHECK (true);
