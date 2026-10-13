import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import {
  AcademicSession,
  ClassItem,
  Student,
} from '../types.js';
import {
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Users,
  CheckSquare,
  Square,
  ShieldCheck,
} from 'lucide-react';

export const StudentPromotionView: React.FC = () => {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Source selection
  const [sourceSessionId, setSourceSessionId] = useState<number | null>(null);
  const [sourceClassId, setSourceClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Target selection
  const [targetSessionId, setTargetSessionId] = useState<number | null>(null);
  const [targetClassId, setTargetClassId] = useState<number | null>(null);
  const [promotionNote, setPromotionNote] = useState('Promoted to next semester / advanced class');

  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        const [sessData, classData] = await Promise.all([
          apiRequest<AcademicSession[]>('/api/sessions'),
          apiRequest<ClassItem[]>('/api/classes'),
        ]);
        setSessions(sessData);
        setClasses(classData);

        if (sessData.length > 0) {
          setSourceSessionId(sessData[0].id);
          if (sessData.length > 1) {
            setTargetSessionId(sessData[1].id);
          } else {
            setTargetSessionId(sessData[0].id);
          }
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Failed loading promotion data' });
      }
    }
    loadMeta();
  }, []);

  // Fetch source students when source class or session changes
  useEffect(() => {
    if (!sourceSessionId) return;

    async function fetchStudents() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          academic_session_id: String(sourceSessionId),
          status: 'active',
        });
        if (sourceClassId) {
          params.append('class_id', String(sourceClassId));
        }
        const data = await apiRequest<Student[]>(`/api/students?${params.toString()}`);
        setStudents(data);
        setSelectedStudentIds([]);
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message || 'Failed loading students' });
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [sourceSessionId, sourceClassId]);

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const toggleStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      alert('Please select at least one student to promote.');
      return;
    }
    if (!targetSessionId || !targetClassId) {
      alert('Please select target session and target class.');
      return;
    }

    setPromoting(true);
    setFeedback(null);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/students/promote', {
        method: 'POST',
        body: JSON.stringify({
          student_ids: selectedStudentIds,
          target_session_id: targetSessionId,
          target_class_id: targetClassId,
          note: promotionNote,
        }),
      });

      setFeedback({ type: 'success', message: res.message });
      setSelectedStudentIds([]);
      // Refresh students list
      const params = new URLSearchParams({
        academic_session_id: String(sourceSessionId),
        status: 'active',
      });
      if (sourceClassId) {
        params.append('class_id', String(sourceClassId));
      }
      const refreshed = await apiRequest<Student[]>(`/api/students?${params.toString()}`);
      setStudents(refreshed);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Promotion failed' });
    } finally {
      setPromoting(false);
    }
  };

  // Target classes filtered by targetSessionId
  const availableTargetClasses = classes.filter(
    (c) => !targetSessionId || c.academic_session_id === targetSessionId
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          <span>Student Promotion & Class Transfer</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Promote students to a new semester or class while guaranteeing that historical attendance remains permanently preserved.
        </p>
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

      <form onSubmit={handlePromote} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SOURCE PANEL */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
              1. Current Academic Context (Source)
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Source Academic Session
                </label>
                <select
                  value={sourceSessionId || ''}
                  onChange={(e) => setSourceSessionId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Source Class
                </label>
                <select
                  value={sourceClassId || ''}
                  onChange={(e) => setSourceClassId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">All Classes in Session</option>
                  {classes
                    .filter((c) => c.academic_session_id === sourceSessionId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.hostel_name} › {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Students List with Checkboxes */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 flex items-center justify-between border-b border-slate-200 text-xs font-semibold text-slate-700">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 hover:text-emerald-700 cursor-pointer"
                >
                  {selectedStudentIds.length === students.length && students.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Select All ({students.length} students)</span>
                </button>
                <span className="text-emerald-700 font-mono">
                  {selectedStudentIds.length} Selected
                </span>
              </div>

              <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100 text-xs">
                {loading ? (
                  <div className="p-8 text-center text-slate-500">Loading students...</div>
                ) : students.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No active students in this class.</div>
                ) : (
                  students.map((s) => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        className={`px-3 py-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <span className="font-mono font-bold text-slate-700">{s.roll_no}</span>
                          <span className="font-medium text-slate-900">{s.name}</span>
                          <span className="text-slate-400 text-[11px]">s/o {s.father_name}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{s.class_name}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* TARGET PANEL */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
                2. Promotion Destination (Target)
              </h2>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Target Academic Session
                  </label>
                  <select
                    value={targetSessionId || ''}
                    onChange={(e) => setTargetSessionId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Target Class & Hostel
                  </label>
                  <select
                    value={targetClassId || ''}
                    onChange={(e) => setTargetClassId(Number(e.target.value))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium"
                  >
                    <option value="">Select Target Class...</option>
                    {availableTargetClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.hostel_name} › {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Promotion Reason / Ledger Note
                </label>
                <input
                  type="text"
                  value={promotionNote}
                  onChange={(e) => setPromotionNote(e.target.value)}
                  placeholder="e.g. Promoted to Semester 2 based on annual Hifz exam"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Historical Data Guarantee (Section 9 & 36)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800">
                  When promoted, a new student history record is created for the new semester and class.
                  <strong> All previously saved attendance records remain locked to the original session and class.</strong>
                  Old attendance will never be rewritten.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={promoting || selectedStudentIds.length === 0 || !targetClassId}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors disabled:opacity-50"
            >
              <GraduationCap className="w-4 h-4" />
              <span>
                {promoting
                  ? 'Processing Promotion...'
                  : `PROMOTE ${selectedStudentIds.length} SELECTED STUDENT(S)`}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
