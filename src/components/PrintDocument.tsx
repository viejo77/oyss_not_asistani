import React from 'react';
import { ExamMetadata, QuestionBareme, Student } from '../types';
import { formatPeriod, formatClassBranch } from '../utils/exporter';

interface PrintDocumentProps {
  metadata: ExamMetadata;
  bareme: QuestionBareme[];
  students: Student[];
}

export const PrintDocument: React.FC<PrintDocumentProps> = ({
  metadata,
  bareme,
  students,
}) => {
  const classBranch = formatClassBranch(metadata.grade, metadata.branch);

  return (
    <div id="print-area" className="hidden print:block bg-white text-black p-8 font-serif max-w-[210mm] mx-auto">
      {/* Official MEB Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-base font-bold uppercase tracking-wider">
          T.C. MİLLÎ EĞİTİM BAKANLIĞI
        </h1>
        {metadata.schoolName && metadata.schoolName.trim() ? (
          <h2 className="text-lg font-bold uppercase tracking-wider">
            {metadata.schoolName.trim().toUpperCase()}
          </h2>
        ) : (
          <h2 className="text-base font-bold uppercase tracking-wider text-slate-800">
            ORTAK YAZILI SINAV NOT BAREMİ VE NOT GİRİŞ ÇİZELGESİ
          </h2>
        )}
        <h3 className="text-sm font-semibold uppercase mt-1">
          {metadata.academicYear} EĞİTİM VE ÖĞRETİM YILI {formatPeriod(metadata.period).toUpperCase()}
        </h3>
        <h4 className="text-base font-extrabold uppercase mt-1 underline">
          {classBranch} {metadata.subject.toUpperCase()} DERSİ ({metadata.scenarioName.toUpperCase()})
          <br />
          KONU SORU DAĞILIMI, NOT BAREMİ VE DEĞERLENDİRME ÖLÇEĞİ
        </h4>
      </div>

      {/* Metadata Info Box */}
      <div className="grid grid-cols-2 text-xs mb-4 border border-black p-3 gap-2">
        <div>
          <div><strong>Ders:</strong> {metadata.subject}</div>
          <div><strong>Sınıf / Şube:</strong> {classBranch}</div>
          <div><strong>Senaryo:</strong> {metadata.scenarioName}</div>
        </div>
        <div className="text-right">
          <div><strong>Sınav Tarihi:</strong> {metadata.examDate}</div>
          <div><strong>Ders Öğretmeni:</strong> {metadata.teacherName}</div>
          <div><strong>Toplam Soru / Puan:</strong> {bareme.length} Soru / {bareme.reduce((s, q) => s + q.maxScore, 0)} Puan</div>
        </div>
      </div>

      {/* 1. NOT BAREMİ VE CEVAP ANAHTARI TABLOSU */}
      <div className="mb-6">
        <h5 className="text-xs font-bold uppercase mb-2">
          1. SORU BAZLI KONU DAĞILIMI VE DEĞERLENDİRME BAREMİ
        </h5>
        <table className="w-full text-[11px] border-collapse border border-black text-left">
          <thead>
            <tr className="bg-gray-100 font-bold border-b border-black">
              <th className="border border-black p-1.5 w-14 text-center">Soru No</th>
              <th className="border border-black p-1.5 w-32">Ünite / Tema</th>
              <th className="border border-black p-1.5 w-36">Konu</th>
              <th className="border border-black p-1.5">Öğrenme Çıktısı (Kazanım)</th>
              <th className="border border-black p-1.5 w-16 text-center">Puan</th>
              <th className="border border-black p-1.5 w-44">Değerlendirme Kriteri</th>
            </tr>
          </thead>
          <tbody>
            {bareme.map(q => (
              <tr key={q.questionNumber} className="border-b border-black">
                <td className="border border-black p-1 text-center font-bold">
                  Soru {q.questionNumber}
                </td>
                <td className="border border-black p-1">{q.unit}</td>
                <td className="border border-black p-1">{q.topic}</td>
                <td className="border border-black p-1">
                  <strong>{q.outcomeCode}:</strong> {q.outcomeDescription}
                </td>
                <td className="border border-black p-1 text-center font-bold">
                  {q.maxScore}P
                </td>
                <td className="border border-black p-1 text-[10px]">
                  {q.criteria || 'Doğru işlem ve sonuç'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2. ÖĞRENCİ NOT GİRİŞ LİSTESİ (Varsa) */}
      {students.length > 0 && (
        <div className="mb-6 page-break-inside-avoid">
          <h5 className="text-xs font-bold uppercase mb-2">
            2. ÖĞRENCİ SORU BAZLI NOT ÇİZELGESİ
          </h5>
          <table className="w-full text-[10px] border-collapse border border-black text-left">
            <thead>
              <tr className="bg-gray-100 font-bold border-b border-black">
                <th className="border border-black p-1 w-8 text-center">#</th>
                <th className="border border-black p-1 w-14 text-center">No</th>
                <th className="border border-black p-1">Adı Soyadı</th>
                {bareme.map(q => (
                  <th key={q.questionNumber} className="border border-black p-1 text-center w-10">
                    S{q.questionNumber} ({q.maxScore}P)
                  </th>
                ))}
                <th className="border border-black p-1 text-center w-14 font-extrabold">
                  Toplam
                </th>
                <th className="border border-black p-1 text-center w-16">
                  Sonuç
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                let total = 0;
                let isAbsent = false;
                let has = false;

                bareme.forEach(q => {
                  const val = s.scores[q.questionNumber];
                  if (val === 'G' || val === 'g') isAbsent = true;
                  if (typeof val === 'number') {
                    total += val;
                    has = true;
                  }
                });

                return (
                  <tr key={s.id} className="border-b border-black">
                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                    <td className="border border-black p-1 text-center font-bold">{s.studentNumber}</td>
                    <td className="border border-black p-1 font-medium">{s.fullName}</td>
                    {bareme.map(q => {
                      const v = s.scores[q.questionNumber];
                      return (
                        <td key={q.questionNumber} className="border border-black p-1 text-center font-mono">
                          {v !== undefined && v !== '' ? String(v) : '-'}
                        </td>
                      );
                    })}
                    <td className="border border-black p-1 text-center font-bold font-mono">
                      {isAbsent ? 'G' : has ? Math.round(total) : '-'}
                    </td>
                    <td className="border border-black p-1 text-center text-[9px] uppercase">
                      {isAbsent ? 'GİRMEDİ' : has ? (total >= 50 ? 'BAŞARILI' : 'GELİŞTİRİLMELİ') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Signature & Stamp Section */}
      <div className="mt-8 pt-4 border-t border-black grid grid-cols-2 text-center text-xs page-break-inside-avoid">
        <div>
          <p className="font-bold">Düzenleyen</p>
          <p className="mt-1">{metadata.teacherName || 'Ders Öğretmeni'}</p>
          <p className="text-[10px] text-gray-500">{metadata.subject} Öğretmeni</p>
          <div className="mt-12 text-[10px]">İmza: .......................................</div>
        </div>

        <div>
          <p className="font-bold">UYGUNDUR</p>
          <p className="mt-1">Okul Müdürü</p>
          <p className="text-[10px] text-gray-500">Mühür ve İmza</p>
          <div className="mt-12 text-[10px]">İmza: .......................................</div>
        </div>
      </div>
    </div>
  );
};
