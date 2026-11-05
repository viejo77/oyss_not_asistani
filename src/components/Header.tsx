import React from 'react';
import { Award, BookOpen, School, Settings, Sparkles } from 'lucide-react';
import { ExamMetadata } from '../types';

interface HeaderProps {
  metadata: ExamMetadata;
  onUpdateMetadata: (updated: Partial<ExamMetadata>) => void;
  totalQuestions: number;
  totalPoints: number;
}

export const Header: React.FC<HeaderProps> = ({
  metadata,
  onUpdateMetadata,
  totalQuestions,
  totalPoints,
}) => {
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & App Brand */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-md shadow-red-500/20 text-white font-bold ring-2 ring-white/10">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  OYSS <span className="text-red-400 font-semibold">Not Baremi</span>
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-red-950/80 text-red-300 border border-red-800/60">
                  MEB Ortak Sınav
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-1">
                Soru Bazlı Not Baremi • e-Okul Not Girişi
              </p>
            </div>
          </div>

          {/* Quick Active Exam Summary */}
          <div className="hidden md:flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/60 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <BookOpen className="w-4 h-4 text-red-400" />
              <span className="font-semibold text-white">
                {metadata.grade}. Sınıf {metadata.subject}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-300 font-medium">{metadata.scenarioName}</span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 font-mono">
                {totalQuestions} Soru
              </span>
              <span className={`px-2 py-0.5 rounded font-mono font-semibold ${
                totalPoints === 100 
                  ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/40' 
                  : 'bg-amber-900/60 text-amber-300 border border-amber-700/40'
              }`}>
                {totalPoints}/100 Puan
              </span>
            </div>
          </div>

          {/* School & Teacher Settings Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Okul ve Öğretmen Bilgilerini Düzenle"
            >
              <School className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Kurum Bilgileri</span>
              <Settings className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Dropdown Drawer */}
      {showSettings && (
        <div className="bg-slate-800/95 border-b border-slate-700 px-4 py-4 sm:px-8 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Okul Adı</label>
              <input
                type="text"
                value={metadata.schoolName}
                onChange={e => onUpdateMetadata({ schoolName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                placeholder="Örn: Mehmet Akif Ersoy Ortaokulu"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Öğretmen Adı Soyadı</label>
              <input
                type="text"
                value={metadata.teacherName}
                onChange={e => onUpdateMetadata({ teacherName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                placeholder="Örn: Ayşe Yılmaz"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Eğitim Öğretim Yılı</label>
              <input
                type="text"
                value={metadata.academicYear}
                onChange={e => onUpdateMetadata({ academicYear: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                placeholder="2024-2025"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Sınav Tarihi</label>
              <input
                type="date"
                value={metadata.examDate}
                onChange={e => onUpdateMetadata({ examDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-3 flex justify-end">
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs text-red-400 hover:text-red-300 font-medium py-1 px-3 bg-red-950/40 rounded border border-red-900/60"
            >
              Kapat ve Kaydet
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
