import React, { useRef, useState } from 'react';
import { 
  Users, 
  Upload, 
  UserPlus, 
  Trash2, 
  FileSpreadsheet, 
  ClipboardList, 
  Printer,
  ClipboardCopy,
  Check, 
  Sparkles, 
  Search, 
  BookOpen, 
  Download, 
  RotateCcw,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExamMetadata, QuestionBareme, Student } from '../types';
import { parseStudentListExcel } from '../utils/excelParser';
import { DEFAULT_STUDENTS } from '../data/defaultStudents';
import { copyOnlyScoresForEOkul, copyForOyss, exportToExcel, exportToPdf, formatClassBranch } from '../utils/exporter';
import { trackEvent } from '../utils/analytics';

interface StudentGradeMatrixProps {
  students: Student[];
  onUpdateStudents: (updated: Student[]) => void;
  bareme: QuestionBareme[];
  metadata: ExamMetadata;
  onUpdateMetadata?: (updated: Partial<ExamMetadata>) => void;
}

export const StudentGradeMatrix: React.FC<StudentGradeMatrixProps> = ({
  students,
  onUpdateStudents,
  bareme,
  metadata,
  onUpdateMetadata,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showEditMetaModal, setShowEditMetaModal] = useState(false);
  const [editSchoolName, setEditSchoolName] = useState(metadata.schoolName || '');
  const [editBranch, setEditBranch] = useState(metadata.branch || 'A');
  const [editTeacher, setEditTeacher] = useState(metadata.teacherName || '');
  const [pasteText, setPasteText] = useState('');
  const [newStudentNo, setNewStudentNo] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

  // Filter students based on search query
  const filteredStudents = students.filter(
    s => s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
         s.studentNumber.includes(searchQuery)
  );

  // Handle score change (Simple and direct: accepts any valid points or G)
  const handleScoreChange = (studentId: string, qNum: number, rawValue: string) => {
    let scoreValue: number | 'G' | '' = '';
    const trimmed = rawValue.trim().toUpperCase();

    if (trimmed === 'G') {
      scoreValue = 'G';
    } else if (trimmed === '') {
      scoreValue = '';
    } else {
      const num = Number(trimmed);
      if (!isNaN(num) && num >= 0) {
        scoreValue = num;
      } else {
        return; // ignore non-numeric
      }
    }

    const updated = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          scores: {
            ...s.scores,
            [qNum]: scoreValue,
          },
        };
      }
      return s;
    });

    onUpdateStudents(updated);
  };

  // Keyboard navigation across cells
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    qNum: number
  ) => {
    const totalQuestions = bareme.length;
    const totalStudents = filteredStudents.length;

    // Helper to safely focus & select text
    const focusCell = (sIndex: number, questionNumber: number) => {
      const el = document.getElementById(`score-${sIndex}-${questionNumber}`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
    };

    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Enter: Geriye doğru hareket et
        if (qNum > 1) {
          focusCell(studentIndex, qNum - 1);
        } else if (studentIndex > 0) {
          focusCell(studentIndex - 1, totalQuestions);
        }
      } else {
        // Enter: Aynı öğrencinin sonraki sorusuna geç
        if (qNum < totalQuestions) {
          focusCell(studentIndex, qNum + 1);
        } else if (studentIndex + 1 < totalStudents) {
          // Son sorudan sonra: Sonraki öğrencinin 1. sorusuna geç
          focusCell(studentIndex + 1, 1);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusCell(studentIndex + 1, qNum);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusCell(studentIndex - 1, qNum);
    } else if (e.key === 'ArrowRight') {
      if (qNum < totalQuestions) {
        focusCell(studentIndex, qNum + 1);
      } else if (studentIndex + 1 < totalStudents) {
        focusCell(studentIndex + 1, 1);
      }
    } else if (e.key === 'ArrowLeft') {
      if (qNum > 1) {
        focusCell(studentIndex, qNum - 1);
      } else if (studentIndex > 0) {
        focusCell(studentIndex - 1, totalQuestions);
      }
    }
  };

  // Calculate total score for a student
  const getStudentTotal = (student: Student) => {
    let total = 0;
    let isAbsent = false;
    let hasScore = false;

    bareme.forEach(q => {
      const score = student.scores[q.questionNumber];
      if (score === 'G') isAbsent = true;
      if (typeof score === 'number') {
        total += score;
        hasScore = true;
      }
    });

    if (isAbsent) return { text: 'G', value: 0, isAbsent: true };
    if (!hasScore) return { text: '-', value: 0, isAbsent: false };
    return { text: String(Math.round(total)), value: total, isAbsent: false };
  };

  // Add individual student
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const newStd: Student = {
      id: `student-${Date.now()}`,
      studentNumber: newStudentNo.trim() || String(students.length + 100),
      fullName: newStudentName.trim(),
      scores: {},
    };

    onUpdateStudents([...students, newStd]);
    setNewStudentNo('');
    setNewStudentName('');
  };

  // Delete student
  const handleDeleteStudent = (id: string) => {
    onUpdateStudents(students.filter(s => s.id !== id));
  };

  // Excel Upload
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedStudents = await parseStudentListExcel(file);
      if (parsedStudents.length > 0) {
        onUpdateStudents(parsedStudents);
      }
    } catch (err: any) {
      alert('Öğrenci listesi okunurken hata: ' + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Bulk paste
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

  // Fill demo scores for testing
  const handleFillDemoScores = () => {
    const updated = students.map((s, idx) => {
      if (idx === 4) {
        const absentScores: { [q: number]: 'G' } = {};
        bareme.forEach(q => { absentScores[q.questionNumber] = 'G'; });
        return { ...s, scores: absentScores };
      }

      const scores: { [q: number]: number } = {};
      bareme.forEach(q => {
        const factor = 0.6 + Math.random() * 0.4;
        const pts = Math.round((q.maxScore || 15) * factor);
        scores[q.questionNumber] = pts;
      });
      return { ...s, scores };
    });
    onUpdateStudents(updated);
  };

  // Reset scores
  const handleClearScores = () => {
    if (confirm('Tüm notlar temizlenecek, emin misiniz?')) {
      const updated = students.map(s => ({ ...s, scores: {} }));
      onUpdateStudents(updated);
    }
  };

  // Copy for e-Okul (ONLY question scores, no name/number as requested by user)
  const handleCopyForEOkul = async () => {
    const text = copyOnlyScoresForEOkul(bareme, students);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      trackEvent('eokul_copy', { 
        level: metadata.level, 
        grade: metadata.grade, 
        subject: metadata.subject, 
        studentCount: students.length,
        classBranch: formatClassBranch(metadata.grade, metadata.branch),
        schoolName: metadata.schoolName
      });
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
      setTimeout(() => setCopied(false), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  // Direct PDF Export file download
  const handlePdfExport = () => {
    try {
      exportToPdf(metadata, bareme, students);
      trackEvent('pdf_download', { 
        level: metadata.level, 
        grade: metadata.grade, 
        subject: metadata.subject, 
        studentCount: students.length,
        classBranch: formatClassBranch(metadata.grade, metadata.branch),
        schoolName: metadata.schoolName
      });
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch (err: any) {
      console.error(err);
      window.print();
    }
  };

  // Export to Excel
  const handleExcelExport = () => {
    exportToExcel(metadata, bareme, students);
    trackEvent('excel_download', { 
      level: metadata.level, 
      grade: metadata.grade, 
      subject: metadata.subject, 
      studentCount: students.length,
      classBranch: formatClassBranch(metadata.grade, metadata.branch),
      schoolName: metadata.schoolName
    });
    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch (e) {}
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-6">
      {/* Header with e-Okul action bar */}
      <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-base sm:text-lg">
              e-Okul Soru Bazlı Not Giriş Çizelgesi
            </span>
            <span className="px-2.5 py-0.5 rounded-lg bg-red-600 text-white text-xs font-black shadow-xs">
              {formatClassBranch(metadata.grade, metadata.branch)} • {metadata.subject}
            </span>
            {metadata.schoolName && (
              <span className="text-xs text-slate-300 font-semibold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {metadata.schoolName}
              </span>
            )}
            {onUpdateMetadata && (
              <button
                type="button"
                onClick={() => {
                  setEditSchoolName(metadata.schoolName || '');
                  setEditBranch(metadata.branch || 'A');
                  setEditTeacher(metadata.teacherName || '');
                  setShowEditMetaModal(true);
                }}
                className="text-[11px] underline text-slate-400 hover:text-white transition cursor-pointer"
              >
                (Okul/Şube Düzenle)
              </button>
            )}
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Sınav kağıtlarını okurken notları girin; ardından PDF/Excel çıktısı alabilir veya e-Okul'a tek tıkla kopyalayabilirsiniz.
          </p>
        </div>

        {/* Primary Export Actions for e-Okul */}
        <div className="flex flex-wrap items-center gap-2">
          {/* PDF Download Button */}
          <button
            onClick={handlePdfExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition shadow-sm"
            title="e-Okul Not Fişini PDF Dosyası Olarak İndir"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF İndir</span>
          </button>

          {/* Excel Download Button */}
          <button
            onClick={handleExcelExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
            title="Excel Dosyası Olarak İndir (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel İndir</span>
          </button>

          {/* Copy only scores for e-Okul */}
          <button
            onClick={handleCopyForEOkul}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
            title="İsim ve numara olmadan sadece soru puanlarını panoya kopyalar (e-Okul kutularına doğrudan yapıştırmak için)"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Notlar Kopyalandı! (e-Okul'a Yapıştırın)</span>
              </>
            ) : (
              <>
                <ClipboardCopy className="w-3.5 h-3.5" />
                <span>e-Okul İçin Kopyala (Sadece Notlar)</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Yazıcıdan Çıktı Al"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Yazdır</span>
          </button>
        </div>
      </div>

      {/* Roster Controls & Helper */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Quick Add Student */}
        <form onSubmit={handleAddStudent} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="No (Örn: 101)"
            value={newStudentNo}
            onChange={e => setNewStudentNo(e.target.value)}
            className="w-24 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <input
            type="text"
            placeholder="Öğrenci Adı Soyadı"
            value={newStudentName}
            onChange={e => setNewStudentName(e.target.value)}
            className="w-48 sm:w-56 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition"
          >
            Ekle
          </button>
        </form>

        {/* Quick Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleFillDemoScores}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/80 bg-slate-100 transition"
            title="Hızlı deneme için rastgele notlar doldur"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 inline mr-1" />
            Örnek Notları Doldur
          </button>

          <button
            onClick={handleClearScores}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition"
            title="Tüm notları sıfırla"
          >
            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
            Temizle
          </button>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Öğrenci ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Grade Table Matrix */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-20 border-b border-slate-300 shadow-xs">
            <tr>
              <th className="py-3 px-3 w-12 text-center border-r border-slate-200">#</th>
              <th className="py-3 px-3 w-20 border-r border-slate-200">No</th>
              <th className="py-3 px-4 min-w-[200px] border-r border-slate-200">Adı Soyadı</th>

              {/* Dynamic Question Headers */}
              {bareme.map(q => (
                <th
                  key={q.questionNumber}
                  className="py-2.5 px-2 text-center border-r border-slate-200 min-w-[65px] bg-slate-100"
                  title={`${q.outcomeCode}: ${q.topic}`}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-red-700 font-black text-xs">S{q.questionNumber}</span>
                  </div>
                </th>
              ))}

              <th className="py-3 px-3 text-center border-r border-slate-200 min-w-[80px] bg-slate-200/70 font-black text-slate-900">
                Toplam Not
              </th>
              <th className="py-3 px-2 text-center w-12">Sil</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={bareme.length + 5} className="py-12 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                  <p className="font-semibold text-slate-600">Öğrenci bulunamadı</p>
                </td>
              </tr>
            ) : (
              filteredStudents.map((student, sIdx) => {
                const total = getStudentTotal(student);
                const isFocused = activeRowIndex === sIdx;

                return (
                  <tr 
                    key={student.id} 
                    className={`transition ${isFocused ? 'bg-amber-50/60' : 'hover:bg-slate-50/80'}`}
                    onClick={() => setActiveRowIndex(sIdx)}
                  >
                    <td className="py-2 px-3 text-center text-slate-400 font-mono border-r border-slate-200">
                      {sIdx + 1}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-800 border-r border-slate-200">
                      {student.studentNumber}
                    </td>
                    <td className="py-2 px-4 font-bold text-slate-800 border-r border-slate-200">
                      {student.fullName}
                    </td>

                    {/* Question Score Inputs */}
                    {bareme.map(q => {
                      const scoreVal = student.scores[q.questionNumber];
                      const displayVal = scoreVal !== undefined ? String(scoreVal) : '';
                      const isAbsent = scoreVal === 'G' || scoreVal === 'g';

                      return (
                        <td
                          key={q.questionNumber}
                          className="py-1 px-1.5 text-center border-r border-slate-200"
                        >
                          <input
                            id={`score-${sIdx}-${q.questionNumber}`}
                            type="text"
                            value={displayVal}
                            placeholder="-"
                            onChange={e => handleScoreChange(student.id, q.questionNumber, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, sIdx, q.questionNumber)}
                            onFocus={e => {
                              setActiveRowIndex(sIdx);
                              e.target.select();
                            }}
                            className={`w-full text-center font-bold text-sm py-1.5 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-red-500 ${
                              isAbsent
                                ? 'bg-amber-100 text-amber-800 border-amber-300 font-black'
                                : displayVal !== ''
                                ? 'bg-emerald-50 text-slate-900 border-emerald-300 font-mono font-black'
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          />
                        </td>
                      );
                    })}

                    {/* Total Score */}
                    <td className="py-2 px-3 text-center font-mono font-black text-sm border-r border-slate-200 bg-slate-50/60">
                      <span className={`${
                        total.isAbsent
                          ? 'text-amber-700 font-bold'
                          : total.value >= 50
                          ? 'text-emerald-700'
                          : total.text === '-'
                          ? 'text-slate-400'
                          : 'text-red-600'
                      }`}>
                        {total.text}
                      </span>
                    </td>

                    {/* Delete */}
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="text-slate-300 hover:text-red-600 transition p-1"
                        title="Öğrenciyi Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer with Averages */}
          {students.length > 0 && (
            <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300 sticky bottom-0 z-20">
              <tr>
                <td colSpan={3} className="py-2.5 px-4 text-right border-r border-slate-300 text-xs">
                  SORU ORTALAMALARI:
                </td>

                {bareme.map(q => {
                  let sum = 0;
                  let count = 0;
                  students.forEach(s => {
                    const score = s.scores[q.questionNumber];
                    if (typeof score === 'number') {
                      sum += score;
                      count++;
                    }
                  });
                  const avg = count > 0 ? (sum / count) : 0;

                  return (
                    <td
                      key={q.questionNumber}
                      className="py-2 px-1 text-center border-r border-slate-300 bg-slate-100"
                    >
                      <span className="font-mono text-xs font-black text-slate-900">
                        {count > 0 ? avg.toFixed(1) : '-'}
                      </span>
                    </td>
                  );
                })}

                {/* Overall Class Average */}
                <td className="py-2.5 px-3 text-center border-r border-slate-300 bg-slate-200/90 font-mono font-black text-sm text-red-700">
                  {(() => {
                    let totalSum = 0;
                    let studentCount = 0;
                    students.forEach(s => {
                      const t = getStudentTotal(s);
                      if (!t.isAbsent && t.text !== '-') {
                        totalSum += t.value;
                        studentCount++;
                      }
                    });
                    return studentCount > 0 ? (totalSum / studentCount).toFixed(1) : '-';
                  })()}
                </td>

                <td className="py-2.5 px-2 text-center text-slate-400"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Quick Edit School & Branch Modal */}
      {showEditMetaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Okul Adı ve Sınıf Şubesini Düzenle
            </h3>
            <p className="text-xs text-slate-500">
              Burada yapacağınız değişiklikler PDF ve Excel çıktı başlıklarına anında yansır.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Okul Adı (PDF & Excel Çıktısı İçin)
              </label>
              <input
                type="text"
                value={editSchoolName}
                onChange={e => setEditSchoolName(e.target.value)}
                placeholder="Örn: Mehmet Akif Ersoy Ortaokulu"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sınıf / Şube Adı (Örn: 9-A, 6/B)
              </label>
              <input
                type="text"
                value={editBranch}
                onChange={e => setEditBranch(e.target.value)}
                placeholder="Örn: 9-A"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ders Öğretmeni Adı Soyadı (İmza Kutusu İçin)
              </label>
              <input
                type="text"
                value={editTeacher}
                onChange={e => setEditTeacher(e.target.value)}
                placeholder="Örn: Ayşe Yılmaz"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditMetaModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateMetadata) {
                    onUpdateMetadata({
                      schoolName: editSchoolName,
                      branch: editBranch,
                      teacherName: editTeacher,
                    });
                  }
                  setShowEditMetaModal(false);
                }}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs"
              >
                Kaydet ve Güncelle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
