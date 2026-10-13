import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import { AdminUser, Hostel, SiteSettings, User } from '../types.js';
import { SiteLogo } from './SiteLogo.js';
import { GoogleSheetsSyncView } from './GoogleSheetsSyncView.js';
import {
  Settings,
  Shield,
  ShieldPlus,
  Building2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  Sliders,
  Sparkles,
  Users,
  UserPlus,
  KeyRound,
  FileSpreadsheet,
  Lock,
  Building,
  GraduationCap,
} from 'lucide-react';

interface ManagerUser {
  id: number;
  name: string;
  username: string;
  role: string;
  hostel_id: number;
  hostel_name?: string;
  status: string;
  created_at?: string;
}

interface SiteSettingsViewProps {
  currentUser: User;
  onSettingsUpdated: (newSettings: SiteSettings) => void;
}

export const SiteSettingsView: React.FC<SiteSettingsViewProps> = ({
  currentUser,
  onSettingsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'sheets' | 'hostels' | 'preferences'>('users');

  // Dashboard Customization State
  const [dashboardAnnouncement, setDashboardAnnouncement] = useState('');
  const [dashboardAnnouncementType, setDashboardAnnouncementType] = useState<'info' | 'warning' | 'reminder'>('info');
  const [showStats, setShowStats] = useState(true);
  const [showPrayers, setShowPrayers] = useState(true);
  const [showHostels, setShowHostels] = useState(true);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showAudit, setShowAudit] = useState(true);
  const [defaultMode, setDefaultMode] = useState<'MARK_ABSENT' | 'MARK_PRESENT'>('MARK_ABSENT');
  const [theme, setTheme] = useState<'emerald' | 'teal' | 'navy' | 'amber'>('emerald');
  const [savingSettings, setSavingSettings] = useState(false);

  // Admin Management State
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminConfirmPassword, setNewAdminConfirmPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editAdminStatus, setEditAdminStatus] = useState('active');
  const [savingAdminEdit, setSavingAdminEdit] = useState(false);

  // Manager Management State
  const [managers, setManagers] = useState<ManagerUser[]>([]);
  const [showCreateManagerModal, setShowCreateManagerModal] = useState(false);
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerUsername, setNewManagerUsername] = useState('');
  const [newManagerPassword, setNewManagerPassword] = useState('');
  const [newManagerHostelId, setNewManagerHostelId] = useState<number | ''>('');
  const [creatingManager, setCreatingManager] = useState(false);

  const [editingManager, setEditingManager] = useState<ManagerUser | null>(null);
  const [editManagerName, setEditManagerName] = useState('');
  const [editManagerPassword, setEditManagerPassword] = useState('');
  const [editManagerHostelId, setEditManagerHostelId] = useState<number | ''>('');
  const [editManagerStatus, setEditManagerStatus] = useState('active');
  const [savingManagerEdit, setSavingManagerEdit] = useState(false);

  // Hostels State
  const [hostels, setHostels] = useState<Hostel[]>([]);

  // Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    try {
      const [settingsData, adminsData, managersData, hostelsData] = await Promise.all([
        apiRequest<SiteSettings>('/api/settings'),
        apiRequest<AdminUser[]>('/api/admins'),
        apiRequest<ManagerUser[]>('/api/managers'),
        apiRequest<Hostel[]>('/api/hostels'),
      ]);

      if (settingsData.dashboard_announcement !== undefined) setDashboardAnnouncement(settingsData.dashboard_announcement);
      if (settingsData.dashboard_announcement_type) setDashboardAnnouncementType(settingsData.dashboard_announcement_type);
      if (settingsData.dashboard_show_stats !== undefined) setShowStats(settingsData.dashboard_show_stats !== 'false');
      if (settingsData.dashboard_show_prayers !== undefined) setShowPrayers(settingsData.dashboard_show_prayers !== 'false');
      if (settingsData.dashboard_show_hostels !== undefined) setShowHostels(settingsData.dashboard_show_hostels !== 'false');
      if (settingsData.dashboard_show_quick_actions !== undefined) setShowQuickActions(settingsData.dashboard_show_quick_actions !== 'false');
      if (settingsData.dashboard_show_audit !== undefined) setShowAudit(settingsData.dashboard_show_audit !== 'false');
      if (settingsData.default_attendance_mode) setDefaultMode(settingsData.default_attendance_mode);
      if (settingsData.dashboard_theme) setTheme(settingsData.dashboard_theme);

      setAdmins(adminsData);
      setManagers(managersData);
      setHostels(hostelsData);
      if (hostelsData.length > 0 && !newManagerHostelId) {
        setNewManagerHostelId(hostelsData[0].id);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed loading system settings' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Preferences
  const handleSavePreferences = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    setFeedback(null);
    try {
      const payload: Partial<SiteSettings> = {
        dashboard_announcement: dashboardAnnouncement.trim(),
        dashboard_announcement_type: dashboardAnnouncementType,
        dashboard_show_stats: showStats ? 'true' : 'false',
        dashboard_show_prayers: showPrayers ? 'true' : 'false',
        dashboard_show_hostels: showHostels ? 'true' : 'false',
        dashboard_show_quick_actions: showQuickActions ? 'true' : 'false',
        dashboard_show_audit: showAudit ? 'true' : 'false',
        default_attendance_mode: defaultMode,
        dashboard_theme: theme,
      };

      const res = await apiRequest<{ success: boolean; message: string }>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setFeedback({ type: 'success', message: res.message });
      onSettingsUpdated(payload as SiteSettings);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed saving settings' });
    } finally {
      setSavingSettings(false);
    }
  };

  // 1. Create Admin
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminUsername || !newAdminPassword) {
      alert('Please fill all required fields.');
      return;
    }
    if (newAdminPassword !== newAdminConfirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setCreatingAdmin(true);
    setFeedback(null);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/admins', {
        method: 'POST',
        body: JSON.stringify({
          name: newAdminName,
          username: newAdminUsername,
          password: newAdminPassword,
          confirmPassword: newAdminConfirmPassword,
        }),
      });

      setFeedback({ type: 'success', message: res.message });
      setShowCreateAdminModal(false);
      setNewAdminName('');
      setNewAdminUsername('');
      setNewAdminPassword('');
      setNewAdminConfirmPassword('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create admin' });
    } finally {
      setCreatingAdmin(false);
    }
  };

  // 2. Edit Admin
  const handleOpenEditAdmin = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditAdminName(admin.name);
    setEditAdminPassword('');
    setEditAdminStatus(admin.status);
  };

  const handleSaveAdminEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setSavingAdminEdit(true);
    setFeedback(null);
    try {
      const body: any = {
        name: editAdminName.trim(),
        status: editAdminStatus,
      };
      if (editAdminPassword.trim()) {
        body.password = editAdminPassword.trim();
      }

      const res = await apiRequest<{ success: boolean; message: string }>(`/api/admins/${editingAdmin.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      setFeedback({ type: 'success', message: res.message });
      setEditingAdmin(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update admin' });
    } finally {
      setSavingAdminEdit(false);
    }
  };

  // 3. Delete Admin
  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (admin.id === currentUser.id) {
      alert('Security constraint: You cannot delete your currently logged-in Super Admin account.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to permanently remove Super Admin "${admin.name}" (${admin.username})?\n\nThis will revoke all active login sessions immediately.`
      )
    ) {
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/admins/${admin.id}`, {
        method: 'DELETE',
      });
      setFeedback({ type: 'success', message: res.message });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete admin' });
    }
  };

  // 4. Create Manager
  const handleCreateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManagerName || !newManagerUsername || !newManagerPassword || !newManagerHostelId) {
      alert('Please fill all required fields and select an assigned hostel block.');
      return;
    }

    setCreatingManager(true);
    setFeedback(null);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/managers', {
        method: 'POST',
        body: JSON.stringify({
          name: newManagerName.trim(),
          username: newManagerUsername.trim(),
          password: newManagerPassword,
          hostel_id: Number(newManagerHostelId),
        }),
      });

      setFeedback({ type: 'success', message: res.message });
      setShowCreateManagerModal(false);
      setNewManagerName('');
      setNewManagerUsername('');
      setNewManagerPassword('');
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create manager' });
    } finally {
      setCreatingManager(false);
    }
  };

  // 5. Edit Manager
  const handleOpenEditManager = (mgr: ManagerUser) => {
    setEditingManager(mgr);
    setEditManagerName(mgr.name);
    setEditManagerPassword('');
    setEditManagerHostelId(mgr.hostel_id);
    setEditManagerStatus(mgr.status);
  };

  const handleSaveManagerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingManager) return;

    setSavingManagerEdit(true);
    setFeedback(null);
    try {
      const body: any = {
        name: editManagerName.trim(),
        hostel_id: Number(editManagerHostelId),
        status: editManagerStatus,
      };
      if (editManagerPassword.trim()) {
        body.password = editManagerPassword.trim();
      }

      const res = await apiRequest<{ success: boolean; message: string }>(`/api/managers/${editingManager.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      setFeedback({ type: 'success', message: res.message });
      setEditingManager(null);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update manager' });
    } finally {
      setSavingManagerEdit(false);
    }
  };

  // 6. Delete Manager
  const handleDeleteManager = async (mgr: ManagerUser) => {
    if (
      !confirm(
        `Are you sure you want to permanently remove Hostel Manager "${mgr.name}" (${mgr.username})?\n\nThis will revoke their access to hostel attendance.`
      )
    ) {
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/managers/${mgr.id}`, {
        method: 'DELETE',
      });
      setFeedback({ type: 'success', message: res.message });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove manager' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Official Institutional Identity Badge (Permanent & Locked) */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <SiteLogo size="xl" className="shadow-lg border-2 border-emerald-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                <Lock className="w-3 h-3 text-emerald-400" />
                OFFICIAL INSTITUTIONAL BRANDING · PERMANENT
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              COSIS Hostels Attendence Management System
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800 shrink-0">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Super Admin Access Granted</span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="font-medium whitespace-pre-line">{feedback.message}</div>
        </div>
      )}

      {/* 2. Settings Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Admins & Hostel Managers ({admins.length + managers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'sheets'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Google Sheets Sync</span>
        </button>

        <button
          onClick={() => setActiveTab('hostels')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'hostels'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Hostels & Blocks ({hostels.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Dashboard Preferences</span>
        </button>
      </div>

      {/* TAB 1: ADMINS & MANAGERS */}
      {activeTab === 'users' && (
        <div className="space-y-8">
          {/* SECTION A: SUPER ADMINS */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Super Administrators ({admins.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Super administrators have full administrative authority across all hostels, classes, and logs.
                </p>
              </div>

              <button
                onClick={() => setShowCreateAdminModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                <ShieldPlus className="w-3.5 h-3.5" />
                <span>Add Super Admin</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {admins.map((admin) => (
                <div key={admin.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 font-bold text-xs">
                      {admin.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{admin.name}</span>
                        <span className="text-[11px] font-mono text-slate-500">@{admin.username}</span>
                        {admin.id === currentUser.id && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            YOU
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            admin.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {admin.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        Role: Super Admin · Created: {admin.created_at || 'System initial'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditAdmin(admin)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Admin"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {admin.id !== currentUser.id && (
                      <button
                        onClick={() => handleDeleteAdmin(admin)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Admin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION B: HOSTEL MANAGERS */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600" />
                  <span>Hostel Managers & Attendants ({managers.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hostel managers take daily prayer attendance and report leaves for their assigned hostel block.
                </p>
              </div>

              <button
                onClick={() => setShowCreateManagerModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Hostel Manager</span>
              </button>
            </div>

            {managers.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No hostel managers created yet. Click "Add Hostel Manager" to assign attendants to hostel blocks.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {managers.map((mgr) => (
                  <div key={mgr.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 font-bold text-xs">
                        {mgr.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{mgr.name}</span>
                          <span className="text-[11px] font-mono text-slate-500">@{mgr.username}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            {mgr.hostel_name || 'Assigned Block'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              mgr.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {mgr.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          Role: Hostel Manager · Assigned Block ID: {mgr.hostel_id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditManager(mgr)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Manager"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteManager(mgr)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Manager"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE SHEETS SYNC */}
      {activeTab === 'sheets' && (
        <GoogleSheetsSyncView currentUser={currentUser} />
      )}

      {/* TAB 3: HOSTELS & CLASSES */}
      {activeTab === 'hostels' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Hostel Blocks & Capacities</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of residential hostel blocks configured in COSIS.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hostels.map((h) => (
              <div key={h.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{h.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-600">{h.description || 'Residential Block'}</p>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Enrolled: {h.active_students_count || 0} students</span>
                  <span>Classes: {h.active_classes_count || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DASHBOARD PREFERENCES */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSavePreferences} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Dashboard Display Toggles</span>
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Institution Notice / Daily Announcement (Optional)
              </label>
              <textarea
                rows={3}
                value={dashboardAnnouncement}
                onChange={(e) => setDashboardAnnouncement(e.target.value)}
                placeholder="Important announcements, exam schedules, or spiritual reminders for hostel residents..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Default Attendance Mode
              </label>
              <select
                value={defaultMode}
                onChange={(e) => setDefaultMode(e.target.value as any)}
                className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="MARK_ABSENT">Mark Absent by Exception (Fastest)</option>
                <option value="MARK_PRESENT">Mark Present Explicitly</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStats}
                  onChange={(e) => setShowStats(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-700">Display Metric Summary Cards</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrayers}
                  onChange={(e) => setShowPrayers(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-700">Display 5 Daily Prayers Live Grid</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHostels}
                  onChange={(e) => setShowHostels(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-700">Display Hostel Blocks Grid</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAudit}
                  onChange={(e) => setShowAudit(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-700">Display Recent Audit Trail Preview</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      )}

      {/* MODAL 1: CREATE SUPER ADMIN */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldPlus className="w-5 h-5 text-emerald-600" />
                <span>Create Super Administrator</span>
              </h3>
              <button
                onClick={() => setShowCreateAdminModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="e.g. Maulana Muhammad Tariq"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  placeholder="e.g. tariq.admin"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={newAdminConfirmPassword}
                  onChange={(e) => setNewAdminConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {creatingAdmin ? 'Creating...' : 'Create Super Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SUPER ADMIN */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                <span>Edit Super Admin: {editingAdmin.name}</span>
              </h3>
              <button
                onClick={() => setEditingAdmin(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdminEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editAdminName}
                  onChange={(e) => setEditAdminName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reset Password (Leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  value={editAdminPassword}
                  onChange={(e) => setEditAdminPassword(e.target.value)}
                  placeholder="New password (optional)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={editAdminStatus}
                  onChange={(e) => setEditAdminStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdminEdit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingAdminEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE HOSTEL MANAGER */}
      {showCreateManagerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <span>Add Hostel Manager / Attendant</span>
              </h3>
              <button
                onClick={() => setShowCreateManagerModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManager} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Manager Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newManagerName}
                  onChange={(e) => setNewManagerName(e.target.value)}
                  placeholder="e.g. Qari Abdul Rehman"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={newManagerUsername}
                  onChange={(e) => setNewManagerUsername(e.target.value)}
                  placeholder="e.g. rehman.manager"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newManagerPassword}
                  onChange={(e) => setNewManagerPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Hostel Block
                </label>
                <select
                  required
                  value={newManagerHostelId}
                  onChange={(e) => setNewManagerHostelId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateManagerModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingManager}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {creatingManager ? 'Creating...' : 'Create Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT HOSTEL MANAGER */}
      {editingManager && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                <span>Edit Manager: {editingManager.name}</span>
              </h3>
              <button
                onClick={() => setEditingManager(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManagerEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Manager Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editManagerName}
                  onChange={(e) => setEditManagerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Hostel Block
                </label>
                <select
                  value={editManagerHostelId}
                  onChange={(e) => setEditManagerHostelId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reset Password (Leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  value={editManagerPassword}
                  onChange={(e) => setEditManagerPassword(e.target.value)}
                  placeholder="New password (optional)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={editManagerStatus}
                  onChange={(e) => setEditManagerStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingManager(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingManagerEdit}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingManagerEdit ? 'Saving...' : 'Save Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
