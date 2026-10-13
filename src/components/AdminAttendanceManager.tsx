import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import {
  AttendanceSession,
  AttendanceRecord,
} from '../types.js';
import {
  UserCheck,
  Search,
  Lock,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const AdminAttendanceManager: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Search filter
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [newStatus, setNewStatus] = useState<'PRESENT' | 'ABSENT' | 'LEAVE'>('PRESENT');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<AttendanceSession[]>('/api/attendance/sessions');
      setSessions(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load sessions' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const openSession = async (id: number) => {
    setSelectedSessionId(id);
    setLoading(true);
    try {
      const data = await apiRequest<{ session: AttendanceSession; records: AttendanceRecord[] }>(
        `/api/attendance/sessions/${id}`
      );
      setSelectedSession(data.session);
      setRecords(data.records);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load session details' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecord = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setNewStatus(record.status);
  };

  const saveRecordEdit = async () => {
    if (!editingRecord) return;
    setSavingEdit(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(
        `/api/attendance/records/${editingRecord.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        }
      );

      setFeedback({ type: 'success', message: res.message });
      // Update local state
      setRecords((prev) =>
        prev.map((r) => (r.id === editingRecord.id ? { ...r, status: newStatus } : r))
      );
      setEditingRecord(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update record' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this attendance session and all its student records? This action is audited.')) {
      return;
    }
    try {
      await apiRequest(`/api/attendance/sessions/${id}`, { method: 'DELETE' });
      setFeedback({ type: 'success', message: 'Attendance session deleted.' });
      setSelectedSessionId(null);
      setSelectedSession(null);
      setRecords([]);
      fetchSessions();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Delete failed' });
    }
  };

  const filteredRecords = records.filter(
    (r) =>
      r.student_name.toLowerCase().includes(search.toLowerCase()) ||
      r.roll_no.toLowerCase().includes(search.toLowerCase()) ||
      r.class_name.toLowerCase().includes(search.toLowerCase()) ||
      r.hostel_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span>Attendance Correction & Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Super Admin authority to audit, review locked snapshots, and correct individual student attendance.
          </p>
        </div>
      </div>

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
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: SESSIONS LIST */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Saved Attendance Sessions ({sessions.length})
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {sessions.map((sess) => {
              const isSelected = selectedSessionId === sess.id;
              const eventLabel = sess.prayer_name ? `${sess.prayer_name} Namaz` : sess.custom_event_name || 'Event';

              return (
                <div
                  key={sess.id}
                  onClick={() => openSession(sess.id)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-400'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{eventLabel}</span>
                    <span className="text-[10px] font-mono text-slate-500">{sess.date}</span>
                  </div>

                  <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                    <span>By: {sess.creator_name}</span>
                    <span className="text-emerald-700 font-bold">{sess.total_students} students</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-[10px] font-mono">
                    <span className="text-emerald-700">{sess.present_count} P</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-rose-700">{sess.absent_count} A</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-amber-700">{sess.leave_count} L</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: SESSION DETAILS & RECORD EDITING */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
          {selectedSession ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>
                      {selectedSession.prayer_name ? `${selectedSession.prayer_name} Prayer` : selectedSession.custom_event_name}
                    </span>
                    <span className="text-xs font-mono font-normal text-slate-500">
                      ({selectedSession.date})
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> LOCKED SNAPSHOT
                    </span>
                  </h2>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Original Marked By: <strong>{selectedSession.creator_name}</strong> · Hostel: <strong>{selectedSession.manager_hostel_name || 'All'}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSession(selectedSession.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 border border-rose-200 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Session</span>
                </button>
              </div>

              {/* Instant Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter students in this snapshot by roll, name, class..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Records Table */}
              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Roll</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3">Hostel</th>
                      <th className="py-2 px-3">Class</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredRecords.map((r) => {
                      let badge = '';
                      if (r.status === 'PRESENT') badge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                      else if (r.status === 'ABSENT') badge = 'bg-rose-100 text-rose-800 border-rose-300';
                      else badge = 'bg-amber-100 text-amber-800 border-amber-300';

                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold">{r.roll_no}</td>
                          <td className="py-2 px-3 font-medium text-slate-900">{r.student_name}</td>
                          <td className="py-2 px-3">{r.hostel_name}</td>
                          <td className="py-2 px-3">{r.class_name}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badge}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleEditRecord(r)}
                              className="px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 border border-emerald-300 rounded hover:bg-emerald-50 cursor-pointer inline-flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Correct</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">
              Select an attendance session from the left to review records or make administrative corrections.
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL WITH AUDIT PREVIEW */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-emerald-600" />
              <span>Administrative Attendance Correction</span>
            </h3>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1">
              <div>
                <strong>Student:</strong> {editingRecord.student_name} (Roll: {editingRecord.roll_no})
              </div>
              <div>
                <strong>Class & Hostel:</strong> {editingRecord.class_name} · {editingRecord.hostel_name}
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500">Current Status:</span>
                <span className="font-bold text-slate-900">{editingRecord.status}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Select Corrected Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewStatus('PRESENT')}
                  className={`py-2 text-xs font-bold rounded border cursor-pointer ${
                    newStatus === 'PRESENT'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                  }`}
                >
                  PRESENT
                </button>
                <button
                  type="button"
                  onClick={() => setNewStatus('ABSENT')}
                  className={`py-2 text-xs font-bold rounded border cursor-pointer ${
                    newStatus === 'ABSENT'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                  }`}
                >
                  ABSENT
                </button>
                <button
                  type="button"
                  onClick={() => setNewStatus('LEAVE')}
                  className={`py-2 text-xs font-bold rounded border cursor-pointer ${
                    newStatus === 'LEAVE'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                  }`}
                >
                  LEAVE
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded p-2.5 text-[11px]">
              <strong>Audit Log Guaranteed (Section 26):</strong> This edit will immediately record:
              <br />
              <span className="font-mono text-[10px]">
                Old Status: {editingRecord.status} → New Status: {newStatus} | Changed By: Super Admin
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRecordEdit}
                disabled={savingEdit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow cursor-pointer disabled:opacity-50"
              >
                {savingEdit ? 'Recording Correction...' : 'Save Correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
