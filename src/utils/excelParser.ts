import * as XLSX from 'xlsx';
import { DistributionRow, SchoolLevel, Student, TopicDistributionFile } from '../types';

/**
 * Robustly parses a MEB Question Distribution Excel sheet.
 */
export async function parseTopicDistributionExcel(file: File): Promise<TopicDistributionFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Use first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to 2D array of strings/numbers
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rawData.length < 3) {
    throw new Error('Yüklenen Excel dosyasında yeterli veri satırı bulunamadı.');
  }

  // Look for title in first 5 rows
  let title = file.name.replace(/\.[^/.]+$/, '');
  for (let r = 0; r < Math.min(5, rawData.length); r++) {
    const rowStr = rawData[r].map(c => String(c).trim()).filter(Boolean).join(' ');
    if (rowStr.toLowerCase().includes('konu soru') || rowStr.toLowerCase().includes('ortak yazılı') || rowStr.toLowerCase().includes('dağılım')) {
      title = rowStr;
      break;
    }
  }

  // Detect grade & level from title
  let grade = 6;
  let level: SchoolLevel = 'ortaokul';
  const titleLower = title.toLowerCase();
  for (let g = 5; g <= 12; g++) {
    if (titleLower.includes(`${g}.sınıf`) || titleLower.includes(`${g}. sınıf`) || titleLower.includes(`${g} .sınıf`)) {
      grade = g;
      level = g >= 9 ? 'lise' : 'ortaokul';
      break;
    }
  }

  // Find the header row containing "Senaryo" or "Öğrenme"
  let headerRowIndex = -1;
  let unitCol = -1;
  let topicCol = -1;
  let outcomeCol = -1;
  const scenarioCols: { name: string; colIndex: number }[] = [];

  for (let r = 0; r < Math.min(15, rawData.length); r++) {
    const row = rawData[r];
    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c]).trim().toLowerCase();
      if (cellVal.includes('ünite') || cellVal.includes('tema')) {
        if (unitCol === -1) unitCol = c;
      }
      if (cellVal.includes('konu') || cellVal.includes('içerik')) {
        if (topicCol === -1) topicCol = c;
      }
      if (cellVal.includes('öğrenme') || cellVal.includes('kazanım') || cellVal.includes('çıktı')) {
        if (outcomeCol === -1) outcomeCol = c;
      }
      if (cellVal.includes('senaryo')) {
        headerRowIndex = r;
        const sName = String(row[c]).trim().replace(/\r?\n|\r/g, ' ');
        if (!scenarioCols.some(sc => sc.colIndex === c)) {
          scenarioCols.push({ name: sName, colIndex: c });
        }
      }
    }
    if (scenarioCols.length > 0) {
      headerRowIndex = r;
      break;
    }
  }

  // Fallback defaults if columns weren't cleanly titled
  if (unitCol === -1) unitCol = 0;
  if (topicCol === -1) topicCol = 1;
  if (outcomeCol === -1) outcomeCol = 2;

  // If no scenario found in header row, search column headers or next row
  if (scenarioCols.length === 0) {
    for (let r = 0; r < Math.min(12, rawData.length); r++) {
      const row = rawData[r];
      for (let c = 3; c < row.length; c++) {
        const text = String(row[c]).trim();
        if (/senaryo\s*\d+/i.test(text) || /^\d+\.\s*senaryo/i.test(text)) {
          scenarioCols.push({ name: text, colIndex: c });
        }
      }
      if (scenarioCols.length > 0) {
        headerRowIndex = r;
        break;
      }
    }
  }

  // If still no scenario columns found, check columns starting from 3 onwards
  if (scenarioCols.length === 0) {
    // Generate default Senaryo 1..5 for columns 3..7
    for (let i = 1; i <= 5; i++) {
      scenarioCols.push({ name: `Senaryo ${i}`, colIndex: 2 + i });
    }
    headerRowIndex = 4;
  }

  const rows: DistributionRow[] = [];
  let currentUnit = '';

  const startRow = (headerRowIndex !== -1 ? headerRowIndex : 3) + 1;

  for (let r = startRow; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || row.length === 0) continue;

    const rawUnit = String(row[unitCol] || '').trim();
    if (rawUnit) {
      currentUnit = rawUnit;
    }

    const topic = String(row[topicCol] || '').trim();
    const rawOutcome = String(row[outcomeCol] || '').trim();

    // Skip empty or summary rows
    if (!topic && !rawOutcome) continue;
    if (rawOutcome.toLowerCase().includes('toplam') || topic.toLowerCase().includes('toplam')) continue;

    // Split outcome code if it has format like "MAT.6.1.5. Gerçek yaşam..."
    let outcomeCode = '';
    let outcomeDescription = rawOutcome;

    const codeMatch = rawOutcome.match(/^([A-Za-z0-9\.\-]+)[\.\:\s]+(.+)/);
    if (codeMatch && codeMatch[1].length <= 15) {
      outcomeCode = codeMatch[1].replace(/\.$/, '');
      outcomeDescription = codeMatch[2].trim();
    } else {
      outcomeCode = `K.${rows.length + 1}`;
      outcomeDescription = rawOutcome || topic;
    }

    const scenarioCounts: { [key: string]: number } = {};
    let hasAnyCount = false;

    scenarioCols.forEach(sc => {
      const cellVal = row[sc.colIndex];
      const count = parseInt(String(cellVal).trim(), 10);
      const safeCount = isNaN(count) ? 0 : count;
      scenarioCounts[sc.name] = safeCount;
      if (safeCount > 0) hasAnyCount = true;
    });

    // Even if row has 0 for current scenarios, it's still part of the curriculum table
    rows.push({
      id: `row-${r}-${Date.now()}`,
      unit: currentUnit || 'Genel',
      topic: topic || currentUnit,
      outcomeCode,
      outcomeDescription,
      scenarioCounts,
    });
  }

  return {
    id: `dist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    level,
    grade,
    subject: title.includes('Matematik') ? 'Matematik' : (title.includes('Türkçe') ? 'Türkçe' : 'Ortak Sınav Dersi'),
    period: '1_donem_2_yazili',
    scenarios: scenarioCols.map(s => s.name),
    rows,
  };
}

/**
 * Parses an Excel or CSV file containing a student roster (No, Ad Soyad).
 */
export async function parseStudentListExcel(file: File): Promise<Student[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

  const students: Student[] = [];
  let noCol = -1;
  let nameCol = -1;

  // Scan headers
  for (let r = 0; r < Math.min(10, rawData.length); r++) {
    const row = rawData[r];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c]).toLowerCase().trim();
      if (val.includes('no') || val.includes('numara') || val.includes('öğrenci no')) {
        noCol = c;
      }
      if (val.includes('ad') || val.includes('isim') || val.includes('soyad') || val.includes('öğrenci')) {
        nameCol = c;
      }
    }
    if (noCol !== -1 && nameCol !== -1) break;
  }

  // Fallbacks
  if (noCol === -1) noCol = 0;
  if (nameCol === -1) nameCol = 1;

  for (let r = 0; r < rawData.length; r++) {
    const row = rawData[r];
    const noVal = String(row[noCol] || '').trim();
    const nameVal = String(row[nameCol] || '').trim();

    // Skip headers
    if (!noVal || !nameVal || noVal.toLowerCase().includes('no') || nameVal.toLowerCase().includes('ad')) {
      continue;
    }

    students.push({
      id: `student-${Date.now()}-${r}`,
      studentNumber: noVal,
      fullName: nameVal,
      scores: {},
    });
  }

  return students;
}

/**
 * Downloads a sample MEB Excel template matching the official format in the uploaded image.
 */
export function downloadSampleMEBExcel(dist: TopicDistributionFile) {
  const wb = XLSX.utils.book_new();

  // Create table header matching MEB structure
  const headerData: any[][] = [
    [dist.title.toUpperCase()],
    [''],
    ['Ünite/Tema', 'Konu (İçerik Çerçevesi)', 'Öğrenme Çıktıları', ...dist.scenarios],
  ];

  dist.rows.forEach(row => {
    const rowData = [
      row.unit,
      row.topic,
      `${row.outcomeCode}. ${row.outcomeDescription}`,
      ...dist.scenarios.map(sc => row.scenarioCounts[sc] || ''),
    ];
    headerData.push(rowData);
  });

  const ws = XLSX.utils.aoa_to_sheet(headerData);

  // Column widths
  ws['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 55 },
    ...dist.scenarios.map(() => ({ wch: 12 })),
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Konu Soru Dağılımı');
  XLSX.writeFile(wb, `${dist.grade}_sinif_${dist.subject.toLowerCase()}_konu_soru_dagilim_tablosu.xlsx`);
}
