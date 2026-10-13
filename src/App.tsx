import React, { useState, useEffect } from 'react';
import { apiRequest, getAuthToken, clearAuthToken } from './api.js';
import { User } from './types.js';
import { Header } from './components/Header.js';
import { FirstRunSetup } from './components/FirstRunSetup.js';
import { LoginView } from './components/LoginView.js';
import { DashboardView } from './components/DashboardView.js';
import { AttendanceView } from './components/AttendanceView.js';
import { ReportsView } from './components/ReportsView.js';
import { LeaveManagerView } from './components/LeaveManagerView.js';
import { AdminAttendanceManager } from './components/AdminAttendanceManager.js';
import { StudentPromotionView } from './components/StudentPromotionView.js';
import { StudentManagerView } from './components/StudentManagerView.js';
import { ClassManagerView } from './components/ClassManagerView.js';
import { HostelManagerView } from './components/HostelManagerView.js';
import { AuditLogsView } from './components/AuditLogsView.js';
import { BackupRestoreView } from './components/BackupRestoreView.js';
import { TestSuiteView } from './components/TestSuiteView.js';
import { SiteSettingsView } from './components/SiteSettingsView.js';
import { GoogleSheetsSyncView } from './components/GoogleSheetsSyncView.js';
import { SiteSettings } from './types.js';

export default function App() {
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('attendance');
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    site_name: 'COSIS Hostels Attendence Management System',
    site_subtitle: '',
  });
  const [loading, setLoading] = useState(true);

  // Check setup status and existing token
  const checkInitialState = async () => {
    setLoading(true);
    try {
      const [setupRes, settingsRes] = await Promise.all([
        apiRequest<{ setupRequired: boolean; siteName?: string; siteSubtitle?: string }>('/api/setup-status'),
        apiRequest<SiteSettings>('/api/settings').catch(() => null),
      ]);

      setSetupRequired(setupRes.setupRequired);

      if (settingsRes?.site_name) {
        setSiteSettings(settingsRes);
        document.title = settingsRes.site_name;
      } else if (setupRes.siteName) {
        setSiteSettings({
          site_name: setupRes.siteName,
          site_subtitle: '',
        });
        document.title = setupRes.siteName;
      }

      if (!setupRes.setupRequired) {
        const token = getAuthToken();
        if (token) {
          try {
            const meRes = await apiRequest<{ user: User }>('/api/auth/me');
            setCurrentUser(meRes.user);
          } catch (e) {
            clearAuthToken();
            setCurrentUser(null);
          }
        }
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkInitialState();
  }, []);

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      clearAuthToken();
      setCurrentUser(null);
      setCurrentTab('attendance');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs uppercase font-mono tracking-widest text-slate-400">
          HOSTEL NAMAZ ATTENDANCE SYSTEM · STARTING...
        </p>
      </div>
    );
  }

  // 1. FIRST-RUN SETUP (Section 30)
  if (setupRequired) {
    return (
      <FirstRunSetup
        onSetupComplete={() => {
          checkInitialState();
        }}
      />
    );
  }

  // 2. LOGIN SCREEN
  if (!currentUser) {
    return (
      <LoginView
        siteName={siteSettings.site_name}
        siteSubtitle={siteSettings.site_subtitle}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setCurrentTab('attendance');
        }}
      />
    );
  }

  // 3. MAIN APPLICATION INTERFACE
  const isSuperAdmin = currentUser.role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 flex flex-col font-sans antialiased">
      <Header
        user={currentUser}
        currentTab={currentTab}
        siteName={siteSettings.site_name}
        onTabChange={(tab) => setCurrentTab(tab)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'attendance' && (
          <AttendanceView
            currentUser={currentUser}
            onNavigateToReports={() => setCurrentTab('reports')}
          />
        )}

        {currentTab === 'reports' && <ReportsView />}

        {currentTab === 'google-sheets' && <GoogleSheetsSyncView currentUser={currentUser} />}

        {currentTab === 'leaves' && <LeaveManagerView currentUser={currentUser} />}

        {/* Super Admin Restricted Tabs */}
        {isSuperAdmin && (
          <>
            {currentTab === 'admin-attendance' && <AdminAttendanceManager />}
            {currentTab === 'promotions' && <StudentPromotionView />}
            {currentTab === 'students' && <StudentManagerView />}
            {currentTab === 'classes' && <ClassManagerView />}
            {currentTab === 'hostels' && <HostelManagerView />}
            {currentTab === 'settings' && (
              <SiteSettingsView
                currentUser={currentUser}
                onSettingsUpdated={(updated) => {
                  setSiteSettings((prev) => ({ ...prev, ...updated }));
                  document.title = updated.site_name;
                }}
              />
            )}
            {currentTab === 'audit' && <AuditLogsView />}
            {currentTab === 'backup' && <BackupRestoreView />}
            {currentTab === 'tests' && <TestSuiteView />}
          </>
        )}
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs py-4 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{siteSettings.site_name} · Local Offline Network Mode</span>
          <span className="font-mono text-slate-500">
            LAN: 0.0.0.0:3000 · SQLite3 WAL Database
          </span>
        </div>
      </footer>
    </div>
  );
}
