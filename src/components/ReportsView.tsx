import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import {
  Hostel,
  AcademicSession,
  ClassItem,
  Prayer,
  AttendanceRecord,
} from '../types.js';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  // Filters
  const [fromDate, setFromDate] = useState<string>(
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedHostel, setSelectedHostel] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedPrayer, setSelectedPrayer] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'LEAVE'>('ALL');

  // Metadata for filter dropdowns
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [prayers, setPrayers] = useState<Prayer[]>([]);

  // Results
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    present: number;
    absent: number;
    leave: number;
    attendanceRate: number;
  }>({
    total: 0,
    present: 0,
    absent: 0,
    leave: 0,
    attendanceRate: 0,
  });

  const [loading, setLoading] = useState(false);

  // Load dropdown options
  useEffect(() => {
    async function loadMeta() {
      try {
        const [hData, sData, cData, pData] = await Promise.all([
          apiRequest<Hostel[]>('/api/hostels'),
          apiRequest<AcademicSession[]>('/api/sessions'),
          apiRequest<ClassItem[]>('/api/classes'),
          apiRequest<Prayer[]>('/api/prayers'),
        ]);
        setHostels(hData);
        setSessions(sData);
        setClasses(cData);
        setPrayers(pData);
      } catch (err) {
        console.error('Error loading report filters:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Report Data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (selectedHostel) params.append('hostel_id', selectedHostel);
      if (selectedSession) params.append('academic_session_id', selectedSession);
      if (selectedClass) params.append('class_id', selectedClass);
      if (selectedPrayer) params.append('prayer_id', selectedPrayer);
      if (search) params.append('search', search);
      if (activeTab !== 'ALL') params.append('status', activeTab);

      const res = await apiRequest<{
        records: AttendanceRecord[];
        summary: {
          total: number;
          present: number;
          absent: number;
          leave: number;
          attendanceRate: number;
        };
      }>(`/api/reports?${params.toString()}`);

      setRecords(res.records);
      setSummary(res.summary);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate, selectedHostel, selectedSession, selectedClass, selectedPrayer, activeTab]);

  // Export to CSV (Section 25)
  const exportToCSV = () => {
    if (records.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'Date',
      'Hostel',
      'Academic Session',
      'Class',
      'Prayer / Event',
      'Roll No',
      'Student Name',
      'Father Name',
      'Status',
      'Marked By',
      'Manager Hostel',
      'Marked At',
    ];

    const rows = records.map((r) => [
      `"${r.date || ''}"`,
      `"${r.hostel_name || ''}"`,
      `"${r.academic_session_name || ''}"`,
      `"${r.class_name || ''}"`,
      `"${r.event_name || 'Namaz'}"`,
      `"${r.roll_no || ''}"`,
      `"${r.student_name || ''}"`,
      `"${r.father_name || ''}"`,
      `"${r.status || ''}"`,
      `"${r.marked_by_name || ''}"`,
      `"${r.manager_hostel_name || ''}"`,
      `"${r.marked_at || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Hostel_Namaz_Report_${fromDate}_to_${toDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print Report
  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HEADER & ACTIONS */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Attendance Reports & Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Query prayer attendance across hostels, classes, and date ranges.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={printReport}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" /> Report Filters
          </span>
          <button
            onClick={fetchReport}
            className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer font-medium"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Hostel</label>
            <select
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value)}
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
            <label className="block text-slate-700 font-semibold mb-1">Prayer / Event</label>
            <select
              value={selectedPrayer}
              onChange={(e) => setSelectedPrayer(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">All Prayers / Events</option>
              {prayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} Namaz
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.hostel_name} › {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Search Student / Roll</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchReport()}
                placeholder="Name or roll..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY STATS CARDS (Section 24) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Records</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{summary.total}</div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-center shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-800 uppercase">Present</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums">{summary.present}</div>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3 text-center shadow-xs">
          <div className="text-[11px] font-semibold text-rose-800 uppercase">Absent</div>
          <div className="text-2xl font-bold text-rose-700 font-mono tabular-nums">{summary.absent}</div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-center shadow-xs">
          <div className="text-[11px] font-semibold text-amber-800 uppercase">Leave</div>
          <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums">{summary.leave}</div>
        </div>

        <div className="bg-slate-900 text-white rounded-lg p-3 text-center shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase">Attendance Rate</div>
          <div className="text-2xl font-bold font-mono tabular-nums">{summary.attendanceRate}%</div>
        </div>
      </div>

      {/* THREE STATUS TABS (Section 23) */}
      <div className="border-b border-slate-200 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'ALL'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          ALL RECORDS ({summary.total})
        </button>
        <button
          onClick={() => setActiveTab('PRESENT')}
          className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'PRESENT'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-emerald-700'
          }`}
        >
          PRESENT ({summary.present})
        </button>
        <button
          onClick={() => setActiveTab('ABSENT')}
          className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'ABSENT'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-rose-700'
          }`}
        >
          ABSENT ({summary.absent})
        </button>
        <button
          onClick={() => setActiveTab('LEAVE')}
          className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'LEAVE'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-amber-700'
          }`}
        >
          ON LEAVE ({summary.leave})
        </button>
      </div>

      {/* TABLE VIEW (Section 23) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Hostel</th>
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Roll No</th>
                <th className="py-2.5 px-3">Student Name</th>
                <th className="py-2.5 px-3">Father Name</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Prayer / Event</th>
                <th className="py-2.5 px-3">Marked By</th>
                <th className="py-2.5 px-3">Marked At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    Loading records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  let statusBadge = '';
                  if (r.status === 'PRESENT') {
                    statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                  } else if (r.status === 'ABSENT') {
                    statusBadge = 'bg-rose-100 text-rose-800 border-rose-300';
                  } else {
                    statusBadge = 'bg-amber-100 text-amber-800 border-amber-300';
                  }

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium">{r.date}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{r.hostel_name}</td>
                      <td className="py-2.5 px-3">{r.class_name}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{r.roll_no}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{r.student_name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{r.father_name}</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-emerald-800">{r.event_name}</td>
                      <td className="py-2.5 px-3">
                        <div>{r.marked_by_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.manager_hostel_name}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{r.marked_at}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
