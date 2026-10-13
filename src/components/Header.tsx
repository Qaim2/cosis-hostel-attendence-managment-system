import React from 'react';
import { User, SiteSettings } from '../types.js';
import { SiteLogo } from './SiteLogo.js';
import {
  CalendarCheck,
  FileSpreadsheet,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  Database,
  CheckCircle2,
  LogOut,
  UserCheck,
  LayoutDashboard,
  Settings,
} from 'lucide-react';

interface HeaderProps {
  user: User;
  currentTab: string;
  siteName?: string;
  siteSettings?: SiteSettings;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentTab,
  siteName = 'COSIS Hostels Attendence Management System',
  siteSettings,
  onTabChange,
  onLogout,
}) => {
  const isSuperAdmin = user.role === 'super_admin';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Take Attendance', icon: CalendarCheck },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'google-sheets', label: 'Google Sheets', icon: FileSpreadsheet },
    { id: 'leaves', label: 'Leaves', icon: CalendarDays },
    ...(isSuperAdmin
      ? [
          { id: 'admin-attendance', label: 'Attendance Records', icon: UserCheck },
          { id: 'promotions', label: 'Promotions', icon: GraduationCap },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'classes', label: 'Classes', icon: BookOpen },
          { id: 'hostels', label: 'Hostels & Staff', icon: Building2 },
          { id: 'settings', label: 'Settings & Admins', icon: Settings },
          { id: 'audit', label: 'Audit Logs', icon: ShieldCheck },
          { id: 'backup', label: 'Backup & Restore', icon: Database },
          { id: 'tests', label: 'Verification Suite', icon: CheckCircle2 },
        ]
      : []),
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Wordmark / Brand title & Custom Logo */}
          <div className="flex items-center gap-3">
            <SiteLogo settings={siteSettings || { site_name: siteName }} size="md" />
            <button
              onClick={() => onTabChange('attendance')}
              className="text-left group cursor-pointer focus:outline-none"
            >
              <span className="text-base sm:text-lg font-semibold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                {siteName}
              </span>
            </button>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 overflow-x-auto py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white leading-tight">
                {user.name}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {isSuperAdmin ? 'Super Admin' : `Manager · ${user.hostel_name || 'Assigned Hostel'}`}
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Mobile / Narrow Screen Horizontal Sub-Nav */}
        <div className="xl:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800 text-xs no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
