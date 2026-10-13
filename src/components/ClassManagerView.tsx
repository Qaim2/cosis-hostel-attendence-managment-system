import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import { AcademicSession, ClassItem, Hostel } from '../types.js';
import {
  BookOpen,
  Plus,
  Edit2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building,
  Trash2,
  Search,
  Users,
  GraduationCap,
  Sparkles,
  Layers,
  DoorOpen,
  ArrowRightLeft,
  X,
  Info,
} from 'lucide-react';

export const ClassManagerView: React.FC = () => {
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHostelId, setFilterHostelId] = useState<string>('all');
  const [filterSessionId, setFilterSessionId] = useState<string>('all');

  // Bulk Selection
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // New / Edit Class Modal
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [className, setClassName] = useState('');
  const [classHostelId, setClassHostelId] = useState<number | null>(null);
  const [classSessionId, setClassSessionId] = useState<number | null>(null);
  const [classTeacher, setClassTeacher] = useState('');
  const [classRoom, setClassRoom] = useState('');
  const [classDesc, setClassDesc] = useState('');

  // Delete Class Modal State
  const [deletingClass, setDeletingClass] = useState<ClassItem | null>(null);
  const [transferTargetClassId, setTransferTargetClassId] = useState<number | ''>('');
  const [deletingExecuting, setDeletingExecuting] = useState(false);

  // Batch / Quick Template Modal
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchHostelId, setBatchHostelId] = useState<number | null>(null);
  const [batchSessionId, setBatchSessionId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<'hifz' | 'dars' | 'school'>('hifz');
  const [templateClassList, setTemplateClassList] = useState<string[]>([]);
  const [creatingBatch, setCreatingBatch] = useState(false);

  // View Class Students Modal
  const [inspectClass, setInspectClass] = useState<ClassItem | null>(null);
  const [inspectStudents, setInspectStudents] = useState<any[]>([]);
  const [loadingInspect, setLoadingInspect] = useState(false);

  // New Session Modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionStart, setSessionStart] = useState('');
  const [sessionEnd, setSessionEnd] = useState('');

  // Pre-configured templates
  const PRESET_TEMPLATES = {
    hifz: ['Hifz Prep (Nazra)', 'Hifz Year 1 (Para 1-10)', 'Hifz Year 2 (Para 11-20)', 'Hifz Year 3 (Para 21-30)', 'Tajweed & Qirat'],
    dars: [
      'Al-Aalamia (Dawrah-e-Hadith)',
      'Al-Alia (Year 7)',
      'Sadisa (Year 6)',
      'Khamisa (Year 5)',
      'Rabia (Year 4)',
      'Salisa (Year 3)',
      'Saniya (Year 2)',
      'Ula (Year 1)',
    ],
    school: ['Class 6th', 'Class 7th', 'Class 8th', 'Class 9th (Matric Prep)', 'Class 10th (Matric)'],
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sData, cData, hData] = await Promise.all([
        apiRequest<AcademicSession[]>('/api/sessions'),
        apiRequest<ClassItem[]>('/api/classes'),
        apiRequest<Hostel[]>('/api/hostels'),
      ]);
      setSessions(sData);
      setClasses(cData);
      setHostels(hData);
      if (hData.length > 0 && !classHostelId) setClassHostelId(hData[0].id);
      if (sData.length > 0 && !classSessionId) setClassSessionId(sData[0].id);
      if (hData.length > 0 && !batchHostelId) setBatchHostelId(hData[0].id);
      if (sData.length > 0 && !batchSessionId) setBatchSessionId(sData[0].id);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed loading data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setTemplateClassList([...PRESET_TEMPLATES[selectedTemplate]]);
  }, [selectedTemplate]);

  const handleOpenCreateClass = () => {
    setEditingClass(null);
    setClassName('');
    setClassTeacher('');
    setClassRoom('');
    setClassDesc('');
    if (hostels.length > 0) setClassHostelId(hostels[0].id);
    if (sessions.length > 0) setClassSessionId(sessions[0].id);
    setShowClassModal(true);
  };

  const handleOpenEditClass = (c: ClassItem) => {
    setEditingClass(c);
    setClassName(c.name);
    setClassHostelId(c.hostel_id);
    setClassSessionId(c.academic_session_id);
    setClassTeacher(c.teacher_name || '');
    setClassRoom(c.room_no || '');
    setClassDesc(c.description || '');
    setShowClassModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !classHostelId || !classSessionId) {
      alert('Please fill all required class fields (Name, Hostel, Academic Session).');
      return;
    }

    try {
      if (editingClass) {
        await apiRequest(`/api/classes/${editingClass.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: className.trim(),
            hostel_id: classHostelId,
            academic_session_id: classSessionId,
            teacher_name: classTeacher.trim(),
            room_no: classRoom.trim(),
            description: classDesc.trim(),
          }),
        });
        setFeedback({ type: 'success', message: 'Class updated successfully.' });
      } else {
        await apiRequest('/api/classes', {
          method: 'POST',
          body: JSON.stringify({
            name: className.trim(),
            hostel_id: classHostelId,
            academic_session_id: classSessionId,
            teacher_name: classTeacher.trim(),
            room_no: classRoom.trim(),
            description: classDesc.trim(),
          }),
        });
        setFeedback({ type: 'success', message: 'Class created successfully.' });
      }
      setShowClassModal(false);
      loadAll();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed saving class' });
    }
  };

  const handleBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchHostelId || !batchSessionId || templateClassList.length === 0) {
      alert('Please select hostel, session, and at least one class.');
      return;
    }

    setCreatingBatch(true);
    try {
      const res = await apiRequest<{ success: boolean; count: number; message: string }>('/api/classes/batch-create', {
        method: 'POST',
        body: JSON.stringify({
          hostel_id: batchHostelId,
          academic_session_id: batchSessionId,
          class_names: templateClassList,
        }),
      });
      setFeedback({ type: 'success', message: res.message });
      setShowBatchModal(false);
      loadAll();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Batch creation failed' });
    } finally {
      setCreatingBatch(false);
    }
  };

  // Open Delete Class Modal
  const handleOpenDeleteClass = (c: ClassItem) => {
    setDeletingClass(c);
    const otherClass = classes.find((x) => x.id !== c.id && x.hostel_id === c.hostel_id);
    setTransferTargetClassId(otherClass ? otherClass.id : '');
  };

  // Execute Deletion of Class
  const executeDeleteClass = async (mode: 'direct' | 'force' | 'transfer_first') => {
    if (!deletingClass) return;

    setDeletingExecuting(true);
    try {
      if (mode === 'transfer_first') {
        if (!transferTargetClassId) {
          alert('Please select a destination class to transfer students into.');
          setDeletingExecuting(false);
          return;
        }

        // Fetch students in this class
        const enrolled = await apiRequest<any[]>(`/api/classes/${deletingClass.id}/students`);
        if (enrolled.length > 0) {
          await apiRequest('/api/students/bulk-transfer', {
            method: 'POST',
            body: JSON.stringify({
              student_ids: enrolled.map((s) => s.id),
              target_class_id: Number(transferTargetClassId),
            }),
          });
        }

        // Now delete class
        const res = await apiRequest<{ success: boolean; message: string }>(`/api/classes/${deletingClass.id}`, {
          method: 'DELETE',
        });
        setFeedback({ type: 'success', message: `Students transferred to new class and "${deletingClass.name}" removed.` });
      } else if (mode === 'force') {
        const res = await apiRequest<{ success: boolean; message: string }>(`/api/classes/${deletingClass.id}?force=true`, {
          method: 'DELETE',
        });
        setFeedback({ type: 'success', message: res.message });
      } else {
        const res = await apiRequest<{ success: boolean; message: string }>(`/api/classes/${deletingClass.id}`, {
          method: 'DELETE',
        });
        setFeedback({ type: 'success', message: res.message });
      }

      setSelectedClassIds((prev) => prev.filter((id) => id !== deletingClass.id));
      setDeletingClass(null);
      loadAll();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed deleting class' });
    } finally {
      setDeletingExecuting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClassIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete all ${selectedClassIds.length} selected classes?\n\nStudents assigned to these classes will be set to unassigned.`
      )
    ) {
      return;
    }

    setDeletingBulk(true);
    try {
      const res = await apiRequest<{ success: boolean; count: number; message: string }>('/api/classes/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ class_ids: selectedClassIds, force: true }),
      });
      setFeedback({ type: 'success', message: res.message });
      setSelectedClassIds([]);
      loadAll();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Bulk delete failed' });
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleInspectClass = async (c: ClassItem) => {
    setInspectClass(c);
    setLoadingInspect(true);
    try {
      const students = await apiRequest<any[]>(`/api/classes/${c.id}/students`);
      setInspectStudents(students);
    } catch (err: any) {
      alert(err.message || 'Failed to load class students');
    } finally {
      setLoadingInspect(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim() || !sessionStart || !sessionEnd) {
      alert('Please fill all session fields.');
      return;
    }

    try {
      await apiRequest('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          name: sessionName.trim(),
          start_date: sessionStart,
          end_date: sessionEnd,
        }),
      });
      setFeedback({ type: 'success', message: 'Academic session created successfully.' });
      setShowSessionModal(false);
      setSessionName('');
      setSessionStart('');
      setSessionEnd('');
      loadAll();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed creating session' });
    }
  };

  const toggleSelectClass = (id: number) => {
    setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAll = (filteredClasses: ClassItem[]) => {
    if (selectedClassIds.length === filteredClasses.length && filteredClasses.length > 0) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(filteredClasses.map((c) => c.id));
    }
  };

  const filteredClasses = classes.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.teacher_name && c.teacher_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.room_no && c.room_no.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchHostel = filterHostelId === 'all' || String(c.hostel_id) === filterHostelId;
    const matchSession = filterSessionId === 'all' || String(c.academic_session_id) === filterSessionId;
    return matchSearch && matchHostel && matchSession;
  });

  const totalAssignedStudents = classes.reduce((sum, c) => sum + (c.active_students_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Class Structure & Academic Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure hostel classes, in-charge teachers, rooms, curriculum presets, and student reassignments before deletion.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSessionModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Academic Session</span>
          </button>

          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Batch Class Templates</span>
          </button>

          <button
            onClick={handleOpenCreateClass}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Class</span>
          </button>
        </div>
      </div>

      {/* 2. STATS PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Classes</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{classes.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Assigned Students</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{totalAssignedStudents}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Active Sessions</div>
          <div className="text-xl font-bold text-indigo-700 mt-0.5">{sessions.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Filtered Classes</div>
          <div className="text-xl font-bold text-slate-800 mt-0.5">{filteredClasses.length}</div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="font-semibold underline cursor-pointer text-slate-600">
            Dismiss
          </button>
        </div>
      )}

      {/* 3. CLASSES LIST CARD */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Configured Classes ({classes.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Classes are organized by hostel block and session. Click enrolled count to view students.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search class, teacher, room..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={filterHostelId}
              onChange={(e) => setFilterHostelId(e.target.value)}
              className="py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Hostels</option>
              {hostels.map((h) => (
                <option key={h.id} value={String(h.id)}>
                  {h.name}
                </option>
              ))}
            </select>

            <select
              value={filterSessionId}
              onChange={(e) => setFilterSessionId(e.target.value)}
              className="py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* BULK ACTION BAR */}
        {selectedClassIds.length > 0 && (
          <div className="mx-5 my-3 p-3 bg-rose-50 border border-rose-300 rounded-lg flex items-center justify-between flex-wrap gap-2 text-rose-950 text-xs shadow-xs">
            <div className="flex items-center gap-2 font-semibold">
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">
                {selectedClassIds.length}
              </span>
              <span>Selected {selectedClassIds.length} class(es)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedClassIds([])}
                className="px-3 py-1 bg-white border border-rose-200 rounded text-rose-700 hover:bg-rose-100 font-semibold cursor-pointer"
              >
                Deselect All
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deletingBulk}
                className="flex items-center gap-1.5 px-3.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingBulk ? 'Deleting...' : `Delete Selected (${selectedClassIds.length})`}</span>
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={filteredClasses.length > 0 && selectedClassIds.length === filteredClasses.length}
                    onChange={() => handleSelectAll(filteredClasses)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3">Class Name</th>
                <th className="py-2.5 px-3">Hostel Block</th>
                <th className="py-2.5 px-3">Academic Session</th>
                <th className="py-2.5 px-3">Teacher In-charge</th>
                <th className="py-2.5 px-3">Hall / Room</th>
                <th className="py-2.5 px-3">Enrolled Students</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading classes...</div>
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No classes match the filter. Click "Add Single Class" or "Batch Class Templates" above.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((c) => {
                  const isSelected = selectedClassIds.includes(c.id);
                  return (
                    <tr key={c.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-emerald-50/50' : ''}`}>
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectClass(c.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{c.name}</td>
                      <td className="py-2.5 px-3 font-medium text-emerald-800">{c.hostel_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{c.academic_session_name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{c.teacher_name || 'Unassigned'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{c.room_no || 'N/A'}</td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleInspectClass(c)}
                          className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 hover:underline cursor-pointer bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded"
                          title="Click to view students"
                        >
                          <Users className="w-3 h-3" />
                          <span>{c.active_students_count || 0} students</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditClass(c)}
                          title="Edit Class"
                          className="p-1 hover:bg-slate-100 text-emerald-700 rounded cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteClass(c)}
                          title="Remove Class"
                          className="p-1 hover:bg-rose-50 text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL: DEDICATED DELETE CLASS CONFIRMATION & STUDENT REASSIGNMENT */}
      {deletingClass && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Class: {deletingClass.name}</h3>
                  <p className="text-xs text-slate-500">Hostel: {deletingClass.hostel_name} · Session: {deletingClass.academic_session_name}</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingClass(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Check if class has active students */}
            {(deletingClass.active_students_count || 0) > 0 ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>{deletingClass.active_students_count} Active Students Enrolled</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    To prevent leaving students stranded without a class, you can conveniently transfer them to another class first, or force-delete to mark them unassigned.
                  </p>
                </div>

                {/* Option A: Transfer to another class */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <label className="block font-bold text-slate-800">
                    Option 1: Transfer Students & Delete Class (Recommended)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Select a target class to safely receive all {deletingClass.active_students_count} students before this class is removed:
                  </p>
                  <select
                    value={transferTargetClassId}
                    onChange={(e) => setTransferTargetClassId(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-medium cursor-pointer"
                  >
                    <option value="">-- Choose Destination Class --</option>
                    {classes
                      .filter((c) => c.id !== deletingClass.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.hostel_name} › {c.name} ({c.active_students_count || 0} students)
                        </option>
                      ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => executeDeleteClass('transfer_first')}
                    disabled={deletingExecuting || !transferTargetClassId}
                    className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>{deletingExecuting ? 'Processing...' : 'Transfer Students & Delete Class'}</span>
                  </button>
                </div>

                {/* Option B: Force delete */}
                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-rose-900">Option 2: Force Delete</div>
                    <div className="text-[11px] text-rose-700">Enrolled students will be marked inactive / unassigned.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => executeDeleteClass('force')}
                    disabled={deletingExecuting}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    Force Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  This class has no active students enrolled. Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-900">"{deletingClass.name}"</strong>?
                </p>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeletingClass(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => executeDeleteClass('direct')}
                    disabled={deletingExecuting}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {deletingExecuting ? 'Deleting...' : 'Yes, Delete Class'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL: BATCH CLASS TEMPLATES */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Batch Quick Class Creation</span>
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBatchCreate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Target Hostel Block</label>
                  <select
                    required
                    value={batchHostelId || ''}
                    onChange={(e) => setBatchHostelId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {hostels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Academic Session</label>
                  <select
                    required
                    value={batchSessionId || ''}
                    onChange={(e) => setBatchSessionId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Template selector pills */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Choose Preset Curriculum Template</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('hifz')}
                    className={`p-2 rounded-lg border text-center font-semibold cursor-pointer transition-colors ${
                      selectedTemplate === 'hifz'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Hifz & Nazra
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('dars')}
                    className={`p-2 rounded-lg border text-center font-semibold cursor-pointer transition-colors ${
                      selectedTemplate === 'dars'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Dars-e-Nizami (8 Yrs)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('school')}
                    className={`p-2 rounded-lg border text-center font-semibold cursor-pointer transition-colors ${
                      selectedTemplate === 'school'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    General Classes
                  </button>
                </div>
              </div>

              {/* Editable class items */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Classes to be Created ({templateClassList.length})
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5">
                  {templateClassList.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded border border-slate-200">
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => setTemplateClassList(templateClassList.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBatch || templateClassList.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {creatingBatch ? 'Creating...' : `Create All ${templateClassList.length} Classes`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: SINGLE CREATE / EDIT CLASS */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              <span>{editingClass ? 'Edit Class Section' : 'Create Class Section'}</span>
            </h3>

            <form onSubmit={handleSaveClass} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Class Name *</label>
                <input
                  type="text"
                  required
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. Hifz Class 1 / Nazra Section A / Dawrah-e-Hadith"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hostel Block *</label>
                  <select
                    value={classHostelId || ''}
                    onChange={(e) => setClassHostelId(Number(e.target.value))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {hostels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Academic Session *</label>
                  <select
                    value={classSessionId || ''}
                    onChange={(e) => setClassSessionId(Number(e.target.value))}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">In-charge Ustadh / Teacher</label>
                  <input
                    type="text"
                    value={classTeacher}
                    onChange={(e) => setClassTeacher(e.target.value)}
                    placeholder="e.g. Qari Noor Muhammad"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hall / Room No</label>
                  <input
                    type="text"
                    value={classRoom}
                    onChange={(e) => setClassRoom(e.target.value)}
                    placeholder="e.g. Hall 2 / Room 104"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={classDesc}
                  onChange={(e) => setClassDesc(e.target.value)}
                  placeholder="Curriculum details or timings..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow-sm cursor-pointer"
                >
                  {editingClass ? 'Save Changes' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: INSPECT CLASS STUDENTS */}
      {inspectClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>Enrolled in {inspectClass.name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hostel: {inspectClass.hostel_name} · Teacher: {inspectClass.teacher_name || 'Unassigned'}
                </p>
              </div>
              <button
                onClick={() => setInspectClass(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 text-xs">
              {loadingInspect ? (
                <div className="py-8 text-center text-slate-500">Loading students...</div>
              ) : inspectStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No active students in this class.</div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Roll No</th>
                      <th className="p-2">Student Name</th>
                      <th className="p-2">Father Name</th>
                      <th className="p-2">Room No</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-2 font-mono font-bold text-slate-900">{s.roll_no}</td>
                        <td className="p-2 font-medium">{s.name}</td>
                        <td className="p-2 text-slate-500">{s.father_name}</td>
                        <td className="p-2 font-mono text-emerald-800">{s.room_no || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setInspectClass(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: ACADEMIC SESSION */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span>Create Academic Session / Term</span>
            </h3>

            <form onSubmit={handleCreateSession} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Session / Year Name</label>
                <input
                  type="text"
                  required
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g. 2026-2027 / 1447-1448 AH"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={sessionStart}
                    onChange={(e) => setSessionStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={sessionEnd}
                    onChange={(e) => setSessionEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow-sm cursor-pointer"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
