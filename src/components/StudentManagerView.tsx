import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import {
  Student,
  Hostel,
  AcademicSession,
  ClassItem,
  StudentHistory,
} from '../types.js';
import {
  Users,
  UserPlus,
  Edit2,
  UserX,
  UserCheck,
  Search,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  FileSpreadsheet,
  ArrowRightLeft,
  Sparkles,
  Phone,
  DoorOpen,
  Filter,
  RefreshCw,
  X,
  ChevronDown,
  Info,
} from 'lucide-react';

interface ParsedImportStudent {
  roll_no: string;
  name: string;
  father_name: string;
  room_no?: string;
  phone?: string;
  isValid: boolean;
  error?: string;
}

export const StudentManagerView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterHostel, setFilterHostel] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Add / Edit Modal
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formRoll, setFormRoll] = useState('');
  const [formName, setFormName] = useState('');
  const [formFather, setFormFather] = useState('');
  const [formHostelId, setFormHostelId] = useState<number | null>(null);
  const [formClassId, setFormClassId] = useState<number | null>(null);
  const [formSessionId, setFormSessionId] = useState<number | null>(null);
  const [formRoom, setFormRoom] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [fetchingNextRoll, setFetchingNextRoll] = useState(false);

  // Delete Confirm Modal
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Bulk Transfer Modal
  const [showBulkTransferModal, setShowBulkTransferModal] = useState(false);
  const [transferTargetHostelId, setTransferTargetHostelId] = useState<number | ''>('');
  const [transferTargetClassId, setTransferTargetClassId] = useState<number | ''>('');
  const [transferring, setTransferring] = useState(false);

  // Bulk Import Modal (Excel / CSV / Pasted text)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importHostelId, setImportHostelId] = useState<number | null>(null);
  const [importClassId, setImportClassId] = useState<number | null>(null);
  const [importSessionId, setImportSessionId] = useState<number | null>(null);
  const [rawImportText, setRawImportText] = useState('');
  const [parsedStudents, setParsedStudents] = useState<ParsedImportStudent[]>([]);
  const [importing, setImporting] = useState(false);

  // History Modal
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [studentHistory, setStudentHistory] = useState<StudentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterHostel) params.append('hostel_id', filterHostel);
      if (filterClass) params.append('class_id', filterClass);
      if (filterSession) params.append('academic_session_id', filterSession);
      if (filterStatus) params.append('status', filterStatus);

      const data = await apiRequest<Student[]>(`/api/students?${params.toString()}`);
      setStudents(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed loading students' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadMeta() {
      try {
        const [hData, sData, cData] = await Promise.all([
          apiRequest<Hostel[]>('/api/hostels'),
          apiRequest<AcademicSession[]>('/api/sessions'),
          apiRequest<ClassItem[]>('/api/classes'),
        ]);
        setHostels(hData);
        setSessions(sData);
        setClasses(cData);
        if (hData.length > 0) {
          setFormHostelId(hData[0].id);
          setImportHostelId(hData[0].id);
        }
        if (sData.length > 0) {
          setFormSessionId(sData[0].id);
          setImportSessionId(sData[0].id);
        }
        if (cData.length > 0) {
          setFormClassId(cData[0].id);
          setImportClassId(cData[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [filterHostel, filterClass, filterSession, filterStatus]);

  // When class or session changes in create form, suggest next sequential roll number
  const handleAutoSuggestRoll = async (classId?: number, sessionId?: number) => {
    const cId = classId || formClassId;
    const sId = sessionId || formSessionId;
    if (!cId || !sId) return;

    setFetchingNextRoll(true);
    try {
      const res = await apiRequest<{ next_roll_no: string }>(
        `/api/students/next-roll?class_id=${cId}&academic_session_id=${sId}`
      );
      if (res.next_roll_no) {
        setFormRoll(res.next_roll_no);
      }
    } catch (e) {
      // fallback
    } finally {
      setFetchingNextRoll(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingStudent(null);
    setFormRoll('');
    setFormName('');
    setFormFather('');
    setFormRoom('');
    setFormPhone('');
    if (hostels.length > 0) setFormHostelId(hostels[0].id);
    if (sessions.length > 0) setFormSessionId(sessions[0].id);
    
    // Pick first class for this hostel
    const defaultHostelId = hostels.length > 0 ? hostels[0].id : null;
    const matchingClasses = classes.filter((c) => !defaultHostelId || c.hostel_id === defaultHostelId);
    const chosenClassId = matchingClasses.length > 0 ? matchingClasses[0].id : (classes[0]?.id || null);
    setFormClassId(chosenClassId);

    setModalMode('create');

    if (chosenClassId && sessions[0]?.id) {
      handleAutoSuggestRoll(chosenClassId, sessions[0].id);
    }
  };

  const handleOpenEdit = (s: Student) => {
    setEditingStudent(s);
    setFormRoll(s.roll_no);
    setFormName(s.name);
    setFormFather(s.father_name);
    setFormHostelId(s.hostel_id);
    setFormClassId(s.class_id);
    setFormSessionId(s.academic_session_id);
    setFormRoom(s.room_no || '');
    setFormPhone(s.phone || '');
    setModalMode('edit');
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoll.trim() || !formName.trim() || !formFather.trim() || !formHostelId || !formClassId || !formSessionId) {
      alert('Please fill all required student fields (Roll No, Name, Father Name, Hostel, Class).');
      return;
    }

    try {
      if (modalMode === 'create') {
        const res = await apiRequest<{ success: boolean; message: string }>('/api/students', {
          method: 'POST',
          body: JSON.stringify({
            roll_no: formRoll.trim(),
            name: formName.trim(),
            father_name: formFather.trim(),
            hostel_id: formHostelId,
            class_id: formClassId,
            academic_session_id: formSessionId,
            room_no: formRoom.trim(),
            phone: formPhone.trim(),
          }),
        });
        setFeedback({ type: 'success', message: res.message });
      } else if (editingStudent) {
        const res = await apiRequest<{ success: boolean; message: string }>(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            roll_no: formRoll.trim(),
            name: formName.trim(),
            father_name: formFather.trim(),
            hostel_id: formHostelId,
            class_id: formClassId,
            academic_session_id: formSessionId,
            room_no: formRoom.trim(),
            phone: formPhone.trim(),
          }),
        });
        setFeedback({ type: 'success', message: res.message });
      }

      setModalMode(null);
      fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed' });
    }
  };

  const handleDeactivate = async (s: Student) => {
    if (!confirm(`Are you sure you want to deactivate ${s.name}? Historical attendance records remain 100% preserved.`)) {
      return;
    }
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/students/${s.id}/deactivate`, {
        method: 'POST',
      });
      setFeedback({ type: 'success', message: res.message });
      fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Deactivation failed' });
    }
  };

  const handleRestore = async (s: Student) => {
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/students/${s.id}/restore`, {
        method: 'POST',
      });
      setFeedback({ type: 'success', message: res.message });
      fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Restore failed' });
    }
  };

  // Open single student delete confirmation modal
  const handleConfirmDeleteSingle = (s: Student) => {
    setDeletingStudent(s);
  };

  const executeDeleteStudent = async () => {
    if (!deletingStudent) return;
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/students/${deletingStudent.id}`, {
        method: 'DELETE',
      });
      setFeedback({ type: 'success', message: res.message });
      setSelectedIds((prev) => prev.filter((id) => id !== deletingStudent.id));
      setDeletingStudent(null);
      fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed deleting student' });
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY REMOVE all ${selectedIds.length} selected students?\n\nThis will remove them from active rosters while historical attendance snapshots remain securely preserved in audit history.`
      )
    ) {
      return;
    }

    setDeletingBulk(true);
    setFeedback(null);
    try {
      const res = await apiRequest<{ success: boolean; count: number; message: string }>('/api/students/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ student_ids: selectedIds }),
      });
      setFeedback({ type: 'success', message: res.message });
      setSelectedIds([]);
      fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed bulk deletion' });
    } finally {
      setDeletingBulk(false);
    }
  };

  // Bulk Transfer Handler
  const handleOpenBulkTransfer = () => {
    if (selectedIds.length === 0) return;
    setTransferTargetHostelId('');
    setTransferTargetClassId('');
    setShowBulkTransferModal(true);
  };

  const executeBulkTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetHostelId && !transferTargetClassId) {
      alert('Please choose a target hostel block or class.');
      return;
    }

    setTransferring(true);
    try {
      const res = await apiRequest<{ success: boolean; count: number; message: string }>(
        '/api/students/bulk-transfer',
        {
          method: 'POST',
          body: JSON.stringify({
            student_ids: selectedIds,
            target_hostel_id: transferTargetHostelId || undefined,
            target_class_id: transferTargetClassId || undefined,
          }),
        }
      );
      setFeedback({ type: 'success', message: res.message });
      setShowBulkTransferModal(false);
      setSelectedIds([]);
      fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Transfer failed' });
    } finally {
      setTransferring(false);
    }
  };

  // Bulk Import Parser (Excel / CSV / Tab-separated lines)
  const handleParseRawText = (text: string) => {
    setRawImportText(text);
    if (!text.trim()) {
      setParsedStudents([]);
      return;
    }

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: ParsedImportStudent[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip header if line has 'roll' and 'name'
      if (i === 0 && line.toLowerCase().includes('roll') && line.toLowerCase().includes('name')) {
        continue;
      }

      // Delimiter detection: tab, comma, semicolon, or vertical pipe
      let parts: string[] = [];
      if (line.includes('\t')) parts = line.split('\t');
      else if (line.includes(',')) parts = line.split(',');
      else if (line.includes(';')) parts = line.split(';');
      else if (line.includes('|')) parts = line.split('|');
      else parts = line.split(/\s{2,}/); // 2 or more spaces

      parts = parts.map((p) => p.trim());

      const roll_no = parts[0] || '';
      const name = parts[1] || '';
      const father_name = parts[2] || '';
      const room_no = parts[3] || '';
      const phone = parts[4] || '';

      const isValid = Boolean(roll_no && name);
      let error = '';
      if (!roll_no) error = 'Missing Roll Number';
      else if (!name) error = 'Missing Student Name';

      parsed.push({
        roll_no,
        name,
        father_name: father_name || 'N/A',
        room_no,
        phone,
        isValid,
        error,
      });
    }

    setParsedStudents(parsed);
  };

  const executeBulkImport = async () => {
    if (!importHostelId || !importClassId || !importSessionId) {
      alert('Please select Hostel block, Class, and Academic Session.');
      return;
    }

    const validRows = parsedStudents.filter((r) => r.isValid);
    if (validRows.length === 0) {
      alert('No valid student rows found. Please check your data format.');
      return;
    }

    setImporting(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        importedCount: number;
        skippedCount: number;
        skippedRolls: string[];
        message: string;
      }>('/api/students/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          hostel_id: importHostelId,
          class_id: importClassId,
          academic_session_id: importSessionId,
          students: validRows.map((v) => ({
            roll_no: v.roll_no,
            name: v.name,
            father_name: v.father_name,
            room_no: v.room_no,
            phone: v.phone,
          })),
        }),
      });

      setFeedback({ type: 'success', message: res.message });
      setShowImportModal(false);
      setRawImportText('');
      setParsedStudents([]);
      fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  };

  const toggleSelectStudent = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  };

  const viewHistory = async (s: Student) => {
    setHistoryStudent(s);
    setLoadingHistory(true);
    try {
      const data = await apiRequest<StudentHistory[]>(`/api/students/${s.id}/history`);
      setStudentHistory(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filtered classes based on selected hostel in form modal
  const formClassesForSelectedHostel = formHostelId
    ? classes.filter((c) => c.hostel_id === formHostelId)
    : classes;

  const importClassesForSelectedHostel = importHostelId
    ? classes.filter((c) => c.hostel_id === importHostelId)
    : classes;

  const activeStudentsCount = students.filter((s) => s.status === 'active').length;
  const inactiveStudentsCount = students.length - activeStudentsCount;

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Student Registry & Enrollment Manager
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Convenient student addition, bulk Excel import, instant next-roll auto-fill, bulk transfer, and deletion controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setRawImportText('');
              setParsedStudents([]);
              setShowImportModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-lg text-xs cursor-pointer transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Bulk Import (Excel/CSV)</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md cursor-pointer transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* 2. STATS PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Enrolled</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{students.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Active Students</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{activeStudentsCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Inactive / Deactivated</div>
          <div className="text-xl font-bold text-amber-700 mt-0.5">{inactiveStudentsCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Selected Count</div>
          <div className="text-xl font-bold text-indigo-700 mt-0.5">{selectedIds.length}</div>
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="underline cursor-pointer font-medium">
            Dismiss
          </button>
        </div>
      )}

      {/* 3. FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Search Record</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
              placeholder="Name, roll, room, or phone..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Hostel Block</label>
          <select
            value={filterHostel}
            onChange={(e) => setFilterHostel(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">All Hostels</option>
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Class</label>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.hostel_name ? `${c.hostel_name} › ` : ''}{c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Academic Session</label>
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">All Sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-700 font-semibold mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive / Deactivated</option>
            <option value="">All Statuses</option>
          </select>
        </div>
      </div>

      {/* 4. BULK ACTION BAR */}
      {selectedIds.length > 0 && (
        <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-3.5 text-xs flex items-center justify-between flex-wrap gap-3 text-white shadow-md">
          <div className="flex items-center gap-2.5 font-semibold">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-bold">
              {selectedIds.length}
            </span>
            <span>{selectedIds.length} student(s) selected</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-semibold cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={handleOpenBulkTransfer}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold cursor-pointer shadow-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer Selected ({selectedIds.length})</span>
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={deletingBulk}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deletingBulk ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. STUDENTS TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 w-8">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && selectedIds.length === students.length}
                    onChange={handleSelectAll}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 font-mono">Roll No</th>
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Father Name</th>
                <th className="py-3 px-3">Hostel Block</th>
                <th className="py-3 px-3">Class</th>
                <th className="py-3 px-3">Room / Phone</th>
                <th className="py-3 px-3">Session</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <div>Loading student registry...</div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No students match the current criteria. Use "Add Student" or "Bulk Import" to enroll students.
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const isSelected = selectedIds.includes(s.id);
                  return (
                    <tr key={s.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-emerald-50/50' : ''}`}>
                      <td className="py-2.5 px-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(s.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.roll_no}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{s.father_name}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{s.hostel_name}</td>
                      <td className="py-2.5 px-3">{s.class_name}</td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600">
                        {s.room_no ? <span className="font-semibold text-indigo-700 mr-2">Room {s.room_no}</span> : null}
                        {s.phone ? <span className="text-slate-500 font-mono">{s.phone}</span> : null}
                        {!s.room_no && !s.phone ? <span className="text-slate-400">—</span> : null}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{s.academic_session_name}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => viewHistory(s)}
                          title="View Progression History"
                          className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Edit Student Record"
                          className="p-1 hover:bg-emerald-50 text-emerald-700 rounded cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {s.status === 'active' ? (
                          <button
                            onClick={() => handleDeactivate(s)}
                            title="Deactivate Student (Preserves Attendance)"
                            className="p-1 hover:bg-amber-50 text-amber-700 rounded cursor-pointer"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestore(s)}
                            title="Restore Student"
                            className="p-1 hover:bg-emerald-50 text-emerald-700 rounded cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleConfirmDeleteSingle(s)}
                          title="Permanently Remove Student"
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

      {/* 6. CREATE / EDIT MODAL */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>{modalMode === 'create' ? 'Enroll New Student' : 'Edit Student Record'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3.5 text-xs">
              {/* Roll Number with Auto-Suggest */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold">Roll Number *</label>
                  {modalMode === 'create' && (
                    <button
                      type="button"
                      onClick={() => handleAutoSuggestRoll()}
                      disabled={fetchingNextRoll}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{fetchingNextRoll ? 'Fetching...' : '⚡ Auto Next Roll'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formRoll}
                  onChange={(e) => setFormRoll(e.target.value)}
                  placeholder="e.g. 101 or 021"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-mono text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Name & Father Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Muhammad Bilal"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Father Name *</label>
                  <input
                    type="text"
                    required
                    value={formFather}
                    onChange={(e) => setFormFather(e.target.value)}
                    placeholder="e.g. Tariq Mehmood"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Hostel and Class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hostel Block *</label>
                  <select
                    value={formHostelId || ''}
                    onChange={(e) => {
                      const newHId = Number(e.target.value);
                      setFormHostelId(newHId);
                      const matching = classes.filter((c) => c.hostel_id === newHId);
                      if (matching.length > 0) {
                        setFormClassId(matching[0].id);
                        if (modalMode === 'create') handleAutoSuggestRoll(matching[0].id, formSessionId || undefined);
                      }
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {hostels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Class *</label>
                  <select
                    value={formClassId || ''}
                    onChange={(e) => {
                      const newCId = Number(e.target.value);
                      setFormClassId(newCId);
                      if (modalMode === 'create') handleAutoSuggestRoll(newCId, formSessionId || undefined);
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    {formClassesForSelectedHostel.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Room Number & Phone Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Room / Bed No (Optional)</label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    placeholder="e.g. 104-B"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone / Guardian Contact</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 0300-1234567"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Session */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Academic Session *</label>
                <select
                  value={formSessionId || ''}
                  onChange={(e) => {
                    const newSId = Number(e.target.value);
                    setFormSessionId(newSId);
                    if (modalMode === 'create') handleAutoSuggestRoll(formClassId || undefined, newSId);
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
                >
                  {modalMode === 'create' ? 'Enroll Student' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. SINGLE DELETE CONFIRMATION MODAL */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Permanently Remove Student</h3>
                <p className="text-xs text-slate-500">Please confirm student removal</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <div><strong className="text-slate-900">Name:</strong> {deletingStudent.name}</div>
              <div><strong className="text-slate-900">Roll No:</strong> <span className="font-mono font-bold text-slate-800">{deletingStudent.roll_no}</span></div>
              <div><strong className="text-slate-900">Father:</strong> {deletingStudent.father_name}</div>
              <div><strong className="text-slate-900">Hostel & Class:</strong> {deletingStudent.hostel_name} › {deletingStudent.class_name}</div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Historical prayer attendance snapshots remain 100% saved for institutional records and audit compliance.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteStudent}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
              >
                Yes, Remove Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. BULK TRANSFER MODAL */}
      {showBulkTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <ArrowRightLeft className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Bulk Transfer Students ({selectedIds.length})
                </h3>
              </div>
              <button
                onClick={() => setShowBulkTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Move all {selectedIds.length} selected students to another Hostel Block or Class. Transfer history will be automatically recorded.
            </p>

            <form onSubmit={executeBulkTransfer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Hostel Block</label>
                <select
                  value={transferTargetHostelId}
                  onChange={(e) => setTransferTargetHostelId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">Keep Current Hostel</option>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Class</label>
                <select
                  value={transferTargetClassId}
                  onChange={(e) => setTransferTargetClassId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">Keep Current Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.hostel_name ? `${c.hostel_name} › ` : ''}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBulkTransferModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {transferring ? 'Transferring...' : `Execute Transfer (${selectedIds.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. BULK IMPORT MODAL (EXCEL / CSV / RAW TEXT) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Bulk Import Students from Excel / CSV</h3>
                  <p className="text-xs text-slate-500">Paste rows directly from Microsoft Excel or Google Sheets</p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Target Hostel Block *</label>
                  <select
                    value={importHostelId || ''}
                    onChange={(e) => {
                      const newHId = Number(e.target.value);
                      setImportHostelId(newHId);
                      const match = classes.filter((c) => c.hostel_id === newHId);
                      if (match.length > 0) setImportClassId(match[0].id);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-medium cursor-pointer"
                  >
                    {hostels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Target Class *</label>
                  <select
                    value={importClassId || ''}
                    onChange={(e) => setImportClassId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-medium cursor-pointer"
                  >
                    {importClassesForSelectedHostel.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Academic Session *</label>
                  <select
                    value={importSessionId || ''}
                    onChange={(e) => setImportSessionId(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-medium cursor-pointer"
                  >
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Paste Rows (Columns: Roll No · Name · Father Name · Room · Phone)
                </label>
                <textarea
                  rows={5}
                  value={rawImportText}
                  onChange={(e) => handleParseRawText(e.target.value)}
                  placeholder="001	Muhammad Ali	Tariq Mehmood	101	0300-1111111&#10;002	Usman Ghani	Abdul Majeed	102	0300-2222222&#10;003	Hamza Tariq	Muhammad Tariq	103	0300-3333333"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {parsedStudents.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Parsed Preview ({parsedStudents.filter((r) => r.isValid).length} valid rows)</span>
                    <span className="text-[11px] text-slate-500">Duplicate rolls in same class will be automatically skipped</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">Roll</th>
                          <th className="py-2 px-2.5">Name</th>
                          <th className="py-2 px-2.5">Father</th>
                          <th className="py-2 px-2.5">Room</th>
                          <th className="py-2 px-2.5">Phone</th>
                          <th className="py-2 px-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {parsedStudents.map((p, idx) => (
                          <tr key={idx} className={p.isValid ? 'hover:bg-slate-50' : 'bg-rose-50 text-rose-900'}>
                            <td className="py-1.5 px-2.5 font-mono font-bold">{p.roll_no || '—'}</td>
                            <td className="py-1.5 px-2.5 font-medium">{p.name || '—'}</td>
                            <td className="py-1.5 px-2.5 text-slate-500">{p.father_name}</td>
                            <td className="py-1.5 px-2.5">{p.room_no || '—'}</td>
                            <td className="py-1.5 px-2.5 font-mono">{p.phone || '—'}</td>
                            <td className="py-1.5 px-2.5">
                              {p.isValid ? (
                                <span className="text-emerald-700 font-bold">✓ Ready</span>
                              ) : (
                                <span className="text-rose-700 font-bold">{p.error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeBulkImport}
                disabled={importing || parsedStudents.filter((r) => r.isValid).length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {importing
                  ? 'Importing...'
                  : `Enroll ${parsedStudents.filter((r) => r.isValid).length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. STUDENT HISTORY MODAL */}
      {historyStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Student Progression Ledger: {historyStudent.name}
                </h3>
                <div className="text-xs text-slate-500 font-mono">
                  Roll: {historyStudent.roll_no} · Father: {historyStudent.father_name}
                </div>
              </div>
              <button
                onClick={() => setHistoryStudent(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto text-xs">
              {loadingHistory ? (
                <div className="py-8 text-center text-slate-500">Loading progression ledger...</div>
              ) : studentHistory.length === 0 ? (
                <div className="py-8 text-center text-slate-500">No previous history entries recorded.</div>
              ) : (
                studentHistory.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{h.class_name} ({h.hostel_name})</span>
                      <span className="font-mono text-emerald-700">{h.academic_session_name}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Active From: {h.start_date}</span>
                      <span>To: {h.end_date || 'Present (Current)'}</span>
                    </div>
                    {h.note && (
                      <div className="text-[11px] text-slate-600 italic">
                        Note: {h.note}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
