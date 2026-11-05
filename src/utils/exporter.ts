import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExamMetadata, QuestionBareme, Student } from '../types';
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from './pdfFonts';

/**
 * Returns EXACTLY what the user entered for class / branch (e.g. "9-a", "9-A", "6/B", "A").
 * No prefixes or extra slashes added.
 * If empty, returns "${grade}. Sınıf".
 */
export function formatClassBranch(grade: number, branch?: string): string {
  if (branch && branch.trim()) {
    return branch.trim();
  }
  return `${grade}. Sınıf`;
}

/**
 * Exports complete evaluation matrix to PDF using jsPDF directly (guaranteed file download)
 */
export function exportToPdf(
  meta: ExamMetadata,
  bareme: QuestionBareme[],
  students: Student[]
) {
  // Use landscape if more than 8 questions for perfect legibility
  const isLandscape = bareme.length > 8;
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const classBranch = formatClassBranch(meta.grade, meta.branch);

  // Register Unicode Turkish-supporting Roboto fonts
  doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  doc.setFont('Roboto', 'normal');

  // Official MEB Header
  doc.setFontSize(10);
  doc.setFont('Roboto', 'bold');
  doc.text('T.C. MİLLÎ EĞİTİM BAKANLIĞI', pageWidth / 2, 12, { align: 'center' });

  // School Name (Only show if teacher entered one, otherwise show clean official document title)
  doc.setFontSize(11);
  if (meta.schoolName && meta.schoolName.trim()) {
    doc.text(meta.schoolName.trim().toUpperCase(), pageWidth / 2, 17, { align: 'center' });
  } else {
    doc.text('ORTAK YAZILI SINAV e-OKUL NOT BAREMİ VE NOT ÇİZELGESİ', pageWidth / 2, 17, { align: 'center' });
  }

  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  const title = `${classBranch} ${meta.subject.toUpperCase()} DERSİ e-OKUL NOT GİRİŞ ÇİZELGESİ`;
  doc.text(title, pageWidth / 2, 23, { align: 'center' });

  // Metadata Subheader
  doc.setFontSize(8.5);
  doc.setFont('Roboto', 'bold');
  doc.text(`Sınıf / Şube: ${classBranch}`, 14, 29);
  doc.text(`Soru Sayısı: ${bareme.length} Soru`, pageWidth / 2, 29, { align: 'center' });
  doc.text(`Tarih: ${meta.examDate || new Date().toISOString().split('T')[0]}`, pageWidth - 14, 29, { align: 'right' });

  // Table Data with Turkish headers
  const head = [
    ['#', 'No', 'Adı Soyadı', ...bareme.map(q => `S${q.questionNumber}`), 'Toplam']
  ];

  const body = students.map((s, idx) => {
    let total = 0;
    let isAbsent = false;
    let has = false;

    const scores = bareme.map(q => {
      const v = s.scores[q.questionNumber];
      if (v === 'G' || v === 'g') isAbsent = true;
      if (typeof v === 'number') {
        total += v;
        has = true;
      }
      return v !== undefined && v !== '' ? String(v) : '-';
    });

    const totalText = isAbsent ? 'G' : has ? String(Math.round(total)) : '-';
    return [String(idx + 1), s.studentNumber, s.fullName, ...scores, totalText];
  });

  autoTable(doc, {
    head,
    body,
    startY: 32,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontSize: 8,
      cellPadding: 1.5,
      halign: 'center',
    },
    headStyles: {
      font: 'Roboto',
      fontStyle: 'bold',
      fillColor: [185, 28, 28], // red-700
      textColor: [255, 255, 255],
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 14, fontStyle: 'bold' },
      2: { cellWidth: isLandscape ? 48 : 38, halign: 'left', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      // Signature footer at bottom of last page
      const pageCount = doc.getNumberOfPages();
      if (data.pageNumber === pageCount) {
        const finalY = (data.cursor?.y || 230) + 12;
        if (finalY < doc.internal.pageSize.getHeight() - 25) {
          doc.setFont('Roboto', 'normal');
          doc.setFontSize(8);
          doc.text('Ders Öğretmeni', 30, finalY);
          doc.text(meta.teacherName || 'Öğretmen İmza', 30, finalY + 4);
          doc.text('İmza: .............................', 30, finalY + 12);

          doc.text('Okul Müdürü', pageWidth - 50, finalY);
          doc.text('Mühür ve İmza', pageWidth - 50, finalY + 4);
          doc.text('İmza: .............................', pageWidth - 50, finalY + 12);
        }
      }
    }
  });

  const fileName = `${classBranch}_${meta.subject}_eOkul_Not_Fisi.pdf`.replace(/[\s\/]/g, '_');
  doc.save(fileName);
}

/**
 * Exports complete evaluation matrix and rubric to Excel (.xlsx)
 */
export function exportToExcel(
  meta: ExamMetadata,
  bareme: QuestionBareme[],
  students: Student[]
) {
  const wb = XLSX.utils.book_new();
  const classBranch = formatClassBranch(meta.grade, meta.branch);
  const schoolTitle = meta.schoolName && meta.schoolName.trim()
    ? `T.C. MİLLÎ EĞİTİM BAKANLIĞI - ${meta.schoolName.trim().toUpperCase()}`
    : 'T.C. MİLLÎ EĞİTİM BAKANLIĞI - ORTAK YAZILI SINAV NOT ÇİZELGESİ';

  // 1. Sheet: Soru Bazlı Öğrenci Not Çizelgesi
  const studentRows: any[][] = [
    [schoolTitle],
    [`${meta.academicYear} EĞİTİM ÖĞRETİM YILI - ${formatPeriod(meta.period).toUpperCase()}`],
    [`Ders: ${meta.subject} | Sınıf/Şube: ${classBranch} | Soru Sayısı: ${bareme.length} | Tarih: ${meta.examDate}`],
    [''],
    [
      'Öğrenci No',
      'Adı Soyadı',
      ...bareme.map(q => `Soru ${q.questionNumber}`),
      'Toplam Not',
      'Durum',
    ],
  ];

  students.forEach(std => {
    let totalScore = 0;
    let isAbsent = false;

    const questionScores = bareme.map(q => {
      const val = std.scores[q.questionNumber];
      if (val === 'G' || val === 'g') {
        isAbsent = true;
        return 'G';
      }
      if (typeof val === 'number') {
        totalScore += val;
        return val;
      }
      return '';
    });

    studentRows.push([
      std.studentNumber,
      std.fullName,
      ...questionScores,
      isAbsent ? 'G' : Math.round(totalScore),
      isAbsent ? 'GİRMEDİ' : totalScore >= 50 ? 'BAŞARILI' : 'GELİŞTİRİLMELİ',
    ]);
  });

  // Calculate averages row
  const avgRow = ['ORTALAMA', '', ...bareme.map(q => {
    let sum = 0;
    let count = 0;
    students.forEach(s => {
      const val = s.scores[q.questionNumber];
      if (typeof val === 'number') {
        sum += val;
        count++;
      }
    });
    return count > 0 ? (sum / count).toFixed(1) : '-';
  })];

  const totalSum = students.reduce((acc, s) => {
    let t = 0;
    let has = false;
    bareme.forEach(q => {
      const v = s.scores[q.questionNumber];
      if (typeof v === 'number') {
        t += v;
        has = true;
      }
    });
    return has ? acc + t : acc;
  }, 0);

  const scoredStudents = students.filter(s => Object.values(s.scores).some(v => typeof v === 'number')).length;
  avgRow.push(scoredStudents > 0 ? (totalSum / scoredStudents).toFixed(1) : '-');
  avgRow.push('');
  studentRows.push(avgRow);

  const wsStudents = XLSX.utils.aoa_to_sheet(studentRows);
  XLSX.utils.book_append_sheet(wb, wsStudents, 'e-Okul Not Çizelgesi');

  const excelFileName = `${classBranch}_${meta.subject}_eOkul_Not_Listesi.xlsx`.replace(/[\s\/]/g, '_');
  XLSX.writeFile(wb, excelFileName);
}

/**
 * Copies ONLY the scores (tab-separated per row) matching e-Okul's score input cells!
 * User: "eokul için kopyala seçeneğinde sadece notları kopyalasa daha iyi olur. isimler ve numaralar zaten eokulda var"
 */
export function copyOnlyScoresForEOkul(
  bareme: QuestionBareme[],
  students: Student[]
): string {
  // Each student is one row, each question score separated by tab: S1 \t S2 \t S3 ...
  const rows = students.map(s => {
    return bareme.map(q => {
      const v = s.scores[q.questionNumber];
      if (v === 'G' || v === 'g') return 'G';
      return v !== undefined && v !== '' ? String(v) : '';
    }).join('\t');
  });

  return rows.join('\n');
}

/**
 * Generate full tabular text formatted for OYSS or Excel pasting (with No and Name)
 */
export function copyForOyss(
  bareme: QuestionBareme[],
  students: Student[]
): string {
  const header = ['No', 'Adı Soyadı', ...bareme.map(q => `S${q.questionNumber}`)].join('\t');
  const rows = students.map(s => {
    const scores = bareme.map(q => {
      const v = s.scores[q.questionNumber];
      return v !== undefined && v !== '' ? String(v) : '';
    });
    return [s.studentNumber, s.fullName, ...scores].join('\t');
  });

  return [header, ...rows].join('\n');
}

export function formatPeriod(p: string): string {
  switch (p) {
    case '1_donem_1_yazili': return '1. Dönem 1. Ortak Yazılı Sınav';
    case '1_donem_2_yazili': return '1. Dönem 2. Ortak Yazılı Sınav';
    case '2_donem_1_yazili': return '2. Dönem 1. Ortak Yazılı Sınav';
    case '2_donem_2_yazili': return '2. Dönem 2. Ortak Yazılı Sınav';
    default: return p;
  }
}
