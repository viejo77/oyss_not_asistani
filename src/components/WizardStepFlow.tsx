import React, { useRef, useState } from 'react';
import { 
  GraduationCap, 
  School, 
  BookOpen, 
  Layers, 
  Users, 
  Edit3, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Sparkles, 
  FileSpreadsheet, 
  ClipboardList, 
  ShieldCheck, 
  AlertCircle,
  HelpCircle,
  Eye,
  CheckCircle2,
  Table,
  Plus,
  Minus
} from 'lucide-react';
import { ExamMetadata, SchoolLevel, TopicDistributionFile, Student } from '../types';
import { AVAILABLE_SUBJECTS, createDefaultDistribution } from '../data/defaultDistributions';
import { parseStudentListExcel } from '../utils/excelParser';
import { DEFAULT_STUDENTS } from '../data/defaultStudents';
import { formatClassBranch } from '../utils/exporter';

interface WizardStepFlowProps {
  currentStep: number;
  onSetStep: (step: number) => void;
  metadata: ExamMetadata;
  onUpdateMetadata: (updated: Partial<ExamMetadata>) => void;
  activeDistribution: TopicDistributionFile;
  onSelectDistribution: (dist: TopicDistributionFile) => void;
  availableDistributions: TopicDistributionFile[];
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
  onOpenAdminModal: () => void;
}

export const WizardStepFlow: React.FC<WizardStepFlowProps> = ({
  currentStep,
  onSetStep,
  metadata,
  onUpdateMetadata,
  activeDistribution,
  onSelectDistribution,
  availableDistributions,
  students,
  onUpdateStudents,
  onOpenAdminModal,
}) => {
  const studentFileRef = useRef<HTMLInputElement>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showDistributionTable, setShowDistributionTable] = useState(false);

  const grades = metadata.level === 'ortaokul' ? [5, 6, 7, 8] : [9, 10, 11, 12];
  const subjects = AVAILABLE_SUBJECTS[metadata.level];

  // Steps definition
  const stepTitles = [
    { num: 1, title: 'Kademe', short: 'Kademe' },
    { num: 2, title: 'Sınıf Seviyesi', short: 'Sınıf' },
    { num: 3, title: 'Ortak Sınav Dersi', short: 'Ders' },
    { num: 4, title: 'Senaryo & Soru', short: 'Senaryo' },
    { num: 5, title: 'Şube & Sınıf Listesi', short: 'Öğrenciler' },
    { num: 6, title: 'Not Girişi & e-Okul', short: 'Not Girişi' },
  ];

  // Set Question Count
  const handleSetQuestionCount = (count: number) => {
    const safeCount = Math.max(1, Math.min(50, count));
    onUpdateMetadata({ questionCount: safeCount });
  };

  // Change Level
  const handleSelectLevel = (level: SchoolLevel) => {
    const defaultGrade = level === 'ortaokul' ? 6 : 9;
    const match = availableDistributions.find(d => d.level === level && d.grade === defaultGrade) ||
                  availableDistributions.find(d => d.level === level);
    const defaultSubject = match ? match.subject : AVAILABLE_SUBJECTS[level][0];
    const dist = match || createDefaultDistribution(level, defaultGrade, defaultSubject);

    onUpdateMetadata({
      level,
      grade: defaultGrade,
      subject: defaultSubject,
      scenarioName: dist.scenarios[0] || 'Senaryo 1',
    });

    onSelectDistribution(dist);
    onSetStep(2);
  };

  // Change Grade
  const handleSelectGrade = (grade: number) => {
    const match = availableDistributions.find(d => d.level === metadata.level && d.grade === grade);
    const dist = match || createDefaultDistribution(metadata.level, grade, metadata.subject);

    onUpdateMetadata({
      grade,
      subject: match ? match.subject : metadata.subject,
      scenarioName: dist.scenarios[0] || 'Senaryo 1',
    });

    onSelectDistribution(dist);
    onSetStep(3);
  };

  // Change Subject
  const handleSelectSubject = (subject: string) => {
    const match = availableDistributions.find(
      d => d.level === metadata.level && d.grade === metadata.grade && d.subject === subject
    );
    const dist = match || createDefaultDistribution(metadata.level, metadata.grade, subject);
    const defaultScenario = dist.scenarios[0] || 'Senaryo 1';
    let initialCount = metadata.questionCount || 7;
    if (match && match.rows.length > 0) {
      const qCount = match.rows.reduce((sum, r) => sum + (r.scenarioCounts[defaultScenario] || 0), 0);
      if (qCount > 0) initialCount = qCount;
    }

    onUpdateMetadata({
      subject,
      scenarioName: defaultScenario,
      questionCount: initialCount,
    });

    onSelectDistribution(dist);
    onSetStep(4);
  };

  // Change Scenario
  const handleSelectScenario = (scenario: string) => {
    onUpdateMetadata({ scenarioName: scenario });
    onSetStep(5);
  };

  // Handle student roster Excel upload
  const handleStudentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseStudentListExcel(file);
      if (parsed.length > 0) {
        onUpdateStudents(parsed);
      }
    } catch (err: any) {
      alert('Öğrenci listesi okunurken hata: ' + err.message);
    } finally {
      if (studentFileRef.current) studentFileRef.current.value = '';
    }
  };

  // Bulk paste students
  const handleBulkPaste = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split('\n');
    const newStudents: Student[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/^(\d+)[\s\t,;]+(.+)$/);
      if (match) {
        newStudents.push({
          id: `paste-std-${Date.now()}-${idx}`,
          studentNumber: match[1].trim(),
          fullName: match[2].trim(),
          scores: {},
        });
      } else {
        newStudents.push({
          id: `paste-std-${Date.now()}-${idx}`,
          studentNumber: String(100 + idx + 1),
          fullName: trimmed,
          scores: {},
        });
      }
    });

    if (newStudents.length > 0) {
      onUpdateStudents(newStudents);
      setShowPasteModal(false);
      setPasteText('');
    }
  };

  // Ensure scenarios 1 to 7 are always available
  const getAvailableScenarios = () => {
    const standard7 = ['Senaryo 1', 'Senaryo 2', 'Senaryo 3', 'Senaryo 4', 'Senaryo 5', 'Senaryo 6', 'Senaryo 7'];
    const list: string[] = [];
    if (activeDistribution?.isNationalExam) {
      list.push('Bakanlık Ortak Sınavı (Ülke Geneli)');
    }
    standard7.forEach(sc => {
      if (!list.includes(sc)) list.push(sc);
    });
    if (activeDistribution?.scenarios) {
      activeDistribution.scenarios.forEach(sc => {
        if (!list.includes(sc)) list.push(sc);
      });
    }
    return list;
  };

  // Helper to count questions in a scenario with MEB defaults
  const getQuestionCount = (scName: string) => {
    if (activeDistribution?.rows && activeDistribution.rows.length > 0) {
      const sum = activeDistribution.rows.reduce(
        (acc, r) => acc + (r.scenarioCounts?.[scName] || 0),
        0
      );
      if (sum > 0) return sum;
    }

    const defaultScenarioCounts: Record<string, number> = {
      'Senaryo 1': 7,
      'Senaryo 2': 7,
      'Senaryo 3': 6,
      'Senaryo 4': 7,
      'Senaryo 5': 6,
      'Senaryo 6': 8,
      'Senaryo 7': 10,
      'Bakanlık Ortak Sınavı (Ülke Geneli)': 8,
    };

    return defaultScenarioCounts[scName] || 7;
  };

  return (
    <div className="mb-6">
      {/* Wizard Progress Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-3 sm:p-4 mb-4">
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          {stepTitles.map((step, idx) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;

            return (
              <React.Fragment key={step.num}>
                <button
                  type="button"
                  onClick={() => onSetStep(step.num)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                    isCurrent
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${
                    isCurrent
                      ? 'bg-white text-red-700'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.num}
                  </span>
                  <span className="hidden md:inline">{step.title}</span>
                  <span className="md:hidden">{step.short}</span>
                </button>

                {idx < stepTitles.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: KADEME SEÇİMİ */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 animate-in fade-in duration-200">
          <div className="text-center max-w-lg mx-auto mb-8">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700 uppercase tracking-wider">
              1. Adım
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Hangi Okul Kademesinde Sınav Yapacaksınız?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Soru bazlı not girişi ve e-Okul çizelgesi oluşturmak için okul kademesini seçiniz.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* Ortaokul */}
            <button
              onClick={() => handleSelectLevel('ortaokul')}
              className={`p-6 rounded-2xl border-2 text-left transition transform hover:-translate-y-1 hover:shadow-lg ${
                metadata.level === 'ortaokul'
                  ? 'border-red-500 bg-red-50/50 ring-2 ring-red-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xl mb-4">
                <School className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Ortaokul</h3>
              <p className="text-xs text-slate-500 mt-1">
                5, 6, 7 ve 8. Sınıf Ortak Sınav ve Not Girişi
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-red-600">
                <span>Ortaokulu Seç</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {/* Lise */}
            <button
              onClick={() => handleSelectLevel('lise')}
              className={`p-6 rounded-2xl border-2 text-left transition transform hover:-translate-y-1 hover:shadow-lg ${
                metadata.level === 'lise'
                  ? 'border-red-500 bg-red-50/50 ring-2 ring-red-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl mb-4">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Lise</h3>
              <p className="text-xs text-slate-500 mt-1">
                9, 10, 11 ve 12. Sınıf Ortak Sınav ve Not Girişi
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                <span>Liseyi Seç</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SINIF SEVİYESİ */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 animate-in fade-in duration-200">
          <div className="text-center max-w-lg mx-auto mb-8">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700 uppercase tracking-wider">
              2. Adım • {metadata.level === 'ortaokul' ? 'Ortaokul' : 'Lise'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Sınıf Seviyesini Seçiniz
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Değerlendirme yapacağınız sınıf düzeyini tıklayınız.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {grades.map(g => (
              <button
                key={g}
                onClick={() => handleSelectGrade(g)}
                className={`p-6 rounded-2xl border-2 text-center transition transform hover:-translate-y-1 hover:shadow-md ${
                  metadata.grade === g
                    ? 'border-red-500 bg-red-50/50 ring-2 ring-red-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <span className="block text-3xl font-black text-slate-900 mb-1">
                  {g}.
                </span>
                <span className="text-xs font-bold text-slate-600">
                  Sınıf
                </span>
                <div className="mt-3 text-[11px] font-bold text-red-600 flex items-center justify-center gap-0.5">
                  <span>Devam Et</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => onSetStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
              Geri (Kademeyi Değiştir)
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DERS SEÇİMİ (Ülke Geneli Ortak Sınav Vurgusu) */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 animate-in fade-in duration-200">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700 uppercase tracking-wider">
              3. Adım • {metadata.grade}. Sınıf
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Ortak Sınavı Olan Dersi Seçiniz
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Bakanlık tarafından <strong>Ülke Geneli Ortak Yapılan</strong> dersler özel olarak işaretlenmiştir.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-w-4xl mx-auto">
            {subjects.map(subj => {
              // Check if we have distribution for this subject and if it's a national common exam
              const dist = availableDistributions.find(
                d => d.grade === metadata.grade && d.subject === subj
              );
              const isNational = dist?.isNationalExam;
              const isSelected = metadata.subject === subj;

              return (
                <button
                  key={subj}
                  onClick={() => handleSelectSubject(subj)}
                  className={`p-4 rounded-xl border-2 text-left transition transform hover:-translate-y-0.5 relative ${
                    isNational
                      ? 'border-amber-400 bg-amber-50/40 hover:bg-amber-50'
                      : isSelected
                      ? 'border-red-500 bg-red-50/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {isNational && (
                    <div className="mb-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white font-extrabold text-[10px] tracking-wide uppercase shadow-xs">
                      <ShieldCheck className="w-3 h-3" />
                      MEB Ülke Geneli Ortak Sınav
                    </div>
                  )}

                  <h3 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                    <span>{subj}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </h3>

                  <p className="text-[11px] text-slate-500 mt-1">
                    {dist && dist.rows && dist.rows.length > 0
                      ? `${dist.rows.length} Konu / Kazanım Yüklü` 
                      : 'Seçmek için tıklayınız'}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => onSetStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
              Geri (Sınıfı Değiştir)
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SENARYO & SORU SAYISI BELİRLEME */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 animate-in fade-in duration-200">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700 uppercase tracking-wider">
              4. Adım • {metadata.grade}. Sınıf {metadata.subject}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Sınav Senaryosu ve Soru Sayısı
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Uyguladığınız sınav senaryosunu ve soru sayısını belirleyiniz.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-6">
            {/* National Exam Banner if applicable */}
            {activeDistribution.isNationalExam && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-extrabold text-amber-950 block text-sm mb-0.5">
                    MEB Ülke Geneli Ortak Yazılı Sınavı
                  </strong>
                  <span>
                    {activeDistribution.nationalExamNote || 'Bu ders Bakanlık tarafından ülke genelinde ortak yapılmaktadır.'}
                  </span>
                </div>
              </div>
            )}

            {/* 1. Senaryo Seçimi (1'den 7'ye Kadar) */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-red-600" />
                    <span>Kullanılan Senaryoyu Seçin (1 - 7. Senaryo)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Seçtiğiniz senaryoya göre soru sayısı belirlenir; dilerseniz alttan soru sayısını değiştirebilirsiniz.
                  </p>
                </div>
                <span className="text-xs font-black text-red-700 bg-red-100/80 px-2.5 py-1 rounded-lg self-start sm:self-auto shrink-0">
                  {metadata.scenarioName || 'Senaryo 1'}
                </span>
              </div>

              {/* Scenario cards grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {getAvailableScenarios().map(sc => {
                  const isSelected = metadata.scenarioName === sc;
                  const isBakanlik = sc.includes('Bakanlık');

                  return (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => {
                        const targetCount = getQuestionCount(sc);
                        onUpdateMetadata({
                          scenarioName: sc,
                          questionCount: targetCount,
                        });
                      }}
                      className={`p-3 sm:p-3.5 rounded-2xl border-2 text-left transition-all transform active:scale-95 flex items-center justify-between min-h-[52px] relative ${
                        isBakanlik ? 'col-span-2 sm:col-span-3 md:col-span-4' : ''
                      } ${
                        isSelected
                          ? 'border-red-600 bg-red-50/80 shadow-md shadow-red-600/10 ring-2 ring-red-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                      }`}
                    >
                      <span className={`text-xs font-extrabold truncate ${isSelected ? 'text-red-950' : 'text-slate-800'}`}>
                        {sc}
                      </span>
                      {isSelected ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-red-600" />
                        </div>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-200 shrink-0"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Soru Sayısı Kontrol Kartı (Otomatik & İsteğe Bağlı Özelleştirme) */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-xs">
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                  Sınavdaki Toplam Açık Uçlu Soru Sayısı
                </span>
                <span className="text-[11px] font-medium text-slate-500 block mt-1">
                  {metadata.scenarioName ? `${metadata.scenarioName} seçimine göre ayarlandı.` : ''} İhtiyaç halinde +/- ile değiştirebilirsiniz:
                </span>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleSetQuestionCount((metadata.questionCount || 7) - 1)}
                  className="w-12 h-12 rounded-2xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-black text-xl shadow-xs transition active:scale-95"
                  title="Soru sayısını azalt"
                >
                  <Minus className="w-5 h-5 stroke-[3]" />
                </button>

                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={metadata.questionCount || 7}
                    onChange={e => handleSetQuestionCount(parseInt(e.target.value, 10) || 1)}
                    className="w-32 h-16 text-center text-4xl font-black text-slate-900 bg-white border-2 border-red-500 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-red-500/20"
                  />
                  <span className="block text-[11px] font-bold text-slate-400 mt-1 uppercase">
                    Soru Sayısı
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSetQuestionCount((metadata.questionCount || 7) + 1)}
                  className="w-12 h-12 rounded-2xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center font-black text-xl shadow-xs transition active:scale-95"
                  title="Soru sayısını artır"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                </button>
              </div>

              {/* Fast Preset Question Count Buttons */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                  Hızlı Seçim Butonları:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {[5, 6, 7, 8, 10, 12, 15, 20].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => handleSetQuestionCount(cnt)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        (metadata.questionCount || 7) === cnt
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cnt} Soru
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Confirmation summary */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Seçilen Senaryo: {metadata.scenarioName || 'Senaryo 1'} • Toplam: {metadata.questionCount || 7} Soru</strong>
                <p className="text-emerald-700 text-[11px] mt-0.5">
                  e-Okul not giriş tablosunda <strong>S1'den S{metadata.questionCount || 7}'ye kadar</strong> soru sütunları açılacaktır.
                </p>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => onSetStep(3)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
                Geri (Dersi Değiştir)
              </button>

              <button
                onClick={() => onSetStep(5)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/30 transition transform hover:-translate-y-0.5"
              >
                <span>Devam Et (5. Adım: Öğrenci Listesi)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: ŞUBE & ÖĞRENCİ LİSTESİ YÜKLEME */}
      {currentStep === 5 && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200/80 animate-in fade-in duration-200">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700 uppercase tracking-wider">
              5. Adım • Okul, Şube ve Öğrenci Listesi
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Okul Adınızı, Sınıf Şubenizi ve Listenizi Belirleyin
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Girdiğiniz okul adı ve sınıf şubesi resmi PDF ve Excel çıktılarının başlığına otomatik basılır.
            </p>
          </div>

          <div className="max-w-xl mx-auto space-y-5">
            {/* 1. Okul Adı Girişi */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Okul Adınız (PDF & Excel Başlığı İçin)
                </label>
                <span className="text-[11px] text-slate-400">İsteğe Bağlı</span>
              </div>
              <input
                type="text"
                value={metadata.schoolName}
                onChange={e => onUpdateMetadata({ schoolName: e.target.value })}
                placeholder="Örn: Mehmet Akif Ersoy Ortaokulu veya Gazi Anadolu Lisesi"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <p className="text-[11px] text-slate-500">
                Resmi evraklarda okulunuzun adı bu şekilde görünür. Boş bırakırsanız genel MEB başlığı kullanılır.
              </p>
            </div>

            {/* 2. Sınıf ve Şube Seçimi */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Sınıf / Şube Adı
                </label>
                <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg font-mono">
                  {formatClassBranch(metadata.grade, metadata.branch)}
                </span>
              </div>

              <div>
                <input
                  type="text"
                  value={metadata.branch}
                  onChange={e => onUpdateMetadata({ branch: e.target.value })}
                  placeholder="Örn: 9-A, 6/B veya 10-C"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Buraya yazdığınız sınıf/şube adı çıktılarda ve çizelgede aynen görünecektir.
                </p>
              </div>

              {/* Ders Öğretmeni Adı */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ders Öğretmeni Adı Soyadı (İmza Alanı İçin):
                </label>
                <input
                  type="text"
                  value={metadata.teacherName}
                  onChange={e => onUpdateMetadata({ teacherName: e.target.value })}
                  placeholder="Örn: Ayşe Yılmaz"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Canlı Belge Başlığı Önizleme Kutusu */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-blue-900 block">
                📄 Çıktılarda (PDF & Excel) Görünecek Başlık Önizlemesi:
              </span>
              <div className="bg-white p-2.5 rounded-lg border border-blue-200 text-center font-serif text-[11px] text-slate-800 leading-snug">
                <div className="font-bold">T.C. MİLLÎ EĞİTİM BAKANLIĞI</div>
                {metadata.schoolName ? (
                  <div className="font-bold text-red-700">{metadata.schoolName.toUpperCase()}</div>
                ) : (
                  <div className="text-slate-400 italic">(Okul Adı Girilmedi)</div>
                )}
                <div className="font-semibold text-slate-700">
                  {formatClassBranch(metadata.grade, metadata.branch)} {metadata.subject.toUpperCase()} DERSİ e-OKUL NOT GİRİŞ ÇİZELGESİ
                </div>
              </div>
            </div>

            {/* Öğrenci Listesi Araçları */}
            <div className="space-y-3">
              <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Öğrenci Listesi Yükleme Seçenekleri
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Excel Upload */}
                <button
                  type="button"
                  onClick={() => studentFileRef.current?.click()}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 bg-white text-left transition flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Excel'den Yükle</h4>
                    <p className="text-[11px] text-slate-500">e-Okul Excel öğrenci listesi</p>
                  </div>
                </button>
                <input
                  type="file"
                  ref={studentFileRef}
                  onChange={handleStudentUpload}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                {/* Bulk Paste */}
                <button
                  type="button"
                  onClick={() => setShowPasteModal(true)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 bg-white text-left transition flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Toplu Yapıştır</h4>
                    <p className="text-[11px] text-slate-500">Kopyala-yapıştır ile aktar</p>
                  </div>
                </button>
              </div>

              {/* Sample Class / Current Roster Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Mevcut Liste: <strong className="text-emerald-700">{students.length} Öğrenci Kayıtlı</strong>
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {students.length > 0 ? 'Öğrencileriniz not girişine hazır.' : 'Henüz öğrenci eklenmedi.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateStudents(DEFAULT_STUDENTS)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  Örnek Sınıfı Yükle (15 Kişi)
                </button>
              </div>
            </div>

            {/* Next Action Button */}
            <div className="pt-4 flex items-center justify-between">
              <button
                onClick={() => onSetStep(4)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
                Geri (Senaryoyu Değiştir)
              </button>

              <button
                onClick={() => onSetStep(6)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md shadow-red-600/30 transition transform hover:-translate-y-0.5"
              >
                <span>Doğrudan Not Girişine Başla</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paste Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-red-600" />
              Toplu Öğrenci Listesi Yapıştır
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              e-Okul veya Excel'den kopyaladığınız listeyi buraya yapıştırın. Her satırda okul numarası ve ad soyad olması yeterlidir.
            </p>

            <textarea
              rows={8}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={`101 Ahmet Yılmaz\n102 Ayşe Kaya\n103 Mehmet Çelik\n104 Fatma Şahin`}
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 bg-slate-50"
            />

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleBulkPaste}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition"
              >
                Listeyi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
