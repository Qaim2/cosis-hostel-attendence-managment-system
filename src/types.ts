export interface User {
  id: number;
  name: string;
  username: string;
  role: 'super_admin' | 'manager';
  hostel_id: number | null;
  hostel_name: string | null;
  phone?: string;
  shift?: string;
  status?: string;
}

export interface AdminUser {
  id: number;
  name: string;
  username: string;
  role: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface GoogleSheetTarget {
  id: string;
  name: string;
  spreadsheet_id: string;
  sheet_name: string;
  auto_sync: number | boolean;
  last_sync_at?: string | null;
  last_status?: string | null;
  rows_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SiteSettings {
  site_name: string;
  site_subtitle: string;
  last_backup?: string;
  site_logo_type?: 'icon' | 'custom' | 'none';
  site_logo_icon?: string;
  site_logo_data?: string;
  site_logo_shape?: 'rounded' | 'circle' | 'square';
  dashboard_title?: string;
  dashboard_announcement?: string;
  dashboard_announcement_type?: 'info' | 'warning' | 'reminder';
  dashboard_show_stats?: string;
  dashboard_show_prayers?: string;
  dashboard_show_hostels?: string;
  dashboard_show_quick_actions?: string;
  dashboard_show_audit?: string;
  dashboard_theme?: 'emerald' | 'teal' | 'navy' | 'amber';
  default_attendance_mode?: 'MARK_ABSENT' | 'MARK_PRESENT';
}

export interface Hostel {
  id: number;
  name: string;
  description: string;
  capacity?: number;
  warden_name?: string;
  contact_phone?: string;
  status: string;
  active_classes_count?: number;
  active_students_count?: number;
  active_managers_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicSession {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  classes_count?: number;
  active_students_count?: number;
}

export interface ClassItem {
  id: number;
  name: string;
  hostel_id: number;
  hostel_name?: string;
  academic_session_id: number;
  academic_session_name?: string;
  description: string;
  teacher_name?: string;
  room_no?: string;
  status: string;
  active_students_count?: number;
}

export interface Student {
  id: number;
  roll_no: string;
  name: string;
  father_name: string;
  hostel_id: number;
  hostel_name?: string;
  class_id: number;
  class_name?: string;
  academic_session_id: number;
  academic_session_name?: string;
  room_no?: string;
  phone?: string;
  status: 'active' | 'inactive';
}

export interface StudentHistory {
  id: number;
  student_id: number;
  academic_session_id: number;
  academic_session_name: string;
  class_id: number;
  class_name: string;
  hostel_id: number;
  hostel_name: string;
  roll_no: string;
  start_date: string;
  end_date: string | null;
  note: string;
}

export interface Prayer {
  id: number;
  name: string;
  sort_order: number;
}

export interface CustomEvent {
  id: number;
  name: string;
  date: string;
  description: string;
  category?: string;
  event_time?: string;
  hostel_id?: number | null;
  hostel_name?: string;
  class_id?: number | null;
  class_name?: string;
  creator_name?: string;
  sessions_count?: number;
  attendance_records_count?: number;
}

export interface Leave {
  id: number;
  student_id: number;
  student_name: string;
  roll_no: string;
  father_name: string;
  hostel_name: string;
  class_name: string;
  from_date: string;
  to_date: string;
  reason: string;
  creator_name: string;
  created_at: string;
}

export interface RosterStudent {
  id: number;
  roll_no: string;
  name: string;
  father_name: string;
  hostel_id: number;
  hostel_name: string;
  class_id: number;
  class_name: string;
  academic_session_id: number;
  isOnLeave: boolean;
  leaveReason: string | null;
}

export interface RosterClass {
  id: number;
  name: string;
  hostel_id: number;
  hostel_name: string;
  students: RosterStudent[];
}

export interface RosterHostel {
  id: number;
  name: string;
  description?: string;
  classes: RosterClass[];
}

export interface AttendanceSession {
  id: number;
  date: string;
  type: 'prayer' | 'custom_event';
  prayer_id?: number | null;
  prayer_name?: string | null;
  custom_event_id?: number | null;
  custom_event_name?: string | null;
  academic_session_id: number;
  academic_session_name: string;
  created_by: number;
  creator_name: string;
  manager_hostel_name?: string;
  mode: 'MARK_ABSENT' | 'MARK_PRESENT';
  status: 'SAVED' | 'LOCKED';
  total_students?: number;
  present_count?: number;
  absent_count?: number;
  leave_count?: number;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  attendance_session_id: number;
  student_id: number;
  student_name: string;
  roll_no: string;
  father_name: string;
  class_id: number;
  class_name: string;
  hostel_id: number;
  hostel_name: string;
  academic_session_id: number;
  academic_session_name: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  marked_by: number;
  marked_by_name: string;
  manager_hostel_name: string;
  marked_at: string;
  date?: string;
  event_name?: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string;
  role: string;
  hostel_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value: string;
  new_value: string;
  timestamp: string;
}

export interface BackupItem {
  filename: string;
  size: number;
  createdAt: string;
  timestamp: number;
}
