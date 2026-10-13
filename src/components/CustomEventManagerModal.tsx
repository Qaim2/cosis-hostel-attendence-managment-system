import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.js';
import { CustomEvent, Hostel, ClassItem } from '../types.js';
import {
  CalendarDays,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Sparkles,
  Clock,
  Building2,
  BookOpen,
  CalendarCheck,
  Tag,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface CustomEventManagerModalProps {
  isOpen: boolean;
  initialMode?: 'create' | 'list' | 'edit';
  initialDate?: string;
  editingEvent?: CustomEvent | null;
  onClose: () => void;
  onEventCreated?: (event: CustomEvent) => void;
  onEventUpdated?: (event: CustomEvent) => void;
  onEventDeleted?: (eventId: number) => void;
  onSelectEventForAttendance?: (eventId: number) => void;
}

const EVENT_PRESETS = [
  { name: 'Tarawih Namaz', category: 'Special Prayer', time: '08:45 PM', desc: 'Nightly 20 Rakat Tarawih during Ramadan with Khatam-ul-Quran.' },
  { name: 'Tahajjud Prayer', category: 'Special Prayer', time: '04:15 AM', desc: 'Congregational Tahajjud prayer before Fajr.' },
  { name: "Jumu'ah Khutbah & Bayan", category: 'Lecture / Bayan', time: '01:15 PM', desc: 'Friday spiritual sermon and moral development lecture.' },
  { name: 'Husn-e-Qirat Competition', category: 'Competition', time: '10:00 AM', desc: 'Annual Quranic recitation and Tajweed championship.' },
  { name: 'Seerat-un-Nabi Conference', category: 'Seminar', time: '06:00 PM', desc: 'Special lecture series on the life of the Holy Prophet ﷺ.' },
  { name: 'Hostel Night Assembly', category: 'Assembly', time: '09:30 PM', desc: 'Mandatory hostel inspection and evening attendance assembly.' },
  { name: 'Annual Examination Attendance', category: 'Academic', time: '08:00 AM', desc: 'Daily roll call attendance during final examination week.' },
  { name: 'Special Iftar & Dua Gathering', category: 'Gathering', time: '06:15 PM', desc: 'Community Iftar meal followed by collective supplication.' },
];

export const CustomEventManagerModal: React.FC<CustomEventManagerModalProps> = ({
  isOpen,
  initialMode = 'list',
  initialDate,
  editingEvent: propEditingEvent,
  onClose,
  onEventCreated,
  onEventUpdated,
  onEventDeleted,
  onSelectEventForAttendance,
}) => {
  const [mode, setMode] = useState<'create' | 'list' | 'edit'>(initialMode);
  const [events, setEvents] = useState<CustomEvent[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [currentEditingId, setCurrentEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('');
  const [formCategory, setFormCategory] = useState('Special Prayer');
  const [formHostelId, setFormHostelId] = useState<string>('');
  const [formClassId, setFormClassId] = useState<string>('');
  const [formDescription, setFormDescription] = useState('');

  // Delete State
  const [deletingEvent, setDeletingEvent] = useState<CustomEvent | null>(null);
  const [deletingExecuting, setDeletingExecuting] = useState(false);

  // Filter State in List
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setFeedback(null);
      loadEventsAndMeta();

      if (propEditingEvent) {
        populateFormForEdit(propEditingEvent);
      } else if (initialMode === 'create') {
        resetForm();
      }
    }
  }, [isOpen, initialMode, propEditingEvent]);

  const loadEventsAndMeta = async () => {
    setLoading(true);
    try {
      const [eventsData, hostelsData, classesData] = await Promise.all([
        apiRequest<CustomEvent[]>('/api/events'),
        apiRequest<Hostel[]>('/api/hostels').catch(() => []),
        apiRequest<ClassItem[]>('/api/classes').catch(() => []),
      ]);
      setEvents(eventsData);
      setHostels(hostelsData);
      setClasses(classesData);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed loading events' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentEditingId(null);
    setFormName('');
    setFormDate(initialDate || new Date().toISOString().split('T')[0]);
    setFormTime('');
    setFormCategory('Special Prayer');
    setFormHostelId('');
    setFormClassId('');
    setFormDescription('');
  };

  const populateFormForEdit = (ev: CustomEvent) => {
    setCurrentEditingId(ev.id);
    setFormName(ev.name);
    setFormDate(ev.date);
    setFormTime(ev.event_time || '');
    setFormCategory(ev.category || 'General');
    setFormHostelId(ev.hostel_id ? String(ev.hostel_id) : '');
    setFormClassId(ev.class_id ? String(ev.class_id) : '');
    setFormDescription(ev.description || '');
    setMode('edit');
  };

  const applyPreset = (preset: typeof EVENT_PRESETS[0]) => {
    setFormName(preset.name);
    setFormCategory(preset.category);
    setFormTime(preset.time);
    setFormDescription(preset.desc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDate) {
      setFeedback({ type: 'error', message: 'Please enter event title and date.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const payload = {
      name: formName.trim(),
      date: formDate,
      event_time: formTime.trim(),
      category: formCategory,
      hostel_id: formHostelId ? Number(formHostelId) : null,
      class_id: formClassId ? Number(formClassId) : null,
      description: formDescription.trim(),
    };

    try {
      if (mode === 'edit' && currentEditingId) {
        const res = await apiRequest<{ success: boolean; event: CustomEvent; message: string }>(
          `/api/events/${currentEditingId}`,
          {
            method: 'PUT',
            body: JSON.stringify(payload),
          }
        );
        setFeedback({ type: 'success', message: res.message });
        setEvents((prev) => prev.map((ev) => (ev.id === currentEditingId ? res.event : ev)));
        if (onEventUpdated) onEventUpdated(res.event);
        setTimeout(() => setMode('list'), 800);
      } else {
        const res = await apiRequest<{ success: boolean; id: number; event: CustomEvent; message: string }>(
          '/api/events',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          }
        );
        setFeedback({ type: 'success', message: res.message });
        setEvents((prev) => [res.event, ...prev]);
        if (onEventCreated) onEventCreated(res.event);
        setTimeout(() => {
          if (initialMode === 'create') {
            onClose();
          } else {
            setMode('list');
          }
        }, 900);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const executeDelete = async (force: boolean = false) => {
    if (!deletingEvent) return;
    setDeletingExecuting(true);
    try {
      const url = `/api/events/${deletingEvent.id}${force ? '?force=true' : ''}`;
      const res = await apiRequest<{ success: boolean; message: string }>(url, {
        method: 'DELETE',
      });
      setFeedback({ type: 'success', message: res.message });
      setEvents((prev) => prev.filter((e) => e.id !== deletingEvent.id));
      if (onEventDeleted) onEventDeleted(deletingEvent.id);
      setDeletingEvent(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete event' });
    } finally {
      setDeletingExecuting(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.creator_name && ev.creator_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || (ev.category || 'General') === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(['Special Prayer', 'Lecture / Bayan', 'Competition', 'Seminar', 'Assembly', 'Academic', 'Gathering', 'General']));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-lg">
              <CalendarDays className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Custom Events & Special Gatherings</h2>
              <p className="text-xs text-emerald-200">
                Manage, schedule, and record attendance for Tarawih, Bayans, Competitions & Assemblies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (mode === 'list') {
                  resetForm();
                  setMode('create');
                } else {
                  setMode('list');
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700/80 hover:bg-emerald-600 transition-colors text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {mode === 'list' ? (
                <>
                  <Plus className="w-4 h-4" />
                  <span>+ Create Event</span>
                </>
              ) : (
                <>
                  <CalendarCheck className="w-4 h-4" />
                  <span>View All Events ({events.length})</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-5 py-3 text-xs font-semibold flex items-center justify-between border-b ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          {mode === 'list' ? (
            /* ================= VIEW ALL EVENTS LIST ================= */
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search custom events by title, remarks, creator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      resetForm();
                      setMode('create');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Event</span>
                  </button>
                </div>
              </div>

              {/* Table or Cards */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                  <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs font-mono">Loading custom events...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                  <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-700">No Custom Events Found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    Create special events such as Tarawih Namaz, Tahajjud, Friday Bayan, or Hostel Assemblies to record attendance.
                  </p>
                  <button
                    onClick={() => {
                      resetForm();
                      setMode('create');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Custom Event</span>
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs max-h-[440px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Event Title & Category</th>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Assigned Scope</th>
                        <th className="py-2.5 px-3">Attendance</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <span>{ev.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {ev.category || 'General'}
                              </span>
                              {ev.description && (
                                <span className="text-[11px] text-slate-500 truncate max-w-xs" title={ev.description}>
                                  {ev.description}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-mono font-bold text-slate-800 text-[11px] flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{ev.date}</span>
                            </div>
                            {ev.event_time && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{ev.event_time}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="text-[11px] text-slate-700 font-medium flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>{ev.hostel_name || 'All Hostels'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <BookOpen className="w-3 h-3 text-slate-400" />
                              <span>{ev.class_name || 'All Classes'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {ev.sessions_count && ev.sessions_count > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                <CheckCircle2 className="w-3 h-3 text-teal-600" />
                                {ev.sessions_count} Saved Session(s)
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] text-slate-400 bg-slate-100">
                                Pending Attendance
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {onSelectEventForAttendance && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectEventForAttendance(ev.id);
                                    onClose();
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                  title="Mark Attendance for this Event"
                                >
                                  <CalendarCheck className="w-3 h-3" />
                                  <span>Mark</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => populateFormForEdit(ev)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded transition-colors cursor-pointer"
                                title="Edit Event"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingEvent(ev)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete Event"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ================= CREATE / EDIT FORM ================= */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Presets Row (Only in Create Mode) */}
              {mode === 'create' && (
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Quick Event Templates (Click to Auto-Fill):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="px-2.5 py-1 text-[11px] rounded-md border border-slate-300 bg-white hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-800 transition-colors text-slate-700 font-medium cursor-pointer shadow-2xs"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Event Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Event Title / Occasion <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tarawih Namaz, Jumu'ah Lecture, Qirat Competition"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                {/* Event Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Event Date <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                {/* Event Time */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Time / Schedule Reference</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 08:30 PM, After Isha, Early Morning"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Category / Occasion Type</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Hostel Block */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Hostel Scope</span>
                  </label>
                  <select
                    value={formHostelId}
                    onChange={(e) => setFormHostelId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    <option value="">All Hostel Blocks (Institute Wide)</option>
                    {hostels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Class Scope */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Class Scope (Optional)</span>
                  </label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    <option value="">All Classes & Sections</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.hostel_name || 'Hostel'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description / Notes */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Event Description & Instructions (Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter instructions, special attendees, or requirements..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel / Return to List
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Event...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{mode === 'edit' ? 'Update Custom Event' : 'Create Custom Event'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Custom Event</h3>
                <p className="text-xs text-slate-500">This action will remove the scheduled event.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
              <div>
                <span className="font-bold">Event: </span>
                <span>{deletingEvent.name}</span>
              </div>
              <div>
                <span className="font-bold">Date: </span>
                <span className="font-mono">{deletingEvent.date}</span>
              </div>
              {deletingEvent.sessions_count && deletingEvent.sessions_count > 0 ? (
                <div className="text-amber-700 font-semibold pt-1">
                  ⚠️ Note: {deletingEvent.sessions_count} attendance session(s) were recorded for this event. Deleting it will keep the attendance records intact while unlinking the event header.
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                disabled={deletingExecuting}
                className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDelete(true)}
                disabled={deletingExecuting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {deletingExecuting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
