import React, { useRef, useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  Layers, 
  GraduationCap, 
  Calendar,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { 
  ExamMetadata, 
  ExamPeriod, 
  SchoolLevel, 
  TopicDistributionFile 
} from '../types';
import { AVAILABLE_SUBJECTS } from '../data/defaultDistributions';
import { downloadSampleMEBExcel, parseTopicDistributionExcel } from '../utils/excelParser';

interface ExamSelectorProps {
  metadata: ExamMetadata;
  onUpdateMetadata: (updated: Partial<ExamMetadata>) => void;
  activeDistribution: TopicDistributionFile;
  onSelectDistribution: (dist: TopicDistributionFile) => void;
  availableDistributions: TopicDistributionFile[];
  onUploadCustomDistribution: (dist: TopicDistributionFile) => void;
}

export const ExamSelector: React.FC<ExamSelectorProps> = ({
  metadata,
  onUpdateMetadata,
  activeDistribution,
  onSelectDistribution,
  availableDistributions,
  onUploadCustomDistribution,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const grades = metadata.level === 'ortaokul' ? [5, 6, 7, 8] : [9, 10, 11, 12];
  const subjects = AVAILABLE_SUBJECTS[metadata.level];

  const handleLevelChange = (newLevel: SchoolLevel) => {
    const newGrade = newLevel === 'ortaokul' ? 6 : 9;
    const newSubjects = AVAILABLE_SUBJECTS[newLevel];
    const newSubject = newSubjects[0];

    // Check if we have a pre-loaded distribution for this level
    const match = availableDistributions.find(
      d => d.level === newLevel && d.grade === newGrade
    ) || availableDistributions.find(d => d.level === newLevel);

    onUpdateMetadata({
      level: newLevel,
      grade: newGrade,
      subject: match ? match.subject : newSubject,
      scenarioName: match ? match.scenarios[0] : 'Senaryo 1',
    });

    if (match) {
      onSelectDistribution(match);
    }
  };

  const handleGradeChange = (grade: number) => {
    const match = availableDistributions.find(
      d => d.grade === grade && d.level === metadata.level
    );

    onUpdateMetadata({
      grade,
      subject: match ? match.subject : metadata.subject,
      scenarioName: match ? match.scenarios[0] : metadata.scenarioName,
    });

    if (match) {
      onSelectDistribution(match);
    }
  };

  const handleSubjectChange = (subject: string) => {
    const match = availableDistributions.find(
      d => d.subject === subject && d.grade === metadata.grade
    );

    onUpdateMetadata({
      subject,
      scenarioName: match ? match.scenarios[0] : 'Senaryo 1',
    });

    if (match) {
      onSelectDistribution(match);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const parsedDist = await parseTopicDistributionExcel(file);
      onUploadCustomDistribution(parsedDist);
      setUploadSuccess(`"${file.name}" başarıyla yüklendi! (${parsedDist.rows.length} kazanım, ${parsedDist.scenarios.length} senaryo bulundu)`);
      
      onUpdateMetadata({
        level: parsedDist.level,
        grade: parsedDist.grade,
        subject: parsedDist.subject,
        scenarioName: parsedDist.scenarios[0] || 'Senaryo 1',
      });

      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Excel dosyası işlenirken hata oluştu. Lütfen dosya biçimini kontrol ediniz.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Calculate questions count for each scenario in the active distribution
  const getScenarioQuestionCount = (scName: string) => {
    return activeDistribution.rows.reduce((sum, r) => sum + (r.scenarioCounts[scName] || 0), 0);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-6">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-red-600" />
          <h2 className="text-sm sm:text-base font-bold text-slate-800">
            1. Adım: Sınav Kademesi, Ders ve Senaryo Belirleme
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => downloadSampleMEBExcel(activeDistribution)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition shadow-xs"
            title="MEB standart formatında örnek Excel şablonu indir"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Örnek Excel İndir
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Excel Dağılım Tablosu Yükle
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
        </div>
      </div>

      {/* Upload Feedback Messages */}
      {uploadSuccess && (
        <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Selector Grid */}
      <div className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Okul Kademesi (Ortaokul / Lise) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Okul Kademesi
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleLevelChange('ortaokul')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  metadata.level === 'ortaokul'
                    ? 'bg-white text-red-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ortaokul
              </button>
              <button
                type="button"
                onClick={() => handleLevelChange('lise')}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${
                  metadata.level === 'lise'
                    ? 'bg-white text-red-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lise
              </button>
            </div>
          </div>

          {/* 2. Sınıf Düzeyi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Sınıf Seviyesi
            </label>
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {grades.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleGradeChange(g)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    metadata.grade === g
                      ? 'bg-white text-red-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {g}. Sınıf
                </button>
              ))}
            </div>
          </div>

          {/* 3. Ders Seçimi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Ortak Sınav Dersi
            </label>
            <select
              value={metadata.subject}
              onChange={e => handleSubjectChange(e.target.value)}
              className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              {subjects.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Sınav Dönemi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Sınav Dönemi
            </label>
            <select
              value={metadata.period}
              onChange={e => onUpdateMetadata({ period: e.target.value as ExamPeriod })}
              className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="1_donem_1_yazili">1. Dönem 1. Ortak Yazılı</option>
              <option value="1_donem_2_yazili">1. Dönem 2. Ortak Yazılı</option>
              <option value="2_donem_1_yazili">2. Dönem 1. Ortak Yazılı</option>
              <option value="2_donem_2_yazili">2. Dönem 2. Ortak Yazılı</option>
            </select>
          </div>

          {/* 5. Şube */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Sınıf / Şube
            </label>
            <input
              type="text"
              value={metadata.branch}
              onChange={e => onUpdateMetadata({ branch: e.target.value.toUpperCase() })}
              placeholder="Örn: A, B, C veya 6/A"
              className="w-full h-[42px] bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
        </div>

        {/* Senaryo Seçici Bölümü (Öğretmenin seçtiği senaryo) */}
        <div className="pt-2 border-t border-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Uygulanan Sınav Senaryosu
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                Okul zümrenizin MEB konu soru dağılım tablosundan seçtiği senaryoyu tıklayınız.
              </p>
            </div>

            <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
              Aktif Tablo: <strong className="text-slate-800">{activeDistribution.title}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {activeDistribution.scenarios.map(sc => {
              const qCount = getScenarioQuestionCount(sc);
              const isSelected = metadata.scenarioName === sc;
              return (
                <button
                  key={sc}
                  type="button"
                  onClick={() => onUpdateMetadata({ scenarioName: sc })}
                  className={`p-3.5 rounded-xl text-left border transition-all duration-150 relative ${
                    isSelected
                      ? 'bg-red-50/70 border-red-500 ring-2 ring-red-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-bold text-sm ${isSelected ? 'text-red-700' : 'text-slate-800'}`}>
                      {sc}
                    </span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-red-600" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                      isSelected 
                        ? 'bg-red-600 text-white' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {qCount} Soru
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {qCount > 0 ? 'Açık Uçlu' : 'Soru Yok'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
