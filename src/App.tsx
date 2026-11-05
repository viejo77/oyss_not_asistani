import React, { useEffect, useState } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Layers, 
  Sparkles, 
  BookOpen, 
  ShieldCheck, 
  Settings,
  HelpCircle,
  Lock,
  Unlock,
  FileText
} from 'lucide-react';
import { 
  ExamMetadata, 
  QuestionBareme, 
  Student, 
  TopicDistributionFile 
} from './types';
import { DEFAULT_DISTRIBUTIONS, createDefaultDistribution } from './data/defaultDistributions';
import { DEFAULT_STUDENTS } from './data/defaultStudents';
import { exportToPdf, formatClassBranch } from './utils/exporter';
import { trackEvent } from './utils/analytics';
import { WizardStepFlow } from './components/WizardStepFlow';
import { StudentGradeMatrix } from './components/StudentGradeMatrix';
import { PrintDocument } from './components/PrintDocument';
import { AdminDistributionModal } from './components/AdminDistributionModal';

export default function App() {
  // Store distributions (only custom uploaded ones from admin; no preloaded distributions)
  const [distributions, setDistributions] = useState<TopicDistributionFile[]>(() => {
    try {
      const saved = localStorage.getItem('oyss_custom_distributions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed.filter(d => !['mat6_1_2', 'tur6_1_1', 'fen7_1_2', 'tur8_1_2', 'tde9_1_2', 'mat9_1_2', 'mat10_1_2'].includes(d.id));
          return filtered;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_DISTRIBUTIONS;
  });

  // Active distribution (dynamic clean template without pre-filled topics)
  const [activeDistribution, setActiveDistribution] = useState<TopicDistributionFile>(() => {
    return createDefaultDistribution('ortaokul', 6, 'Matematik');
  });

  // Current wizard step (1 to 6)
  // Step 1: Kademe, Step 2: Sınıf, Step 3: Ders, Step 4: Senaryo, Step 5: Şube & Liste, Step 6: Not Girişi
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Exam Metadata (with persistent schoolName and teacherName from localStorage, no hardcoded school)
  const [metadata, setMetadata] = useState<ExamMetadata>(() => {
    let savedSchool = '';
    let savedTeacher = '';
    let savedBranch = 'A';
    try {
      savedSchool = localStorage.getItem('oyss_school_name') || '';
      savedTeacher = localStorage.getItem('oyss_teacher_name') || '';
      savedBranch = localStorage.getItem('oyss_branch') || 'A';
    } catch (e) {}

    return {
      schoolName: savedSchool,
      academicYear: '2024-2025',
      level: 'ortaokul',
      grade: 6,
      subject: 'Matematik',
      branch: savedBranch,
      period: '1_donem_2_yazili',
      scenarioName: 'Senaryo 1',
      questionCount: 7,
      teacherName: savedTeacher,
      examDate: new Date().toISOString().split('T')[0],
    };
  });

  // Students roster
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('oyss_students');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_STUDENTS;
  });

  // Bareme questions list
  const [bareme, setBareme] = useState<QuestionBareme[]>([]);

  // Admin Modal and Authentication state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('oyss_admin_auth') === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleAdminLogin = () => {
    setIsAdminAuthenticated(true);
    try {
      sessionStorage.setItem('oyss_admin_auth', 'true');
    } catch (e) {}
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem('oyss_admin_auth');
    } catch (e) {}
  };

  // Reconstruct questions whenever activeDistribution, scenarioName or questionCount changes
  useEffect(() => {
    const qCount = Math.max(1, metadata.questionCount || 7);
    const questions: QuestionBareme[] = [];

    // Collect available scenario rows
    const scenarioRows: { outcomeCode: string; outcomeDescription: string; topic: string; unit: string }[] = [];
    activeDistribution.rows.forEach(row => {
      const count = row.scenarioCounts[metadata.scenarioName] || 0;
      for (let i = 0; i < count; i++) {
        scenarioRows.push({
          outcomeCode: row.outcomeCode,
          outcomeDescription: row.outcomeDescription,
          topic: row.topic,
          unit: row.unit,
        });
      }
    });

    // Fallback if empty
    if (scenarioRows.length === 0) {
      activeDistribution.rows.forEach(row => {
        scenarioRows.push({
          outcomeCode: row.outcomeCode,
          outcomeDescription: row.outcomeDescription,
          topic: row.topic,
          unit: row.unit,
        });
      });
    }

    for (let qNum = 1; qNum <= qCount; qNum++) {
      const row = scenarioRows[(qNum - 1) % (scenarioRows.length || 1)];
      questions.push({
        questionNumber: qNum,
        outcomeCode: row ? row.outcomeCode : `S.${qNum}`,
        outcomeDescription: row ? row.outcomeDescription : `${metadata.subject} Soru ${qNum}`,
        topic: row ? row.topic : `Soru ${qNum}`,
        unit: row ? row.unit : 'Genel',
        maxScore: 10,
        criteria: row ? `${row.topic} sorusu` : `Soru ${qNum}`,
      });
    }

    // Default even distribution
    if (questions.length > 0) {
      const base = Math.floor(100 / questions.length);
      const rem = 100 % questions.length;
      questions.forEach((q, idx) => {
        q.maxScore = base + (idx < rem ? 1 : 0);
      });
    }

    setBareme(questions);
  }, [activeDistribution, metadata.scenarioName, metadata.questionCount]);

  // Save students to local storage
  useEffect(() => {
    try {
      localStorage.setItem('oyss_students', JSON.stringify(students));
    } catch (e) {}
  }, [students]);

  // Track session visit on app open
  useEffect(() => {
    trackEvent('visit', { level: metadata.level, grade: metadata.grade, subject: metadata.subject });
  }, []);

  // Update metadata helper
  const handleUpdateMetadata = (updated: Partial<ExamMetadata>) => {
    setMetadata(prev => {
      const next = { ...prev, ...updated };
      try {
        if (updated.schoolName !== undefined) {
          localStorage.setItem('oyss_school_name', updated.schoolName);
        }
        if (updated.teacherName !== undefined) {
          localStorage.setItem('oyss_teacher_name', updated.teacherName);
        }
        if (updated.branch !== undefined) {
          localStorage.setItem('oyss_branch', updated.branch);
        }
      } catch (e) {}
      return next;
    });
  };

  // Add custom distribution
  const handleAddDistribution = (newDist: TopicDistributionFile) => {
    const updated = [newDist, ...distributions.filter(d => d.id !== newDist.id)];
    setDistributions(updated);
    setActiveDistribution(newDist);
    try {
      localStorage.setItem('oyss_custom_distributions', JSON.stringify(updated));
    } catch (e) {}
  };

  // Delete distribution
  const handleDeleteDistribution = (id: string) => {
    const updated = distributions.filter(d => d.id !== id);
    setDistributions(updated);
    if (activeDistribution.id === id) {
      if (updated.length > 0) {
        setActiveDistribution(updated[0]);
      } else {
        setActiveDistribution(createDefaultDistribution(metadata.level, metadata.grade, metadata.subject));
      }
    }
    try {
      localStorage.setItem('oyss_custom_distributions', JSON.stringify(updated));
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* Printable official document (Hidden on screen, rendered on Print) */}
      <PrintDocument
        metadata={metadata}
        bareme={bareme}
        students={students}
      />

      {/* Main App Container (Hidden during print) */}
      <div className="no-print flex-1 flex flex-col">
        {/* Sleek App Navigation Bar */}
        <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* App Brand */}
              <div 
                onClick={() => setCurrentStep(1)}
                className="flex items-center space-x-3 cursor-pointer group"
                title="Başa Dön (1. Adım)"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-md font-black text-white text-lg">
                  O
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base sm:text-lg tracking-tight text-white group-hover:text-red-400 transition">
                      OYSS <span className="text-red-400 font-semibold">Not Asistanı</span>
                    </span>
                    {activeDistribution.isNationalExam && (
                      <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wide">
                        Ülke Geneli Ortak
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Soru Bazlı Not Girişi & e-Okul Aktarım Sistemi
                  </p>
                </div>
              </div>

              {/* Center status: Current selection pill */}
              <div className="hidden lg:flex items-center gap-2 bg-slate-800/90 px-3.5 py-1.5 rounded-xl border border-slate-700/80 text-xs">
                <span className="font-bold text-white">
                  {metadata.grade}. Sınıf {metadata.subject}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-300 font-semibold">{metadata.scenarioName}</span>
                <span className="text-slate-500">•</span>
                <span className="text-red-400 font-bold">{metadata.branch || 'Şube'}</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-mono font-bold">{bareme.length} Soru</span>
              </div>

              {/* Admin & Direct Print Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    isAdminAuthenticated
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600/70 hover:bg-emerald-900/80 shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title={isAdminAuthenticated ? "Yönetici Paneli (Oturum Açık)" : "Yönetici Girişi (Sadece Yetkili)"}
                >
                  {isAdminAuthenticated ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="hidden sm:inline">Yönetici Paneli</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Yönetici Girişi</span>
                      <span className="sm:hidden">Yönetici</span>
                    </>
                  )}
                </button>

                {currentStep === 6 && (
                  <button
                    onClick={() => {
                      exportToPdf(metadata, bareme, students);
                      trackEvent('pdf_download', { 
                        level: metadata.level, 
                        grade: metadata.grade, 
                        subject: metadata.subject, 
                        studentCount: students.length,
                        classBranch: formatClassBranch(metadata.grade, metadata.branch),
                        schoolName: metadata.schoolName
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition shadow-xs"
                    title="e-Okul Not Fişini PDF Olarak İndir"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">PDF İndir</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
          {/* Step-by-Step Wizard for Steps 1 through 5 */}
          {currentStep < 6 && (
            <WizardStepFlow
              currentStep={currentStep}
              onSetStep={setCurrentStep}
              metadata={metadata}
              onUpdateMetadata={handleUpdateMetadata}
              activeDistribution={activeDistribution}
              onSelectDistribution={setActiveDistribution}
              availableDistributions={distributions}
              students={students}
              onUpdateStudents={setStudents}
              onOpenAdminModal={() => setIsAdminModalOpen(true)}
            />
          )}

          {/* STEP 6: DIRECT NOT GİRİŞİ (Simple table to enter student scores and take output for e-Okul) */}
          {currentStep === 6 && (
            <div className="animate-in fade-in duration-200">
              {/* Back to Wizard / Info banner */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="min-w-12 h-10 px-2.5 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black text-xs shrink-0">
                    {formatClassBranch(metadata.grade, metadata.branch)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <span>{formatClassBranch(metadata.grade, metadata.branch)} • {metadata.subject}</span>
                      {metadata.schoolName && (
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {metadata.schoolName}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Soru Sayısı: <strong className="text-slate-800">{bareme.length} Soru</strong> | Sınıf Mevcudu: <strong className="text-slate-800">{students.length} Öğrenci</strong>
                      {metadata.teacherName && <span> | Öğretmen: <strong className="text-slate-800">{metadata.teacherName}</strong></span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Soru Sayısını Değiştir ({bareme.length} Soru)
                  </button>
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Okul & Sınıf Bilgisini Değiştir
                  </button>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition"
                  >
                    En Başa Dön
                  </button>
                </div>
              </div>

              {/* The Student Score Matrix for e-Okul */}
              <StudentGradeMatrix
                students={students}
                onUpdateStudents={setStudents}
                bareme={bareme}
                metadata={metadata}
                onUpdateMetadata={handleUpdateMetadata}
              />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="font-bold text-slate-700">
              MEB OYSS & e-Okul Ortak Sınav Not Asistanı
            </span>
            <p>
              Öğretmenler için soru bazlı e-Okul ortak yazılı sınav not giriş ve aktarım asistanı.
            </p>
          </div>
        </footer>
      </div>

      {/* Admin Distribution & Vercel Helper Modal */}
      <AdminDistributionModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        distributions={distributions}
        onAddDistribution={handleAddDistribution}
        onDeleteDistribution={handleDeleteDistribution}
        isAuthenticated={isAdminAuthenticated}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
      />
    </div>
  );
}
