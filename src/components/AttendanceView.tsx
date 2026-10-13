import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiRequest } from '../api.js';
import {
  User,
  AcademicSession,
  Prayer,
  CustomEvent,
  RosterHostel,
  RosterStudent,
} from '../types.js';
import {
  CalendarCheck,
  Search,
  Check,
  X,
  Clock,
  AlertTriangle,
  Lock,
  Save,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Building,
  GraduationCap,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Hash,
  FileSpreadsheet,
  Plus,
  ListFilter,
  CalendarDays,
  Edit2,
  Trash2,
} from 'lucide-react';
import { CustomEventManagerModal } from './CustomEventManagerModal.js';
import { getAccessToken } from '../services/googleAuth.js';
import { appendRows } from '../services/googleSheets.js';

interface AttendanceViewProps {
  currentUser: User;
  onNavigateToReports?: () => void;
}

type AttendanceMode = 'MARK_ABSENT' | 'MARK_PRESENT';

interface StudentState {
  status: 'PRESENT' | 'ABSENT' | 'LEAVE';
  isOnLeave: boolean;
  leaveReason: string | null;
  student: RosterStudent;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  currentUser,
  onNavigateToReports,
}) => {
  // Session Configuration State
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [academicSessions, setAcademicSessions] = useState<AcademicSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const [eventType, setEventType] = useState<'prayer' | 'custom_event'>('prayer');
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [selectedPrayerId, setSelectedPrayerId] = useState<number | null>(null);
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Two Attendance Modes (Section 12 & 13)
  const [mode, setMode] = useState<AttendanceMode>('MARK_ABSENT');

  // Hierarchy Data from Backend
  const [rosterHostels, setRosterHostels] = useState<RosterHostel[]>([]);
  const [studentStates, setStudentStates] = useState<Map<number, StudentState>>(new Map());

  // Duplicate Check & Session Status
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [jumpHostelId, setJumpHostelId] = useState<string>('');
  const [jumpClassId, setJumpClassId] = useState<string>('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Custom Event modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventModalMode, setEventModalMode] = useState<'create' | 'list' | 'edit'>('create');
  const [editingEventItem, setEditingEventItem] = useState<CustomEvent | null>(null);

  // Fast Roll Number quick-toggle input ref
  const quickRollInputRef = useRef<HTMLInputElement>(null);

  // Load initial options (Sessions, Prayers, Events)
  useEffect(() => {
    async function loadMeta() {
      try {
        const [sessData, prayData, evtData] = await Promise.all([
          apiRequest<AcademicSession[]>('/api/sessions'),
          apiRequest<Prayer[]>('/api/prayers'),
          apiRequest<CustomEvent[]>('/api/events'),
        ]);

        setAcademicSessions(sessData);
        if (sessData.length > 0) {
          const activeSess = sessData.find((s) => s.status === 'active') || sessData[0];
          setSelectedSessionId(activeSess.id);
        }

        setPrayers(prayData);
        if (prayData.length > 0) {
          setSelectedPrayerId(prayData[0].id);
        }

        setCustomEvents(evtData);
        if (evtData.length > 0) {
          setSelectedEventId(evtData[0].id);
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Failed loading options' });
      }
    }
    loadMeta();
  }, []);

  // Check duplicate attendance session
  useEffect(() => {
    if (!selectedSessionId || (eventType === 'prayer' && !selectedPrayerId) || (eventType === 'custom_event' && !selectedEventId)) {
      return;
    }

    async function checkDup() {
      try {
        const params = new URLSearchParams({
          date: selectedDate,
          academic_session_id: String(selectedSessionId),
          type: eventType,
        });
        if (eventType === 'prayer' && selectedPrayerId) {
          params.append('prayer_id', String(selectedPrayerId));
        } else if (eventType === 'custom_event' && selectedEventId) {
          params.append('custom_event_id', String(selectedEventId));
        }

        const res = await apiRequest<{ isDuplicate: boolean; existingSession: any }>(
          `/api/attendance/check-duplicate?${params.toString()}`
        );

        setIsDuplicate(res.isDuplicate);
        if (res.isDuplicate) {
          setIsLocked(true);
          setSavedSessionId(res.existingSession.id);
        } else {
          setIsLocked(false);
          setSavedSessionId(null);
        }
      } catch (err) {
        console.error('Duplicate check error:', err);
      }
    }

    checkDup();
  }, [selectedDate, selectedSessionId, eventType, selectedPrayerId, selectedEventId]);

  // Load roster and initialize student states based on selected mode & leaves
  useEffect(() => {
    if (!selectedSessionId) return;

    let isMounted = true;
    async function loadRoster() {
      setLoading(true);
      try {
        const res = await apiRequest<{
          date: string;
          hierarchy: RosterHostel[];
          totalStudentsCount: number;
        }>(`/api/attendance/active-roster?date=${selectedDate}&academic_session_id=${selectedSessionId}`);

        if (!isMounted) return;

        setRosterHostels(res.hierarchy);

        // Build states map based on the Mode
        // MODE A: MARK ABSENT -> Default PRESENT (Green)
        // MODE B: MARK PRESENT -> Default ABSENT (Red)
        // LEAVE priority override -> LEAVE (Amber)
        const newMap = new Map<number, StudentState>();

        res.hierarchy.forEach((h) => {
          h.classes.forEach((c) => {
            c.students.forEach((s) => {
              let initialStatus: 'PRESENT' | 'ABSENT' | 'LEAVE';
              if (s.isOnLeave) {
                initialStatus = 'LEAVE';
              } else if (mode === 'MARK_ABSENT') {
                initialStatus = 'PRESENT';
              } else {
                initialStatus = 'ABSENT';
              }

              newMap.set(s.id, {
                status: initialStatus,
                isOnLeave: s.isOnLeave,
                leaveReason: s.leaveReason,
                student: s,
              });
            });
          });
        });

        setStudentStates(newMap);
      } catch (err: any) {
        if (isMounted) {
          setFeedback({ type: 'error', message: err.message || 'Failed to load roster' });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRoster();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedSessionId, mode]);

  // Handle Mode Change (Only affects unsaved session)
  const handleModeChange = (newMode: AttendanceMode) => {
    if (isLocked) {
      alert('This session has already been saved and is locked.');
      return;
    }
    setMode(newMode);
    // Switch un-overridden students
    setStudentStates((prev) => {
      const next = new Map(prev);
      next.forEach((val, key) => {
        if (!val.isOnLeave) {
          next.set(key, {
            ...val,
            status: newMode === 'MARK_ABSENT' ? 'PRESENT' : 'ABSENT',
          });
        }
      });
      return next;
    });
  };

  // Toggle student attendance
  const toggleStudent = (studentId: number) => {
    if (isLocked) return;

    setStudentStates((prev) => {
      const current = prev.get(studentId);
      if (!current || current.isOnLeave) return prev; // Cannot toggle student on leave

      const next = new Map(prev);
      const newStatus = current.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
      next.set(studentId, {
        ...current,
        status: newStatus,
      });
      return next;
    });
  };

  // Fast keyboard roll-number toggle
  const handleQuickRollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRollInputRef.current) return;
    const inputRoll = quickRollInputRef.current.value.trim();
    if (!inputRoll) return;

    // Search student matching this roll number
    let matchedStudentId: number | null = null;
    studentStates.forEach((val) => {
      if (val.student.roll_no === inputRoll || val.student.roll_no === inputRoll.padStart(3, '0')) {
        matchedStudentId = val.student.id;
      }
    });

    if (matchedStudentId !== null) {
      toggleStudent(matchedStudentId);
      // Smooth scroll to student card
      const elem = document.getElementById(`student-card-${matchedStudentId}`);
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      quickRollInputRef.current.value = '';
    } else {
      setFeedback({ type: 'error', message: `No active student found with Roll Number "${inputRoll}"` });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Smooth scroll jump to class
  const scrollToClass = (classId: number) => {
    const el = document.getElementById(`class-section-${classId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Smooth scroll jump to hostel
  const scrollToHostel = (hostelId: number) => {
    const el = document.getElementById(`hostel-section-${hostelId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Compute live real-time counters (Section 20)
  const counters = useMemo(() => {
    let total = 0;
    let present = 0;
    let absent = 0;
    let leave = 0;

    studentStates.forEach((s) => {
      total++;
      if (s.status === 'PRESENT') present++;
      else if (s.status === 'ABSENT') absent++;
      else if (s.status === 'LEAVE') leave++;
    });

    const totalHostels = rosterHostels.length;
    let totalClasses = 0;
    rosterHostels.forEach((h) => (totalClasses += h.classes.length));

    return {
      total,
      present,
      absent,
      leave,
      totalHostels,
      totalClasses,
    };
  }, [studentStates, rosterHostels]);

  // Current Prayer / Event Name
  const currentEventTitle = useMemo(() => {
    if (eventType === 'prayer') {
      const p = prayers.find((pr) => pr.id === selectedPrayerId);
      return p ? `${p.name} Prayer` : 'Prayer';
    } else {
      const ev = customEvents.find((e) => e.id === selectedEventId);
      return ev ? ev.name : 'Custom Event';
    }
  }, [eventType, prayers, selectedPrayerId, customEvents, selectedEventId]);

  // Filtered roster based on instant search
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return rosterHostels;
    const query = searchQuery.toLowerCase().trim();

    return rosterHostels.map((hostel) => ({
      ...hostel,
      classes: hostel.classes.map((cls) => ({
        ...cls,
        students: cls.students.filter(
          (s) =>
            s.name.toLowerCase().includes(query) ||
            s.roll_no.toLowerCase().includes(query) ||
            s.father_name.toLowerCase().includes(query)
        ),
      })),
    }));
  }, [rosterHostels, searchQuery]);

  // Save Attendance Handler
  const handleSaveAttendance = async () => {
    if (studentStates.size === 0) {
      alert('No students available to save attendance for.');
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const recordsPayload: any[] = [];
      studentStates.forEach((val) => {
        recordsPayload.push({
          student_id: val.student.id,
          student_name: val.student.name,
          roll_no: val.student.roll_no,
          father_name: val.student.father_name,
          class_id: val.student.class_id,
          class_name: val.student.class_name,
          hostel_id: val.student.hostel_id,
          hostel_name: val.student.hostel_name,
          status: val.status,
        });
      });

      const res = await apiRequest<{ success: boolean; sessionId: number; message: string }>('/api/attendance/save', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          type: eventType,
          prayer_id: eventType === 'prayer' ? selectedPrayerId : null,
          custom_event_id: eventType === 'custom_event' ? selectedEventId : null,
          academic_session_id: selectedSessionId,
          mode,
          records: recordsPayload,
        }),
      });

      setIsLocked(true);
      setIsDuplicate(true);
      setSavedSessionId(res.sessionId);
      setShowConfirmModal(false);
      setFeedback({
        type: 'success',
        message: `Attendance snapshot locked and saved successfully! Marked By: ${currentUser.name} (${currentUser.hostel_name || 'All Hostels'}).`,
      });

      // Background auto-sync to configured Google Sheets targets
      try {
        const token = await getAccessToken();
        if (token) {
          const targets = await apiRequest<any[]>('/api/sheets-targets').catch(() => []);
          const activeTargets = targets.filter((t: any) => t.auto_sync);
          if (activeTargets.length > 0) {
            const eventName =
              eventType === 'prayer'
                ? prayers.find((p) => p.id === selectedPrayerId)?.name || 'Prayer'
                : customEvents.find((e) => e.id === selectedEventId)?.name || 'Custom Event';

            const sheetRows = recordsPayload.map((r) => [
              new Date().toISOString(),
              selectedDate,
              eventName,
              r.hostel_name,
              r.class_name,
              r.roll_no,
              r.student_name,
              r.father_name,
              r.status,
              currentUser.name,
            ]);

            for (const target of activeTargets) {
              await appendRows(target.spreadsheet_id, target.sheet_name || 'Attendance', sheetRows).catch(() => {});
              await apiRequest(`/api/sheets-targets/${target.id}/sync-log`, {
                method: 'POST',
                body: JSON.stringify({ rows_count: sheetRows.length, status: 'success' }),
              }).catch(() => {});
            }
          }
        }
      } catch (sheetErr) {
        console.error('Google Sheets background auto-sync error:', sheetErr);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save attendance' });
      setShowConfirmModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 1. TOP ATTENDANCE CONFIGURATION PANEL */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
              <span>Multi-Hostel Daily Namaz Attendance</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Mark attendance across both hostels and all classes simultaneously.
            </p>
          </div>

          {/* Session Locked or Duplicate Warning */}
          {isDuplicate && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-800 rounded-md text-xs font-medium">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Session already saved & locked for this prayer and date. {currentUser.role === 'super_admin' ? 'Super Admin may edit records below or via Attendance Management.' : 'Locked from editing.'}
              </span>
            </div>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Date Picker */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Attendance Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Academic Session */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Academic Session
            </label>
            <select
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {academicSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.status === 'active' ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type & Prayer Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-semibold text-xs uppercase tracking-wide">Event / Namaz</label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setEventType('prayer')}
                  className={`hover:underline cursor-pointer ${eventType === 'prayer' ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}
                >
                  Prayers (5)
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setEventType('custom_event');
                    if (customEvents.length > 0 && !selectedEventId) {
                      setSelectedEventId(customEvents[0].id);
                    }
                  }}
                  className={`hover:underline cursor-pointer ${eventType === 'custom_event' ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}
                >
                  Custom Events ({customEvents.length})
                </button>
              </div>
            </div>

            {eventType === 'prayer' ? (
              <select
                value={selectedPrayerId || ''}
                onChange={(e) => setSelectedPrayerId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-xs"
              >
                {prayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} Prayer
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedEventId || ''}
                    onChange={(e) => setSelectedEventId(Number(e.target.value))}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer text-xs font-medium"
                  >
                    {customEvents.length === 0 ? (
                      <option value="">No custom events registered</option>
                    ) : (
                      customEvents.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.date}{e.category ? ` · ${e.category}` : ''})
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingEventItem(null);
                      setEventModalMode('create');
                      setShowEventModal(true);
                    }}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
                    title="Create New Custom Event"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Event</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEventModalMode('list');
                      setShowEventModal(true);
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-xs transition-colors cursor-pointer"
                    title="Manage All Events"
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                  </button>
                </div>

                {customEvents.length === 0 ? (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5 flex items-center justify-between">
                    <span>No events scheduled.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventItem(null);
                        setEventModalMode('create');
                        setShowEventModal(true);
                      }}
                      className="font-bold underline hover:text-amber-900 cursor-pointer"
                    >
                      + Create One Now
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                    <span>
                      Active Event:{' '}
                      <strong className="text-slate-800">
                        {customEvents.find((e) => e.id === selectedEventId)?.name || 'None selected'}
                      </strong>
                    </span>
                    {selectedEventId && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const ev = customEvents.find((e) => e.id === selectedEventId);
                            if (ev) {
                              setEditingEventItem(ev);
                              setEventModalMode('edit');
                              setShowEventModal(true);
                            }
                          }}
                          className="hover:underline text-emerald-700 font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        <span className="text-slate-300">·</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEventModalMode('list');
                            setShowEventModal(true);
                          }}
                          className="hover:underline text-slate-600 cursor-pointer"
                        >
                          All Events
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manager Info */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Active Attendant / Manager
            </label>
            <div className="bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-medium truncate">
              {currentUser.name} · <span className="font-mono">{currentUser.hostel_name || 'All Hostels'}</span>
            </div>
          </div>
        </div>

        {/* 2. MODE TOGGLE (Section 12 & 13) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Attendance Mode:
            </span>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 shadow-inner">
              <button
                type="button"
                onClick={() => handleModeChange('MARK_ABSENT')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  mode === 'MARK_ABSENT'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                [ MARK ABSENT MODE ]
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('MARK_PRESENT')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  mode === 'MARK_PRESENT'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                [ MARK PRESENT MODE ]
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
            {mode === 'MARK_ABSENT' ? (
              <span>
                <strong className="text-emerald-700">Mark Absent Mode:</strong> All active students start as <strong className="text-emerald-700">PRESENT (Green)</strong>. Click absent students to turn them <strong className="text-rose-700">ABSENT (Red)</strong>.
              </span>
            ) : (
              <span>
                <strong className="text-rose-700">Mark Present Mode:</strong> All active students start as <strong className="text-rose-700">ABSENT (Red)</strong>. Click present students to turn them <strong className="text-emerald-700">PRESENT (Green)</strong>.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. REAL-TIME COUNTER BAR (Section 20) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Students</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {counters.total}
          </div>
          <div className="text-[10px] text-slate-400">Both Hostels</div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-center shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-800 uppercase">Present</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {counters.present}
          </div>
          <div className="text-[10px] text-emerald-600">
            {counters.total > 0 ? `${Math.round((counters.present / counters.total) * 100)}%` : '0%'}
          </div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3 text-center shadow-xs">
          <div className="text-[11px] font-semibold text-rose-800 uppercase">Absent</div>
          <div className="text-2xl font-bold text-rose-700 font-mono tabular-nums">
            {counters.absent}
          </div>
          <div className="text-[10px] text-rose-600">
            {counters.total > 0 ? `${Math.round((counters.absent / counters.total) * 100)}%` : '0%'}
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-center shadow-xs">
          <div className="text-[11px] font-semibold text-amber-800 uppercase">On Leave</div>
          <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums">
            {counters.leave}
          </div>
          <div className="text-[10px] text-amber-600">Approved Leave</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Coverage</div>
          <div className="text-sm font-bold text-slate-800 mt-1">
            {counters.totalHostels} Hostels · {counters.totalClasses} Classes
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate">{currentEventTitle}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Active Mode</div>
          <div className="text-xs font-bold text-slate-800 mt-1 truncate">
            {mode === 'MARK_ABSENT' ? 'Mark Absent' : 'Mark Present'}
          </div>
          <div className="text-[10px] text-slate-400">
            {isLocked ? 'Locked (Saved)' : 'Live Editing'}
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline hover:no-underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4. STICKY QUICK NAVIGATION & SEARCH BAR (Sections 18 & 19) */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg p-3 shadow-md space-y-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Instant Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name or roll number..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Roll Number Toggle Entry */}
          <form onSubmit={handleQuickRollSubmit} className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="relative flex items-center">
              <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2" />
              <input
                ref={quickRollInputRef}
                type="text"
                placeholder="Roll (e.g. 021)"
                disabled={isLocked}
                className="pl-6 pr-2 py-1.5 w-32 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isLocked}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-medium cursor-pointer disabled:opacity-50"
            >
              Toggle
            </button>
          </form>

          {/* Jump to Hostel & Class dropdowns */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={jumpHostelId}
              onChange={(e) => {
                setJumpHostelId(e.target.value);
                if (e.target.value) scrollToHostel(Number(e.target.value));
              }}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">Jump to Hostel...</option>
              {rosterHostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>

            <select
              value={jumpClassId}
              onChange={(e) => {
                setJumpClassId(e.target.value);
                if (e.target.value) scrollToClass(Number(e.target.value));
              }}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">Jump to Class...</option>
              {rosterHostels.flatMap((h) =>
                h.classes.map((c) => (
                  <option key={`${h.id}-${c.id}`} value={c.id}>
                    {h.name} › {c.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Compact Quick Class Jump Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase shrink-0">
            Quick Jump:
          </span>
          {rosterHostels.map((h) =>
            h.classes.map((c) => (
              <button
                key={`chip-${h.id}-${c.id}`}
                onClick={() => scrollToClass(c.id)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[11px] text-slate-700 whitespace-nowrap cursor-pointer transition-colors"
              >
                <span className="font-semibold text-emerald-800">{h.name.replace('Hostel ', '')}:</span> {c.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* 5. MULTI-HOSTEL & MULTI-CLASS CONTINUOUS PAGE (Section 16 & 17) */}
      {loading ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-lg">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full mb-3" />
          <p className="text-sm text-slate-600 font-medium">Loading roster for {currentEventTitle}...</p>
        </div>
      ) : filteredRoster.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-lg">
          <p className="text-slate-600 font-medium">No students or classes found for this session.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredRoster.map((hostel) => {
            return (
              <div
                key={hostel.id}
                id={`hostel-section-${hostel.id}`}
                className="space-y-5 scroll-mt-36"
              >
                {/* HOSTEL HEADER (Section 16) */}
                <div className="bg-slate-900 text-white px-4 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h2 className="text-base font-bold uppercase tracking-wider text-white">
                        {hostel.name}
                      </h2>
                      <div className="text-xs text-slate-300">
                        {hostel.description || 'Residential Block'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-emerald-400 font-semibold">{hostel.classes.length}</span> Classes ·{' '}
                    <span className="font-mono tabular-nums">
                      {hostel.classes.reduce((acc, c) => acc + c.students.length, 0)}
                    </span> Students
                  </div>
                </div>

                {/* CLASSES IN THIS HOSTEL (Linear vertical sections, Section 17) */}
                <div className="space-y-6">
                  {hostel.classes.map((cls) => {
                    return (
                      <div
                        key={cls.id}
                        id={`class-section-${cls.id}`}
                        className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs scroll-mt-40"
                      >
                        {/* CLASS HEADER */}
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-emerald-700" />
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                              {cls.name}
                            </h3>
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {cls.students.length} Students (Rolls Sorted Ascending)
                          </div>
                        </div>

                        {/* STUDENTS IN THIS CLASS (Section 17 - linear order) */}
                        {cls.students.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">
                            No students enrolled in this section.
                          </div>
                        ) : (
                          <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                            {cls.students.map((student) => {
                              const state = studentStates.get(student.id);
                              const status = state?.status || 'PRESENT';
                              const isOnLeave = state?.isOnLeave || false;
                              const leaveReason = state?.leaveReason;

                              let cardClass = '';
                              let badgeClass = '';
                              let statusLabel = '';

                              if (isOnLeave) {
                                cardClass = 'bg-amber-50/70 border-amber-300 text-amber-900 cursor-not-allowed';
                                badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                                statusLabel = '🟡 ON LEAVE';
                              } else if (status === 'PRESENT') {
                                cardClass = 'bg-emerald-50/60 border-emerald-300 text-emerald-950 hover:bg-emerald-100/70 cursor-pointer active:scale-[0.99] transition-transform';
                                badgeClass = 'bg-emerald-600 text-white';
                                statusLabel = '🟢 PRESENT';
                              } else {
                                cardClass = 'bg-rose-50/60 border-rose-300 text-rose-950 hover:bg-rose-100/70 cursor-pointer active:scale-[0.99] transition-transform';
                                badgeClass = 'bg-rose-600 text-white';
                                statusLabel = '🔴 ABSENT';
                              }

                              return (
                                <button
                                  key={student.id}
                                  id={`student-card-${student.id}`}
                                  type="button"
                                  onClick={() => toggleStudent(student.id)}
                                  disabled={isOnLeave || isLocked}
                                  className={`border rounded-lg p-2.5 text-left flex items-start justify-between gap-2 shadow-xs transition-colors ${cardClass}`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-white/80 border border-slate-300 text-slate-800 shadow-xs tabular-nums">
                                        {student.roll_no}
                                      </span>
                                      <span className="text-xs font-bold truncate">
                                        {student.name}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 truncate">
                                      s/o {student.father_name}
                                    </div>

                                    {isOnLeave && leaveReason && (
                                      <div className="mt-1 text-[10px] text-amber-700 italic truncate" title={leaveReason}>
                                        Reason: {leaveReason}
                                      </div>
                                    )}
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs ${badgeClass}`}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. FLOATING BOTTOM ACTION BAR WITH COMPLETE SUMMARY (Section 21) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-white px-4 sm:px-6 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-400">Target: </span>
              <span className="font-bold text-white">{currentEventTitle} ({selectedDate})</span>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <span className="text-emerald-400 font-bold">{counters.present} Present</span>
              <span className="text-rose-400 font-bold">{counters.absent} Absent</span>
              <span className="text-amber-400 font-bold">{counters.leave} Leave</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isLocked ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400 flex items-center gap-1 font-medium">
                  <Lock className="w-3.5 h-3.5" /> Session Saved & Locked
                </span>
                {onNavigateToReports && (
                  <button
                    onClick={onNavigateToReports}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold cursor-pointer border border-slate-700"
                  >
                    View in Reports
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={saving || studentStates.size === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>SAVE ATTENDANCE SNAPSHOT</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Save className="w-5 h-5 text-emerald-600" />
              <span>Confirm Attendance Snapshot</span>
            </h3>

            <p className="text-xs text-slate-600">
              You are about to save a permanent snapshot for <strong>{currentEventTitle}</strong> on <strong>{selectedDate}</strong>.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Roster Students:</span>
                <span className="font-bold text-slate-800 font-mono">{counters.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700">Present (Green):</span>
                <span className="font-bold text-emerald-700 font-mono">{counters.present}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-700">Absent (Red):</span>
                <span className="font-bold text-rose-700 font-mono">{counters.absent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-700">Approved Leave (Amber):</span>
                <span className="font-bold text-amber-700 font-mono">{counters.leave}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="text-slate-500">Marked By:</span>
                <span className="font-semibold text-slate-800">
                  {currentUser.name} ({currentUser.hostel_name || 'All Hostels'})
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Note: Once saved, this session will become locked for managers. Super Admin may later review or make corrections in Attendance Management.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving Snapshot...' : 'Yes, Lock & Save Snapshot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM EVENT MANAGER MODAL */}
      <CustomEventManagerModal
        isOpen={showEventModal}
        initialMode={eventModalMode}
        initialDate={selectedDate}
        editingEvent={editingEventItem}
        onClose={() => {
          setShowEventModal(false);
          setEditingEventItem(null);
        }}
        onEventCreated={(newEvent) => {
          setCustomEvents((prev) => {
            const exists = prev.some((e) => e.id === newEvent.id);
            if (exists) return prev.map((e) => (e.id === newEvent.id ? newEvent : e));
            return [...prev, newEvent];
          });
          setSelectedEventId(newEvent.id);
          setEventType('custom_event');
        }}
        onEventUpdated={(updEvent) => {
          setCustomEvents((prev) =>
            prev.map((e) => (e.id === updEvent.id ? updEvent : e))
          );
          if (selectedEventId === updEvent.id) {
            setSelectedEventId(updEvent.id);
          }
        }}
        onEventDeleted={(deletedId) => {
          setCustomEvents((prev) => {
            const remaining = prev.filter((e) => e.id !== deletedId);
            if (selectedEventId === deletedId) {
              setSelectedEventId(remaining.length > 0 ? remaining[0].id : null);
            }
            return remaining;
          });
        }}
        onSelectEventForAttendance={(eventId) => {
          setSelectedEventId(eventId);
          setEventType('custom_event');
          setShowEventModal(false);
        }}
      />
    </div>
  );
};
