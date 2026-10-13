import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import { Hostel, User } from '../types.js';
import {
  Building2,
  UserCheck,
  Plus,
  Edit2,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Trash2,
  Phone,
  Clock,
  Users,
  Search,
  ArrowRightLeft,
  Eye,
  Sparkles,
  ExternalLink,
  BookOpen,
  X,
  Info,
} from 'lucide-react';

interface ManagerUser {
  id: number;
  name: string;
  username: string;
  role: string;
  hostel_id: number;
  hostel_name: string;
  phone?: string;
  shift?: string;
  status: string;
}

interface HostelRosterData {
  hostel: Hostel;
  classes: any[];
  students: any[];
  managers: any[];
}

export const HostelManagerView: React.FC = () => {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter/Search Staff
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedHostelFilter, setSelectedHostelFilter] = useState<string>('all');
  const [staffShiftFilter, setStaffShiftFilter] = useState<string>('all');

  // New / Edit Hostel Modal
  const [showHostelModal, setShowHostelModal] = useState(false);
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [hostelName, setHostelName] = useState('');
  const [hostelDesc, setHostelDesc] = useState('');
  const [hostelCapacity, setHostelCapacity] = useState<number>(100);
  const [hostelWarden, setHostelWarden] = useState('');
  const [hostelPhone, setHostelPhone] = useState('');

  // Delete Hostel Modal
  const [deletingHostel, setDeletingHostel] = useState<Hostel | null>(null);

  // Transfer Students Modal
  const [transferSourceHostel, setTransferSourceHostel] = useState<Hostel | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<number | ''>('');
  const [transferring, setTransferring] = useState(false);

  // Hostel Roster Modal
  const [rosterHostel, setRosterHostel] = useState<Hostel | null>(null);
  const [rosterData, setRosterData] = useState<HostelRosterData | null>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  // New / Edit Manager Modal
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [editingManager, setEditingManager] = useState<ManagerUser | null>(null);
  const [managerName, setManagerName] = useState('');
  const [managerUsername, setManagerUsername] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [managerHostelId, setManagerHostelId] = useState<number | null>(null);
  const [managerPhone, setManagerPhone] = useState('');
  const [managerShift, setManagerShift] = useState('All Prayers');
  const [managerStatus, setManagerStatus] = useState('active');

  // Delete Manager Modal
  const [deletingManager, setDeletingManager] = useState<ManagerUser | null>(null);

  // Quick Reassign Manager Modal
  const [reassigningManager, setReassigningManager] = useState<ManagerUser | null>(null);
  const [reassignTargetHostelId, setReassignTargetHostelId] = useState<number | ''>('');
  const [reassigning, setReassigning] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [hData, mData] = await Promise.all([
        apiRequest<Hostel[]>('/api/hostels'),
        apiRequest<ManagerUser[]>('/api/managers'),
      ]);
      setHostels(hData);
      setManagers(mData);
      if (hData.length > 0 && !managerHostelId) setManagerHostelId(hData[0].id);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed loading data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateHostel = () => {
    setEditingHostel(null);
    setHostelName('');
    setHostelDesc('');
    setHostelCapacity(100);
    setHostelWarden('');
    setHostelPhone('');
    setShowHostelModal(true);
  };

  const handleOpenEditHostel = (h: Hostel) => {
    setEditingHostel(h);
    setHostelName(h.name);
    setHostelDesc(h.description || '');
    setHostelCapacity(h.capacity || 100);
    setHostelWarden(h.warden_name || '');
    setHostelPhone(h.contact_phone || '');
    setShowHostelModal(true);
  };

  const handleSaveHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostelName.trim()) return;

    try {
      if (editingHostel) {
        await apiRequest(`/api/hostels/${editingHostel.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: hostelName.trim(),
            description: hostelDesc.trim(),
            capacity: Number(hostelCapacity) || 100,
            warden_name: hostelWarden.trim(),
            contact_phone: hostelPhone.trim(),
          }),
        });
        setFeedback({ type: 'success', message: `Hostel "${hostelName.trim()}" updated successfully.` });
      } else {
        await apiRequest('/api/hostels', {
          method: 'POST',
          body: JSON.stringify({
            name: hostelName.trim(),
            description: hostelDesc.trim(),
            capacity: Number(hostelCapacity) || 100,
            warden_name: hostelWarden.trim(),
            contact_phone: hostelPhone.trim(),
          }),
        });
        setFeedback({ type: 'success', message: `Hostel "${hostelName.trim()}" created successfully.` });
      }
      setShowHostelModal(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed saving hostel' });
    }
  };

  const handleOpenDeleteHostel = (h: Hostel) => {
    if (h.active_students_count && h.active_students_count > 0) {
      setTransferSourceHostel(h);
      const otherHostel = hostels.find((x) => x.id !== h.id);
      if (otherHostel) setTransferTargetId(otherHostel.id);
      return;
    }
    setDeletingHostel(h);
  };

  const executeDeleteHostel = async () => {
    if (!deletingHostel) return;
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/hostels/${deletingHostel.id}`, {
        method: 'DELETE',
      });
      setFeedback({ type: 'success', message: res.message });
      setDeletingHostel(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed removing hostel' });
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSourceHostel || !transferTargetId) return;

    setTransferring(true);
    try {
      const res = await apiRequest<{ success: boolean; count: number; message: string }>(
        `/api/hostels/${transferSourceHostel.id}/transfer-students`,
        {
          method: 'POST',
          body: JSON.stringify({ target_hostel_id: Number(transferTargetId) }),
        }
      );
      setFeedback({ type: 'success', message: res.message });
      setTransferSourceHostel(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to transfer students' });
    } finally {
      setTransferring(false);
    }
  };

  const handleViewRoster = async (h: Hostel) => {
    setRosterHostel(h);
    setLoadingRoster(true);
    setRosterSearch('');
    try {
      const data = await apiRequest<HostelRosterData>(`/api/hostels/${h.id}/roster`);
      setRosterData(data);
    } catch (err: any) {
      alert(err.message || 'Failed loading roster');
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleOpenCreateManager = (preselectedHostelId?: number) => {
    setEditingManager(null);
    setManagerName('');
    setManagerUsername('');
    setManagerPassword('');
    setManagerPhone('');
    setManagerShift('All Prayers');
    setManagerStatus('active');
    setManagerHostelId(preselectedHostelId || (hostels.length > 0 ? hostels[0].id : null));
    setShowManagerModal(true);
  };

  const handleOpenEditManager = (m: ManagerUser) => {
    setEditingManager(m);
    setManagerName(m.name);
    setManagerUsername(m.username);
    setManagerPassword('');
    setManagerHostelId(m.hostel_id);
    setManagerPhone(m.phone || '');
    setManagerShift(m.shift || 'All Prayers');
    setManagerStatus(m.status || 'active');
    setShowManagerModal(true);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setManagerPassword(pwd);
  };

  const handleSaveManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerName.trim() || !managerHostelId) {
      alert('Please fill all required manager fields.');
      return;
    }

    try {
      if (editingManager) {
        await apiRequest(`/api/managers/${editingManager.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: managerName.trim(),
            hostel_id: managerHostelId,
            phone: managerPhone.trim(),
            shift: managerShift,
            status: managerStatus,
            password: managerPassword ? managerPassword.trim() : undefined,
          }),
        });
        setFeedback({ type: 'success', message: 'Attendant staff updated successfully.' });
      } else {
        if (!managerUsername.trim() || !managerPassword) {
          alert('Username and password are required for new attendant.');
          return;
        }
        await apiRequest('/api/managers', {
          method: 'POST',
          body: JSON.stringify({
            name: managerName.trim(),
            username: managerUsername.trim(),
            password: managerPassword,
            hostel_id: managerHostelId,
            phone: managerPhone.trim(),
            shift: managerShift,
          }),
        });
        setFeedback({ type: 'success', message: 'Attendant staff appointed successfully.' });
      }

      setShowManagerModal(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed saving manager' });
    }
  };

  // Open Delete Manager Modal
  const handleOpenDeleteManager = (m: ManagerUser) => {
    setDeletingManager(m);
  };

  const executeDeleteManager = async () => {
    if (!deletingManager) return;
    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/managers/${deletingManager.id}`, {
        method: 'DELETE',
      });
      setFeedback({ type: 'success', message: res.message });
      setDeletingManager(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed removing manager' });
    }
  };

  // Open Reassign Manager Modal
  const handleOpenReassignManager = (m: ManagerUser) => {
    setReassigningManager(m);
    setReassignTargetHostelId(m.hostel_id);
  };

  const executeReassignManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningManager || !reassignTargetHostelId) return;

    setReassigning(true);
    try {
      await apiRequest(`/api/managers/${reassigningManager.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          hostel_id: Number(reassignTargetHostelId),
        }),
      });
      setFeedback({ type: 'success', message: `Attendant "${reassigningManager.name}" reassigned to new hostel block.` });
      setReassigningManager(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Reassignment failed' });
    } finally {
      setReassigning(false);
    }
  };

  // Filtered staff
  const filteredManagers = managers.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      m.username.toLowerCase().includes(staffSearch.toLowerCase()) ||
      (m.phone && m.phone.includes(staffSearch));
    const matchHostel = selectedHostelFilter === 'all' || String(m.hostel_id) === selectedHostelFilter;
    const matchShift = staffShiftFilter === 'all' || (m.shift && m.shift === staffShiftFilter);
    return matchSearch && matchHostel && matchShift;
  });

  const totalCapacity = hostels.reduce((sum, h) => sum + (h.capacity || 100), 0);
  const totalEnrolled = hostels.reduce((sum, h) => sum + (h.active_students_count || 0), 0);
  const overallOccupancy = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Hostels & Attendant Staff Management
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage residential hostel blocks, bed capacity utilization, wardens, and appointed attendant staff prayer shifts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenCreateHostel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hostel Block</span>
          </button>
          <button
            onClick={() => handleOpenCreateManager()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg text-xs cursor-pointer transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Appoint Attendant Staff</span>
          </button>
        </div>
      </div>

      {/* 2. STATS PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Hostel Blocks</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{hostels.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Total Enrolled</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{totalEnrolled} / {totalCapacity} Beds</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">Overall Occupancy</div>
          <div className="text-xl font-bold text-indigo-700 mt-0.5">{overallOccupancy}%</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Attendant Staff</div>
          <div className="text-xl font-bold text-slate-800 mt-0.5">{managers.length}</div>
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

      {/* 3. HOSTEL BLOCKS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Residential Hostel Blocks ({hostels.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Total Enrolled: {totalEnrolled} students across all blocks
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostels.map((h) => {
            const capacity = h.capacity || 100;
            const enrolled = h.active_students_count || 0;
            const percent = Math.min(100, Math.round((enrolled / capacity) * 100));

            return (
              <div
                key={h.id}
                className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-5 shadow-xs transition-all space-y-4"
              >
                {/* Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm">
                      {h.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-tight">{h.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{h.description || 'Hostel Block'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditHostel(h)}
                      title="Edit Block Settings"
                      className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteHostel(h)}
                      title="Remove Block"
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Capacity Occupancy</span>
                    <span className="font-mono font-bold text-slate-800">
                      {enrolled} / {capacity} beds ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percent >= 90 ? 'bg-rose-500' : percent >= 75 ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Warden: {h.warden_name || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-mono">{h.contact_phone || 'No phone'}</span>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleViewRoster(h)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>View Roster ({enrolled})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenCreateManager(h.id)}
                      title="Appoint staff for this block"
                      className="flex items-center gap-1 px-2.5 py-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Appoint Staff</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. ATTENDANT STAFF SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Appointed Attendant Staff & Managers ({managers.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Attendants record daily five-times prayers and resident leaves for their assigned hostel blocks.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="Search name, @user, or phone..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs w-44 sm:w-52 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filter by Shift */}
            <select
              value={staffShiftFilter}
              onChange={(e) => setStaffShiftFilter(e.target.value)}
              className="py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Shifts</option>
              <option value="All Prayers">All 5 Daily Prayers</option>
              <option value="Fajr & Isha">Fajr & Isha</option>
              <option value="Zuhr, Asr, Maghrib">Day Shift</option>
              <option value="Night Supervisor">Night Supervisor</option>
            </select>

            {/* Filter by Hostel */}
            <select
              value={selectedHostelFilter}
              onChange={(e) => setSelectedHostelFilter(e.target.value)}
              className="py-1.5 px-2.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Hostels</option>
              {hostels.map((h) => (
                <option key={h.id} value={String(h.id)}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredManagers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No attendant staff found matching your criteria. Click "Appoint Attendant Staff" to add staff.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Attendant Name</th>
                  <th className="py-3 px-3">Username</th>
                  <th className="py-3 px-3">Assigned Hostel Block</th>
                  <th className="py-3 px-3">Duty Shift</th>
                  <th className="py-3 px-3">Contact Phone</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredManagers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 text-blue-800 flex items-center justify-center font-bold text-xs">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{m.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">@{m.username}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        <Building2 className="w-3 h-3 text-emerald-600" />
                        <span>{m.hostel_name || 'Unassigned'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px]">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{m.shift || 'All Prayers'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {m.phone ? (
                        <a
                          href={`tel:${m.phone}`}
                          className="text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{m.phone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenReassignManager(m)}
                        title="Reassign to another Hostel"
                        className="p-1.5 hover:bg-slate-100 text-indigo-700 rounded-lg cursor-pointer transition-colors"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenEditManager(m)}
                        title="Edit Attendant & Password"
                        className="p-1.5 hover:bg-slate-100 text-emerald-700 rounded-lg cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteManager(m)}
                        title="Remove Staff"
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODAL: DELETE ATTENDANT CONFIRMATION */}
      {deletingManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove Attendant Staff</h3>
                <p className="text-xs text-slate-500">Revoke attendant login credentials</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
              <div><strong className="text-slate-900">Name:</strong> {deletingManager.name}</div>
              <div><strong className="text-slate-900">Username:</strong> <span className="font-mono text-slate-800">@{deletingManager.username}</span></div>
              <div><strong className="text-slate-900">Assigned Hostel:</strong> {deletingManager.hostel_name}</div>
              <div><strong className="text-slate-900">Duty Shift:</strong> {deletingManager.shift || 'All Prayers'}</div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to remove attendant staff <strong>"{deletingManager.name}"</strong>? All active login sessions will be immediately terminated.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeletingManager(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteManager}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
              >
                Yes, Remove Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: QUICK REASSIGN ATTENDANT */}
      {reassigningManager && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <ArrowRightLeft className="w-5 h-5" />
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Reassign Attendant: {reassigningManager.name}
                </h3>
              </div>
              <button
                onClick={() => setReassigningManager(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={executeReassignManager} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">New Hostel Block Assignment</label>
                <select
                  value={reassignTargetHostelId}
                  onChange={(e) => setReassignTargetHostelId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} {h.id === reassigningManager.hostel_id ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReassigningManager(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reassigning}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {reassigning ? 'Reassigning...' : 'Save New Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: DELETE HOSTEL CONFIRMATION */}
      {deletingHostel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove Hostel Block</h3>
                <p className="text-xs text-slate-500">Confirm hostel block removal</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to remove hostel block <strong>"{deletingHostel.name}"</strong>? This block currently has 0 active students.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeletingHostel(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteHostel}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
              >
                Yes, Remove Hostel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: HOSTEL ROSTER VIEW */}
      {rosterHostel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>Hostel Block Roster: {rosterHostel.name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Warden: {rosterHostel.warden_name || 'Unassigned'} · Capacity: {rosterHostel.capacity || 100} beds
                </p>
              </div>
              <button
                onClick={() => setRosterHostel(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingRoster ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading roster details...</div>
            ) : rosterData ? (
              <div className="overflow-y-auto space-y-4 flex-1 pr-1 text-xs">
                {/* Attendants assigned */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-800 uppercase tracking-wide block mb-1">
                    Appointed Attendants ({rosterData.managers.length})
                  </span>
                  {rosterData.managers.length === 0 ? (
                    <span className="text-slate-400 text-xs">No attendant staff assigned.</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {rosterData.managers.map((m: any) => (
                        <span
                          key={m.id}
                          className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 font-medium"
                        >
                          {m.name} (@{m.username}) - {m.shift || 'All Prayers'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enrolled Students */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 uppercase tracking-wide">
                      Enrolled Students ({rosterData.students.length})
                    </span>
                    <input
                      type="text"
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      placeholder="Filter student or room..."
                      className="px-2.5 py-1 border border-slate-300 rounded text-xs"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2">Roll No</th>
                          <th className="p-2">Student Name</th>
                          <th className="p-2">Class</th>
                          <th className="p-2">Room / Bed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rosterData.students
                          .filter(
                            (s: any) =>
                              s.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
                              s.roll_no.includes(rosterSearch) ||
                              (s.room_no && s.room_no.toLowerCase().includes(rosterSearch.toLowerCase()))
                          )
                          .map((s: any) => (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="p-2 font-mono font-bold text-slate-900">{s.roll_no}</td>
                              <td className="p-2 font-medium">{s.name}</td>
                              <td className="p-2 text-slate-600">{s.class_name}</td>
                              <td className="p-2 font-mono text-emerald-800">{s.room_no || 'Unassigned'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setRosterHostel(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL: TRANSFER STUDENTS TO ANOTHER HOSTEL */}
      {transferSourceHostel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-600" />
              <span>Transfer Students Before Deletion</span>
            </h3>

            <p className="text-xs text-slate-600">
              Hostel <span className="font-bold text-slate-900">{transferSourceHostel.name}</span> currently houses{' '}
              <span className="font-bold text-emerald-700">{transferSourceHostel.active_students_count} active students</span>.
              To delete this block or rehouse students, select a destination hostel:
            </p>

            <form onSubmit={handleExecuteTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Transfer Destination Hostel</label>
                <select
                  required
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">-- Choose Target Hostel Block --</option>
                  {hostels
                    .filter((h) => h.id !== transferSourceHostel.id)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} (Capacity: {h.active_students_count || 0}/{h.capacity || 100})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransferSourceHostel(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || !transferTargetId}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {transferring ? 'Transferring...' : 'Transfer All Students Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. MODAL: CREATE / EDIT HOSTEL */}
      {showHostelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <span>{editingHostel ? 'Edit Hostel Block' : 'Add New Hostel Block'}</span>
            </h3>

            <form onSubmit={handleSaveHostel} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Hostel Block Name *</label>
                <input
                  type="text"
                  required
                  value={hostelName}
                  onChange={(e) => setHostelName(e.target.value)}
                  placeholder="e.g. Dar-ul-Iqama Block A / Abu Bakr Hall"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Max Bed Capacity</label>
                  <input
                    type="number"
                    min={1}
                    value={hostelCapacity}
                    onChange={(e) => setHostelCapacity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={hostelPhone}
                    onChange={(e) => setHostelPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Head Warden In-charge</label>
                <input
                  type="text"
                  value={hostelWarden}
                  onChange={(e) => setHostelWarden(e.target.value)}
                  placeholder="e.g. Maulana Muhammad Tariq"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={hostelDesc}
                  onChange={(e) => setHostelDesc(e.target.value)}
                  placeholder="Location notes, residential floor distribution..."
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHostelModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow-sm cursor-pointer"
                >
                  {editingHostel ? 'Save Changes' : 'Create Hostel Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. MODAL: CREATE / EDIT ATTENDANT STAFF */}
      {showManagerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>{editingManager ? `Edit Attendant: ${editingManager.name}` : 'Appoint Attendant Staff'}</span>
            </h3>

            <form onSubmit={handleSaveManager} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Attendant Full Name *</label>
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Qari Abdul Rehman"
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {!editingManager && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Login Username *</label>
                  <input
                    type="text"
                    required
                    value={managerUsername}
                    onChange={(e) => setManagerUsername(e.target.value)}
                    placeholder="e.g. rehman.hostela"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold">
                    {editingManager ? 'Reset Password (optional)' : 'Login Password *'}
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <input
                  type="text"
                  required={!editingManager}
                  value={managerPassword}
                  onChange={(e) => setManagerPassword(e.target.value)}
                  placeholder={editingManager ? 'Leave blank to keep unchanged' : 'Min 6 characters'}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assigned Hostel Block *</label>
                <select
                  required
                  value={managerHostelId || ''}
                  onChange={(e) => setManagerHostelId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Duty Shift</label>
                  <select
                    value={managerShift}
                    onChange={(e) => setManagerShift(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="All Prayers">All 5 Daily Prayers</option>
                    <option value="Fajr & Isha">Fajr & Isha Only</option>
                    <option value="Zuhr, Asr, Maghrib">Day Shift (Zuhr-Maghrib)</option>
                    <option value="Night Supervisor">Night Supervisor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={managerPhone}
                    onChange={(e) => setManagerPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {editingManager && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Status</label>
                  <select
                    value={managerStatus}
                    onChange={(e) => setManagerStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive / On Leave</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowManagerModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow-sm cursor-pointer"
                >
                  {editingManager ? 'Save Changes' : 'Appoint Attendant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
