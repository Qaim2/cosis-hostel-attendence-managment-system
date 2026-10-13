import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import { BackupItem } from '../types.js';
import {
  Database,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Clock,
  Shield,
  FileCheck,
} from 'lucide-react';

export const BackupRestoreView: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [lastBackup, setLastBackup] = useState<string>('Loading...');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ backups: BackupItem[]; lastBackup: string }>('/api/backup/list');
      setBackups(data.backups);
      setLastBackup(data.lastBackup);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed listing backups' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await apiRequest<{ success: boolean; filename: string; lastBackup: string; message: string }>(
        '/api/backup/create',
        { method: 'POST' }
      );
      setFeedback({ type: 'success', message: res.message });
      setLastBackup(res.lastBackup);
      fetchBackups();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Backup creation failed' });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!confirm(`CRITICAL: Restoring from ${filename} will replace current database tables with this backup snapshot. Continue?`)) {
      return;
    }

    setRestoring(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/backup/restore', {
        method: 'POST',
        body: JSON.stringify({ filename }),
      });
      setFeedback({ type: 'success', message: res.message });
      fetchBackups();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Database restore failed' });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <span>SQLite Database Backup & Disaster Recovery</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            100% offline, local SQLite database snapshot management and point-in-time recovery.
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs transition-colors disabled:opacity-50"
        >
          <HardDrive className="w-4 h-4" />
          <span>{creating ? 'Creating Snapshot...' : 'Create Backup Snapshot'}</span>
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

      {/* STATUS BANNER (Section 35) */}
      <div className="bg-slate-900 text-white rounded-lg p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-700/60 flex items-center justify-center text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Last Database Backup
            </div>
            <div className="text-base font-bold font-mono text-emerald-400">
              {lastBackup}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-300 font-mono">
          Database: <span className="text-white font-bold">hostel_namaz.db</span> (SQLite3 WAL)
        </div>
      </div>

      {/* BACKUPS LIST */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Available Database Backups ({backups.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Filename</th>
                <th className="py-2.5 px-3">Created Date & Time</th>
                <th className="py-2.5 px-3">File Size</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 font-sans">
                    Scanning backup snapshots...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 font-sans">
                    No backups created yet. Click "Create Backup Snapshot" above.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{b.filename}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-sans">{b.createdAt}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-sans">
                      {(b.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2 font-sans">
                      <a
                        href={`/api/backup/download/${b.filename}`}
                        download
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-slate-900 border border-slate-300 rounded hover:bg-slate-100 font-semibold text-[11px]"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                      <button
                        onClick={() => handleRestore(b.filename)}
                        disabled={restoring}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-700 hover:text-rose-900 border border-rose-200 rounded hover:bg-rose-50 font-semibold text-[11px] cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
