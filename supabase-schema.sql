-- AyosPH Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    barangay TEXT NOT NULL,
    contact_number TEXT,
    role TEXT DEFAULT 'resident' CHECK (role IN ('resident', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Emergency')),
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Under Review', 'In Progress', 'Fixed', 'Rejected')),
    image_before TEXT,
    image_after TEXT,
    location TEXT,
    remarks TEXT,
    reported_by UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fixed_at TIMESTAMP WITH TIME ZONE
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Reports policies
CREATE POLICY "Residents can view own reports" ON reports
    FOR SELECT USING (reported_by = auth.uid());

CREATE POLICY "Residents can create reports" ON reports
    FOR INSERT WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Admins can view all reports" ON reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update all reports" ON reports
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Comments policies
CREATE POLICY "Users can view comments on their reports" ON comments
    FOR SELECT USING (
        user_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM reports JOIN users ON reports.reported_by = users.id WHERE reports.id = comments.report_id AND users.id = auth.uid()) OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can create comments" ON comments
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_severity ON reports(severity);
CREATE INDEX IF NOT EXISTS idx_reports_reported_by ON reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_comments_report_id ON comments(report_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Function to create notification on report status change
CREATE OR REPLACE FUNCTION notify_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO notifications (user_id, title, message)
        VALUES (
            NEW.reported_by,
            'Report Status Updated',
            'Your report "' || NEW.title || '" status has been changed to ' || NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for report status change notifications
CREATE TRIGGER report_status_change_trigger
    AFTER UPDATE ON reports
    FOR EACH ROW
    WHEN (NEW.status IS DISTINCT FROM OLD.status)
    EXECUTE FUNCTION notify_report_status_change();

-- Insert default admin user (you should change the password after first login)
-- Note: This requires creating the auth user first through Supabase Auth signup
-- Then update the role manually in the users table
