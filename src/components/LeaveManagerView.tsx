import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import { Leave, Student, User } from '../types.js';
import {
  CalendarDays,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Search,
} from 'lucide-react';

interface LeaveManagerViewProps {
  currentUser: User;
}

export const LeaveManagerView: React.FC<LeaveManagerViewProps> = ({ currentUser }) => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  );
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search filter
  const [search, setSearch] = useState('');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Leave[]>('/api/leaves');
      setLeaves(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed loading leaves' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await apiRequest<Student[]>('/api/students?status=active');
      setStudents(data);
      if (data.length > 0) setSelectedStudentId(data[0].id);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchStudents();
  }, []);

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !fromDate || !toDate || !reason.trim()) {
      alert('Please fill all leave fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/leaves', {
        method: 'POST',
        body: JSON.stringify({
          student_id: selectedStudentId,
          from_date: fromDate,
          to_date: toDate,
          reason: reason.trim(),
        }),
      });

      setFeedback({ type: 'success', message: res.message });
      setShowAddModal(false);
      setReason('');
      fetchLeaves();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed creating leave' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLeave = async (id: number) => {
    if (!confirm('Are you sure you want to delete this leave record?')) return;
    try {
      await apiRequest(`/api/leaves/${id}`, { method: 'DELETE' });
      setFeedback({ type: 'success', message: 'Leave record removed.' });
      fetchLeaves();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Delete failed' });
    }
  };

  const filteredLeaves = leaves.filter(
    (l) =>
      l.student_name.toLowerCase().includes(search.toLowerCase()) ||
      l.roll_no.toLowerCase().includes(search.toLowerCase()) ||
      l.reason.toLowerCase().includes(search.toLowerCase()) ||
      l.class_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-600" />
            <span>Student Leave Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active approved leaves automatically override attendance for all five prayers as 🟡 ON LEAVE.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Student Leave</span>
        </button>
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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

      {/* FILTER SEARCH */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leaves by student name, roll, class, or reason..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* LEAVES TABLE */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Roll</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Hostel & Class</th>
                <th className="py-2.5 px-3">From Date</th>
                <th className="py-2.5 px-3">To Date</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Recorded By</th>
                {currentUser.role === 'super_admin' && (
                  <th className="py-2.5 px-3 text-right">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Loading leave records...
                  </td>
                </tr>
              ) : filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No approved leaves found.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{l.roll_no}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{l.student_name}</td>
                    <td className="py-2.5 px-3">
                      <div>{l.hostel_name}</div>
                      <div className="text-[11px] text-slate-400">{l.class_name}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-amber-700">{l.from_date}</td>
                    <td className="py-2.5 px-3 font-mono font-medium text-amber-700">{l.to_date}</td>
                    <td className="py-2.5 px-3 max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{l.creator_name}</td>
                    {currentUser.role === 'super_admin' && (
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteLeave(l.id)}
                          className="p-1 hover:bg-rose-50 text-rose-700 rounded cursor-pointer"
                          title="Delete Leave"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD LEAVE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-600" />
              <span>Record Student Leave</span>
            </h3>

            <form onSubmit={handleAddLeave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Student</label>
                <select
                  value={selectedStudentId || ''}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.roll_no}] {s.name} ({s.hostel_name} - {s.class_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">From Date</label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">To Date</label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Leave</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Home visit / Parent request / Medical treatment..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold shadow cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Leave...' : 'Save Leave Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
