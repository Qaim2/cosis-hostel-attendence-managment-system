import React, { useState } from 'react';
import { apiRequest, setAuthToken } from '../api.js';
import { User, SiteSettings } from '../types.js';
import { SiteLogo } from './SiteLogo.js';
import { LogIn, KeyRound, AlertCircle, Building2, Shield, UserCheck } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  siteName?: string;
  siteSubtitle?: string;
  siteSettings?: SiteSettings;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  siteName = 'COSIS Hostels Attendence Management System',
  siteSubtitle = '',
  siteSettings,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (loginUsername?: string, loginPassword?: string) => {
    const u = loginUsername || username;
    const p = loginPassword || password;

    if (!u || !p) {
      setError('Please provide username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: u, password: p }),
      });

      setAuthToken(data.token);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-6 bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl">
        <div className="text-center flex flex-col items-center">
          <div className="mb-3">
            <SiteLogo settings={siteSettings} size="xl" className="shadow-lg mx-auto" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white uppercase text-center leading-snug">
            {siteName}
          </h2>
          {siteSubtitle ? (
            <p className="mt-1 text-xs text-slate-400">
              {siteSubtitle}
            </p>
          ) : null}
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 px-4 py-3 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition-colors shadow-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>SIGN IN</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Panel */}
        <div className="border-t border-slate-800 pt-5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
            Quick Fast-Switch Demo Accounts
          </p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => {
                setUsername('admin');
                setPassword('admin123');
                handleLogin('admin', 'admin123');
              }}
              className="flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-emerald-400">
                    Super Admin
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">admin / admin123</div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 border border-slate-600 px-1.5 py-0.5 rounded">
                Full Control
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUsername('muhammad.ali');
                setPassword('manager123');
                handleLogin('muhammad.ali', 'manager123');
              }}
              className="flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-blue-400">
                    Muhammad Ali (Hostel A)
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">muhammad.ali / manager123</div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 border border-slate-600 px-1.5 py-0.5 rounded">
                Hostel A
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUsername('ahmed.raza');
                setPassword('manager123');
                handleLogin('ahmed.raza', 'manager123');
              }}
              className="flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-amber-400">
                    Ahmed Raza (Hostel B)
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">ahmed.raza / manager123</div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 border border-slate-600 px-1.5 py-0.5 rounded">
                Hostel B
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
