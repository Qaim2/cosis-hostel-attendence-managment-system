import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Ensure data folder exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const dbPath = path.join(dataDir, 'hostel_namaz.db');
export let db = new DatabaseSync(dbPath);

export function getDb(): DatabaseSync {
  return db;
}

export function reloadDb(): void {
  try {
    db.close();
  } catch (e) {
    // Ignore close error if already closed
  }
  db = new DatabaseSync(dbPath);
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function initDatabase() {
  // Enable foreign keys and WAL mode for reliability
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  // Hostels
  db.exec(`
    CREATE TABLE IF NOT EXISTS hostels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Users (Super Admin, Managers)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('super_admin', 'manager')),
      hostel_id INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE SET NULL
    );
  `);

  // Auth tokens
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Academic Sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS academic_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Classes
  db.exec(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      hostel_id INTEGER NOT NULL,
      academic_session_id INTEGER NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id) ON DELETE CASCADE
    );
  `);

  // Students
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_no TEXT NOT NULL,
      name TEXT NOT NULL,
      father_name TEXT NOT NULL,
      hostel_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      academic_session_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hostel_id) REFERENCES hostels(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id)
    );
  `);

  // Student History (Preserves history across promotions and moves)
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      academic_session_id INTEGER NOT NULL,
      class_id INTEGER NOT NULL,
      hostel_id INTEGER NOT NULL,
      roll_no TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (hostel_id) REFERENCES hostels(id)
    );
  `);

  // Prayers (5 daily prayers)
  db.exec(`
    CREATE TABLE IF NOT EXISTS prayers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL
    );
  `);

  // Custom Events
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT DEFAULT '',
      hostel_id INTEGER,
      class_id INTEGER,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hostel_id) REFERENCES hostels(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // Attendance Sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('prayer', 'custom_event')),
      prayer_id INTEGER,
      custom_event_id INTEGER,
      academic_session_id INTEGER NOT NULL,
      created_by INTEGER NOT NULL,
      manager_hostel_id INTEGER,
      mode TEXT NOT NULL CHECK(mode IN ('MARK_ABSENT', 'MARK_PRESENT')),
      status TEXT NOT NULL DEFAULT 'SAVED' CHECK(status IN ('SAVED', 'LOCKED')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prayer_id) REFERENCES prayers(id),
      FOREIGN KEY (custom_event_id) REFERENCES custom_events(id),
      FOREIGN KEY (academic_session_id) REFERENCES academic_sessions(id),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (manager_hostel_id) REFERENCES hostels(id)
    );
  `);

  // Attendance Records (Stores complete snapshot with snapshot names)
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_session_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      roll_no TEXT NOT NULL,
      father_name TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      class_name TEXT NOT NULL,
      hostel_id INTEGER NOT NULL,
      hostel_name TEXT NOT NULL,
      academic_session_id INTEGER NOT NULL,
      academic_session_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'LEAVE')),
      marked_by INTEGER NOT NULL,
      marked_by_name TEXT NOT NULL,
      manager_hostel_name TEXT NOT NULL,
      marked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attendance_session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (marked_by) REFERENCES users(id)
    );
  `);

  // Student Leaves
  db.exec(`
    CREATE TABLE IF NOT EXISTS leaves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      from_date TEXT NOT NULL,
      to_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL,
      hostel_name TEXT DEFAULT '',
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT DEFAULT '',
      old_value TEXT DEFAULT '',
      new_value TEXT DEFAULT '',
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // System Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Google Sheets Targets (Multiple sheets configuration)
  db.exec(`
    CREATE TABLE IF NOT EXISTS google_sheets_targets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      spreadsheet_id TEXT NOT NULL,
      sheet_name TEXT NOT NULL DEFAULT 'Attendance',
      auto_sync INTEGER NOT NULL DEFAULT 1,
      last_sync_at TEXT,
      last_status TEXT DEFAULT 'pending',
      rows_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Non-destructive schema column enhancements
  try { db.exec(`ALTER TABLE hostels ADD COLUMN capacity INTEGER DEFAULT 100;`); } catch (e) {}
  try { db.exec(`ALTER TABLE hostels ADD COLUMN warden_name TEXT DEFAULT '';`); } catch (e) {}
  try { db.exec(`ALTER TABLE hostels ADD COLUMN contact_phone TEXT DEFAULT '';`); } catch (e) {}

  try { db.exec(`ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';`); } catch (e) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN shift TEXT DEFAULT 'All Prayers';`); } catch (e) {}

  try { db.exec(`ALTER TABLE classes ADD COLUMN teacher_name TEXT DEFAULT '';`); } catch (e) {}
  try { db.exec(`ALTER TABLE classes ADD COLUMN room_no TEXT DEFAULT '';`); } catch (e) {}

  try { db.exec(`ALTER TABLE students ADD COLUMN room_no TEXT DEFAULT '';`); } catch (e) {}
  try { db.exec(`ALTER TABLE students ADD COLUMN phone TEXT DEFAULT '';`); } catch (e) {}

  try { db.exec(`ALTER TABLE custom_events ADD COLUMN category TEXT DEFAULT 'General';`); } catch (e) {}
  try { db.exec(`ALTER TABLE custom_events ADD COLUMN event_time TEXT DEFAULT '';`); } catch (e) {}

  // Ensure default prayers exist
  const existingPrayers = db.prepare('SELECT COUNT(*) as count FROM prayers').get() as { count: number };
  if (existingPrayers.count === 0) {
    const prayers = [
      { name: 'Fajr', order: 1 },
      { name: 'Zuhr', order: 2 },
      { name: 'Asr', order: 3 },
      { name: 'Maghrib', order: 4 },
      { name: 'Isha', order: 5 },
    ];
    const insertPrayer = db.prepare('INSERT INTO prayers (name, sort_order) VALUES (?, ?)');
    for (const p of prayers) {
      insertPrayer.run(p.name, p.order);
    }
  }

  // Ensure system settings are set to COSIS Hostels Attendence Management System
  const insertOrUpdateSetting = db.prepare(`
    INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);
  insertOrUpdateSetting.run('site_name', 'COSIS Hostels Attendence Management System');
  insertOrUpdateSetting.run('site_subtitle', '');
  insertOrUpdateSetting.run('dashboard_title', 'COSIS Hostels Attendence Management System');

  const existingBackup = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('last_backup');
  if (!existingBackup) {
    db.prepare('INSERT INTO system_settings (key, value) VALUES (?, ?)').run('last_backup', 'Never');
  }
}

export function logAudit(params: {
  userId?: number;
  userName: string;
  role: string;
  hostelName?: string;
  action: string;
  entityType: string;
  entityId?: string | number;
  oldValue?: string;
  newValue?: string;
}) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, user_name, role, hostel_name, action, entity_type, entity_id, old_value, new_value, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    stmt.run(
      params.userId ?? null,
      params.userName,
      params.role,
      params.hostelName || '',
      params.action,
      params.entityType,
      params.entityId ? String(params.entityId) : '',
      params.oldValue || '',
      params.newValue || ''
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
