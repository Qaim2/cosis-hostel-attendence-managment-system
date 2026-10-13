import React, { useState } from 'react';
import { apiRequest } from '../api.js';
import {
  CheckCircle2,
  XCircle,
  Play,
  Sparkles,
  ShieldCheck,
  Terminal,
  RotateCcw,
} from 'lucide-react';

interface TestResult {
  id: number;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

export const TestSuiteView: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; passed: number; failed: number } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const runAllTests = async () => {
    setRunning(true);
    setSeedMessage(null);
    try {
      const data = await apiRequest<{
        success: boolean;
        total: number;
        passed: number;
        failed: number;
        results: TestResult[];
      }>('/api/tests/run-all', { method: 'POST' });

      setResults(data.results);
      setSummary({ total: data.total, passed: data.passed, failed: data.failed });
    } catch (err: any) {
      alert(`Test runner error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const seedScenarioData = async () => {
    setSeeding(true);
    try {
      const res = await apiRequest<{ success: boolean; message: string }>('/api/setup/seed-demo', {
        method: 'POST',
      });
      setSeedMessage(res.message);
      runAllTests();
    } catch (err: any) {
      alert(`Seeding failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Automated Verification Suite (20 Tests)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Executes full-stack acceptance testing against all 20 specified criteria from Section 39 & Section 42.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={seedScenarioData}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold cursor-pointer shadow-xs transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{seeding ? 'Seeding...' : 'Seed Acceptance Dataset (300 Students)'}</span>
          </button>
          <button
            onClick={runAllTests}
            disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer shadow-xs transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{running ? 'Running 20 Tests...' : 'RUN ALL 20 TESTS'}</span>
          </button>
        </div>
      </div>

      {seedMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{seedMessage}</span>
        </div>
      )}

      {/* SUMMARY STATS */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-4 text-center shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Tests</div>
            <div className="text-3xl font-bold font-mono text-slate-900 mt-1">{summary.total}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center shadow-xs">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase">Passed</div>
            <div className="text-3xl font-bold font-mono text-emerald-700 mt-1">{summary.passed}</div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center shadow-xs">
            <div className="text-[11px] font-semibold text-rose-800 uppercase">Failed</div>
            <div className="text-3xl font-bold font-mono text-rose-700 mt-1">{summary.failed}</div>
          </div>
        </div>
      )}

      {/* TESTS LIST */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Test Results & Criteria Matrix
          </span>
          <span className="text-xs text-slate-500">
            {results.length > 0 ? `${results.filter((r) => r.status === 'PASS').length} of 20 Passing` : 'Ready to execute'}
          </span>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-16 text-xs text-slate-500 space-y-2">
            <Terminal className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-semibold text-slate-700">Test suite ready to run.</p>
            <p>Click "RUN ALL 20 TESTS" to run automated verification across the application.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {results.map((t) => (
              <div key={t.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-slate-400 w-6 shrink-0 mt-0.5">
                    #{t.id}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{t.name}</h3>
                    <p className="text-[11px] text-slate-600 mt-0.5">{t.details}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  {t.status === 'PASS' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PASS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      <XCircle className="w-3 h-3 text-rose-600" /> FAIL
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
