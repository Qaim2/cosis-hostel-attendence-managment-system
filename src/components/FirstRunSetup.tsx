import React, { useState } from 'react';
import { apiRequest } from '../api.js';
import { ShieldCheck, UserPlus, AlertCircle, Sparkles } from 'lucide-react';

interface FirstRunSetupProps {
  onSetupComplete: () => void;
}

export const FirstRunSetup: React.FC<FirstRunSetupProps> = ({ onSetupComplete }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [seedDemoData, setSeedDemoData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/api/setup', {
        method: 'POST',
        body: JSON.stringify({
          name,
          username,
          password,
          confirmPassword,
          seedDemoData,
        }),
      });
      onSetupComplete();
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl">
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-600 rounded-lg mx-auto flex items-center justify-center text-white shadow-lg mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            HOSTEL NAMAZ ATTENDANCE SYSTEM
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Initial System Setup · Create Super Admin
          </p>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maulana Muhammad Tariq"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-3.5 rounded-lg flex items-start gap-3">
            <input
              type="checkbox"
              id="seedDemo"
              checked={seedDemoData}
              onChange={(e) => setSeedDemoData(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="seedDemo" className="text-xs text-slate-300 cursor-pointer">
              <span className="font-semibold text-emerald-400 block mb-0.5 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Initialize Acceptance Scenario Data
              </span>
              Pre-populates 2 Hostels (Hostel A & Hostel B), 10 Classes, 300 Students, Managers (Muhammad Ali & Ahmed Raza), Leaves, and Prayers for immediate acceptance testing.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition-colors shadow-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Initializing System...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>CREATE ADMIN & LAUNCH</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
