import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import { User, Prayer, AttendanceSession, SiteSettings, Hostel } from '../types.js';
import { SiteLogo } from './SiteLogo.js';
import {
  Building2,
  Users,
  GraduationCap,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Sparkles,
  AlertTriangle,
  Info,
  CalendarDays,
  UserPlus,
  Sliders,
  History,
  Cloud,
} from 'lucide-react';

interface DashboardViewProps {
  currentUser: User;
  siteSettings?: SiteSettings;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  siteSettings,
  onNavigateTab,
}) => {
  const isSuperAdmin = currentUser.role === 'super_admin';
  const todayStr = new Date().toISOString().split('T')[0];

  const [stats, setStats] = useState({
    hostelsCount: 0,
    classesCount: 0,
    studentsCount: 0,
    managersCount: 0,
  });

  const [hostelsList, setHostelsList] = useState<Hostel[]>([]);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [todaySessions, setTodaySessions] = useState<AttendanceSession[]>([]);
  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Widget visibility toggles from admin settings (defaulting to true)
  const showStats = siteSettings?.dashboard_show_stats !== 'false';
  const showPrayers = siteSettings?.dashboard_show_prayers !== 'false';
  const showHostels = siteSettings?.dashboard_show_hostels !== 'false';
  const showQuickActions = siteSettings?.dashboard_show_quick_actions !== 'false';
  const showAudit = siteSettings?.dashboard_show_audit !== 'false';

  const dashboardTitle = siteSettings?.dashboard_title || 'COSIS Hostels Attendence Management System';
  const announcement = siteSettings?.dashboard_announcement?.trim();
  const announcementType = siteSettings?.dashboard_announcement_type || 'info';

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [hostels, classes, students, managers, prayersData, sessions, audits] = await Promise.all([
          apiRequest<Hostel[]>('/api/hostels'),
          apiRequest<any[]>('/api/classes'),
          apiRequest<any[]>('/api/students?status=active'),
          isSuperAdmin ? apiRequest<any[]>('/api/managers') : Promise.resolve([]),
          apiRequest<Prayer[]>('/api/prayers'),
          apiRequest<AttendanceSession[]>(`/api/attendance/sessions?from_date=${todayStr}&to_date=${todayStr}`),
          isSuperAdmin ? apiRequest<any[]>('/api/audit-logs?limit=5').catch(() => []) : Promise.resolve([]),
        ]);

        setHostelsList(hostels);
        setStats({
          hostelsCount: hostels.length,
          classesCount: classes.length,
          studentsCount: students.length,
          managersCount: managers.length,
        });
        setPrayers(prayersData);
        setTodaySessions(sessions);
        setRecentAudits(audits);
      } catch (err) {
        console.error('Failed loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [isSuperAdmin, todayStr]);

  return (
    <div className="space-y-6">
      {/* 1. WELCOME BANNER WITH LOGO */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <SiteLogo settings={siteSettings} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-semibold font-mono">
                System Active · {currentUser.name} ({isSuperAdmin ? 'Super Admin' : currentUser.hostel_name || 'Manager'})
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              {dashboardTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('google-sheets')}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Cloud className="w-4 h-4 text-emerald-400" />
            <span>Google Sheets</span>
          </button>

          <button
            onClick={() => onNavigateTab('attendance')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>START ATTENDANCE</span>
          </button>
        </div>
      </div>

      {/* 2. INSTITUTION ANNOUNCEMENT / NOTICE BANNER (Customizable in Settings) */}
      {announcement && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-xs ${
            announcementType === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : announcementType === 'reminder'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-sky-50 border-sky-300 text-sky-950'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {announcementType === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
            {announcementType === 'reminder' && <Sparkles className="w-5 h-5 text-emerald-600" />}
            {announcementType === 'info' && <Info className="w-5 h-5 text-sky-600" />}
          </div>
          <div className="text-xs">
            <span className="font-bold uppercase tracking-wider block mb-0.5 text-[11px]">
              {announcementType === 'warning'
                ? 'Important Notice / Alert'
                : announcementType === 'reminder'
                ? 'Spiritual Reminder & Hadith of the Day'
                : 'Hostel & Madrasa Announcement'}
            </span>
            <p className="whitespace-pre-line leading-relaxed font-medium">{announcement}</p>
          </div>
        </div>
      )}

      {/* 3. QUICK ACTIONS BAR */}
      {showQuickActions && (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 px-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Quick Actions:</span>
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigateTab('attendance')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-semibold cursor-pointer transition-colors"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Take Attendance</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => onNavigateTab('students')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold cursor-pointer transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-600" />
                <span>Add / Manage Students</span>
              </button>
            )}

            <button
              onClick={() => onNavigateTab('leaves')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold cursor-pointer transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5 text-slate-600" />
              <span>Record Student Leave</span>
            </button>

            {isSuperAdmin && (
              <button
                onClick={() => onNavigateTab('promotions')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold cursor-pointer transition-colors"
              >
                <GraduationCap className="w-3.5 h-3.5 text-slate-600" />
                <span>Promote Students</span>
              </button>
            )}

            {isSuperAdmin && (
              <button
                onClick={() => onNavigateTab('settings')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold cursor-pointer transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-700" />
                <span>Site Settings & Logo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. METRIC STATS CARDS */}
      {showStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Total Hostels</span>
              <Building2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.hostelsCount}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Total Classes</span>
              <GraduationCap className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.classesCount}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">Active Students</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.studentsCount}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase">
                {isSuperAdmin ? 'Total Managers' : 'Your Assigned Block'}
              </span>
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {isSuperAdmin ? stats.managersCount : currentUser.hostel_name || 'Hostel A'}
            </div>
          </div>
        </div>
      )}

      {/* 5. TODAY'S FIVE PRAYERS STATUS */}
      {showPrayers && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Today's Namaz Attendance Schedule ({todayStr})
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer flex items-center gap-1"
            >
              <span>View Full Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {prayers.map((p) => {
              const recordedSession = todaySessions.find((s) => s.prayer_id === p.id);
              const isCompleted = !!recordedSession;

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border text-center transition-colors ${
                    isCompleted
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {p.name}
                  </div>

                  <div className="my-2">
                    {isCompleted ? (
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> COMPLETED
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock className="w-3 h-3 text-amber-600" /> PENDING
                      </div>
                    )}
                  </div>

                  {isCompleted && recordedSession ? (
                    <div className="text-[11px] text-slate-600 space-y-0.5 font-mono">
                      <div className="text-emerald-700 font-bold">
                        {recordedSession.present_count} P · {recordedSession.absent_count} A
                      </div>
                      <div className="text-[10px] text-slate-400">
                        By: {recordedSession.creator_name}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onNavigateTab('attendance')}
                      className="mt-1 text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Take Attendance ›
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. HOSTELS SUMMARY GRID */}
      {showHostels && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Hostel Blocks Overview ({hostelsList.length})</span>
              </h2>
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => onNavigateTab('hostels')}
                className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                Manage Blocks & Staff ›
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {hostelsList.map((h) => (
              <div
                key={h.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">{h.name}</div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                    {h.description || 'Residential Block'}
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-600">
                  <span className="font-bold text-emerald-700">{h.active_students_count || 0}</span> students
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. RECENT AUDIT LOG PREVIEW (Super Admin only) */}
      {isSuperAdmin && showAudit && recentAudits.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Recent System Activity</span>
            </h2>
            <button
              onClick={() => onNavigateTab('audit')}
              className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              View Full Audit Trail ›
            </button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentAudits.map((a) => (
              <div key={a.id} className="py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                    {a.action}
                  </span>
                  <span className="text-slate-800 font-medium">{a.user_name}</span>
                  <span className="text-slate-400 text-[11px] truncate max-w-sm">
                    {a.new_value || a.entity_type}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  {a.timestamp?.split(' ')[1] || a.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
