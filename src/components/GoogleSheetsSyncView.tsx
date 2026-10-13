import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import { GoogleSheetTarget, User } from '../types.js';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../services/googleAuth.js';
import {
  createGoogleSpreadsheet,
  verifySpreadsheetAccess,
  appendRows,
} from '../services/googleSheets.js';
import { User as FirebaseUser } from 'firebase/auth';
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Calendar,
  Cloud,
  Layers,
  ArrowRight,
  Shield,
  FileCheck,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from 'lucide-react';

interface GoogleSheetsSyncViewProps {
  currentUser: User;
}

export const GoogleSheetsSyncView: React.FC<GoogleSheetsSyncViewProps> = ({ currentUser }) => {
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [targets, setTargets] = useState<GoogleSheetTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  // Add / Connect Sheet Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'create_new' | 'connect_existing'>('create_new');
  const [sheetCustomName, setSheetCustomName] = useState('');
  const [sheetUrlOrId, setSheetUrlOrId] = useState('');
  const [sheetTabName, setSheetTabName] = useState('Attendance');
  const [sheetAutoSync, setSheetAutoSync] = useState(true);
  const [processingAdd, setProcessingAdd] = useState(false);

  // Syncing State
  const [syncingTargetId, setSyncingTargetId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [selectedRange, setSelectedRange] = useState<'today' | 'week' | 'all'>('today');

  // Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Check auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );

    loadTargets();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadTargets = async () => {
    setLoadingTargets(true);
    try {
      const data = await apiRequest<GoogleSheetTarget[]>('/api/sheets-targets');
      setTargets(data);
    } catch (err: any) {
      console.error('Failed to load Google Sheets targets:', err);
    } finally {
      setLoadingTargets(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setFeedback(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        setFeedback({
          type: 'success',
          message: `Connected Google Account: ${result.user.email}`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to sign in with Google.',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
      setFeedback({ type: 'success', message: 'Signed out of Google.' });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleOpenAddModal = (mode: 'create_new' | 'connect_existing') => {
    setAddMode(mode);
    setSheetCustomName(mode === 'create_new' ? 'Main Attendance Sheet' : '');
    setSheetUrlOrId('');
    setSheetTabName('Attendance');
    setSheetAutoSync(true);
    setShowAddModal(true);
  };

  const handleSaveSheetTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUser || !googleToken) {
      alert('Please connect your Google Account first.');
      return;
    }

    setProcessingAdd(true);
    setFeedback(null);

    try {
      let finalSpreadsheetId = sheetUrlOrId.trim();
      let targetName = sheetCustomName.trim() || 'My Google Sheet';

      if (addMode === 'create_new') {
        // Create new sheet via API
        const newSheet = await createGoogleSpreadsheet(
          targetName ? `COSIS - ${targetName}` : 'COSIS Hostels Attendance Log'
        );
        finalSpreadsheetId = newSheet.spreadsheetId;
      } else {
        // Connect existing: extract and verify
        const urlMatch = finalSpreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (urlMatch && urlMatch[1]) {
          finalSpreadsheetId = urlMatch[1];
        }

        // Verify access to sheet
        await verifySpreadsheetAccess(finalSpreadsheetId);
      }

      // Save target in system database
      const res = await apiRequest<{ success: boolean; target: GoogleSheetTarget; message: string }>(
        '/api/sheets-targets',
        {
          method: 'POST',
          body: JSON.stringify({
            name: targetName,
            spreadsheet_id: finalSpreadsheetId,
            sheet_name: sheetTabName.trim() || 'Attendance',
            auto_sync: sheetAutoSync,
          }),
        }
      );

      setFeedback({ type: 'success', message: res.message });
      setShowAddModal(false);
      loadTargets();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to connect Google Sheet.',
      });
    } finally {
      setProcessingAdd(false);
    }
  };

  const handleDeleteTarget = async (target: GoogleSheetTarget) => {
    if (!confirm(`Are you sure you want to disconnect Google Sheet "${target.name}"? (Your spreadsheet in Google Drive will NOT be deleted).`)) {
      return;
    }

    try {
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/sheets-targets/${target.id}`, {
        method: 'DELETE',
      });
      setFeedback({ type: 'success', message: res.message });
      loadTargets();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to disconnect sheet.' });
    }
  };

  const handleToggleAutoSync = async (target: GoogleSheetTarget) => {
    try {
      const nextVal = !target.auto_sync;
      await apiRequest(`/api/sheets-targets/${target.id}`, {
        method: 'PUT',
        body: JSON.stringify({ auto_sync: nextVal }),
      });
      loadTargets();
    } catch (err: any) {
      console.error(err);
    }
  };

  const syncAttendanceToSheet = async (target: GoogleSheetTarget) => {
    if (!googleUser || !googleToken) {
      alert('Please connect your Google Account first.');
      return;
    }

    setSyncingTargetId(target.id);
    setFeedback(null);

    try {
      let fromDate = '';
      const today = new Date().toISOString().split('T')[0];

      if (selectedRange === 'today') {
        fromDate = today;
      } else if (selectedRange === 'week') {
        const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        fromDate = lastWeek;
      }

      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (selectedRange === 'today') params.append('to_date', today);

      const exportData = await apiRequest<{ header: string[]; rows: (string | number)[][]; totalCount: number }>(
        `/api/attendance/export-rows?${params.toString()}`
      );

      if (exportData.rows.length === 0) {
        setFeedback({
          type: 'error',
          message: `No attendance records found for the selected timeframe (${selectedRange}). Take attendance first!`,
        });
        setSyncingTargetId(null);
        return;
      }

      // Append to Google Sheet
      const result = await appendRows(target.spreadsheet_id, target.sheet_name || 'Attendance', exportData.rows);

      // Record sync in database
      await apiRequest(`/api/sheets-targets/${target.id}/sync-log`, {
        method: 'POST',
        body: JSON.stringify({
          rows_count: exportData.rows.length,
          status: 'success',
        }),
      });

      setFeedback({
        type: 'success',
        message: `Successfully synchronized ${exportData.rows.length} attendance rows to "${target.name}"!`,
      });

      loadTargets();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to sync with Google Sheet.',
      });
    } finally {
      setSyncingTargetId(null);
    }
  };

  const handleSyncAllTargets = async () => {
    if (!googleUser || !googleToken) {
      alert('Please connect your Google Account first.');
      return;
    }

    if (targets.length === 0) {
      alert('No Google Sheets configured. Add or connect a Google Sheet first.');
      return;
    }

    setSyncingAll(true);
    setFeedback(null);

    try {
      let syncedCount = 0;
      for (const t of targets) {
        await syncAttendanceToSheet(t);
        syncedCount++;
      }
      setFeedback({
        type: 'success',
        message: `Synced attendance to ${syncedCount} Google Sheet(s) successfully!`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Sync all failed.',
      });
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Cloud className="w-4 h-4" />
            <span>Google Workspace Cloud Integration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
            <span>Google Sheets Attendance Sync</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenAddModal('create_new')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs shadow-md cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Google Sheet</span>
          </button>

          <button
            onClick={() => handleOpenAddModal('connect_existing')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold rounded-lg text-xs cursor-pointer transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Connect My Google Sheet</span>
          </button>
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

      {/* 2. Google Account Connection Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {googleUser?.photoURL ? (
              <img
                src={googleUser.photoURL}
                alt={googleUser.displayName || 'Google User'}
                className="w-12 h-12 rounded-full border border-slate-300 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">
                  {googleUser ? googleUser.displayName || 'Connected Google User' : 'Google Account Not Connected'}
                </span>
                {googleUser && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> CONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {googleUser ? googleUser.email : 'Sign in with your Google account to enable Google Sheets synchronization.'}
              </p>
            </div>
          </div>

          <div>
            {googleUser ? (
              <button
                onClick={handleGoogleLogout}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-rose-700 hover:bg-rose-50 border border-slate-300 rounded-lg cursor-pointer transition-colors"
              >
                Disconnect Account
              </button>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isSigningIn}
                className="gsi-material-button cursor-pointer shadow-sm hover:shadow transition-shadow"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #dadce0',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#3c4043',
                }}
              >
                <div style={{ width: '18px', height: '18px' }}>
                  <svg viewBox="0 0 48 48" style={{ display: 'block', width: '100%', height: '100%' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                </div>
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Sync Action Bar */}
      <div className="bg-emerald-950 text-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-800 flex items-center justify-center text-emerald-200">
            <RefreshCw className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Synchronize Attendance Records
            </div>
            <div className="text-[11px] text-slate-300">
              Select date timeframe to export and push to all active Google Sheets.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-900/80 border border-slate-700 rounded-lg p-0.5 text-xs font-medium">
            <button
              onClick={() => setSelectedRange('today')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                selectedRange === 'today' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setSelectedRange('week')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                selectedRange === 'week' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setSelectedRange('all')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                selectedRange === 'all' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
              }`}
            >
              All Records
            </button>
          </div>

          <button
            onClick={handleSyncAllTargets}
            disabled={syncingAll || !googleUser || targets.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-md cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
            <span>{syncingAll ? 'Syncing...' : 'Sync to All Google Sheets'}</span>
          </button>
        </div>
      </div>

      {/* 4. Configured Google Sheets List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Configured Google Sheets ({targets.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your personal Google Sheets or add multiple sheets for different hostel blocks or backups.
            </p>
          </div>

          <button
            onClick={() => handleOpenAddModal('connect_existing')}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Another Sheet</span>
          </button>
        </div>

        {targets.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No Google Sheets Connected Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Connect your own Google Sheet or create a brand new one to automatically stream daily hostel prayer attendance logs into Google Spreadsheets.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleOpenAddModal('create_new')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
              >
                Create New Sheet
              </button>
              <button
                onClick={() => handleOpenAddModal('connect_existing')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-300 cursor-pointer"
              >
                Connect Existing Sheet
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {targets.map((target) => {
              const isSyncing = syncingTargetId === target.id;
              const sheetUrl = `https://docs.google.com/spreadsheets/d/${target.spreadsheet_id}/edit`;

              return (
                <div key={target.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{target.name}</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                          Tab: {target.sheet_name || 'Attendance'}
                        </span>
                        {target.auto_sync ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Auto-Sync ON
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Manual Sync Only
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap font-mono">
                        <span>ID: {target.spreadsheet_id.substring(0, 16)}...</span>
                        {target.last_sync_at && (
                          <span className="text-emerald-700 font-medium">
                            Last synced: {target.last_sync_at} ({target.rows_count || 0} rows)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      title="Open spreadsheet in Google Sheets"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>Open in Sheets</span>
                    </a>

                    <button
                      onClick={() => handleToggleAutoSync(target)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      title="Toggle auto-sync on attendance save"
                    >
                      {target.auto_sync ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-600" />
                          <span className="hidden sm:inline">Auto ON</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-slate-400" />
                          <span className="hidden sm:inline">Auto OFF</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => syncAttendanceToSheet(target)}
                      disabled={isSyncing || !googleUser}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteTarget(target)}
                      title="Disconnect sheet"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Add / Connect Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {addMode === 'create_new' ? 'Create New Google Sheet' : 'Connect Existing Google Sheet'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAddMode('create_new')}
                className={`py-1.5 rounded cursor-pointer transition-colors ${
                  addMode === 'create_new' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create New Sheet in Drive
              </button>
              <button
                type="button"
                onClick={() => setAddMode('connect_existing')}
                className={`py-1.5 rounded cursor-pointer transition-colors ${
                  addMode === 'connect_existing' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Connect Existing Sheet
              </button>
            </div>

            <form onSubmit={handleSaveSheetTarget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Sheet Label / Purpose
                </label>
                <input
                  type="text"
                  required
                  value={sheetCustomName}
                  onChange={(e) => setSheetCustomName(e.target.value)}
                  placeholder="e.g. Main Attendance Sheet, Hostel Block A Log"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {addMode === 'connect_existing' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Google Sheet URL or Spreadsheet ID
                  </label>
                  <input
                    type="text"
                    required
                    value={sheetUrlOrId}
                    onChange={(e) => setSheetUrlOrId(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/... or 44-character ID"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Copy the URL from your browser address bar when viewing your Google Sheet.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Sheet / Tab Name
                </label>
                <input
                  type="text"
                  value={sheetTabName}
                  onChange={(e) => setSheetTabName(e.target.value)}
                  placeholder="Attendance"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Default tab inside your spreadsheet where rows will be recorded.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoSyncCheck"
                  checked={sheetAutoSync}
                  onChange={(e) => setSheetAutoSync(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="autoSyncCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Auto-sync attendance sessions to this sheet upon saving
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAdd}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {processingAdd ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{addMode === 'create_new' ? 'Creating...' : 'Connecting...'}</span>
                    </>
                  ) : (
                    <span>{addMode === 'create_new' ? 'Create & Connect' : 'Save Connection'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
