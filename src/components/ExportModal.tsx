import React, { useState } from 'react';
import { 
  Download, 
  Printer, 
  FileSpreadsheet, 
  ClipboardCopy, 
  Check, 
  Share2, 
  FileText,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExamMetadata, QuestionBareme, Student } from '../types';
import { copyForOyss, exportToExcel } from '../utils/exporter';

interface ExportModalProps {
  metadata: ExamMetadata;
  bareme: QuestionBareme[];
  students: Student[];
  onClose?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  metadata,
  bareme,
  students,
}) => {
  const [copied, setCopied] = useState(false);

  const handleExcelExport = () => {
    exportToExcel(metadata, bareme, students);
    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
    } catch (e) {}
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyOyss = async () => {
    const text = copyForOyss(bareme, students);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-700/80 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold mb-2">
            <Share2 className="w-3.5 h-3.5 text-red-400" />
            OYSS & MEB Dışa Aktarma Merkezi
          </div>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Verileri Dışa Aktar ve Resmi Çıktı Al
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Konu soru dağılımı, not baremi ve öğrenci not listesini Excel veya resmi imzalı MEB tutanağı olarak PDF formatında kaydedebilirsiniz.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Excel Button */}
          <button
            onClick={handleExcelExport}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel'e Aktar (.xlsx)
          </button>

          {/* Print / PDF Button */}
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30 transition transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Printer className="w-4 h-4" />
            Yazdır / PDF Olarak Kaydet
          </button>

          {/* Copy for OYSS */}
          <button
            onClick={handleCopyOyss}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600 transition"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Panoya Kopyalandı!</span>
              </>
            ) : (
              <>
                <ClipboardCopy className="w-4 h-4 text-slate-300" />
                <span>OYSS İçin Kopyala</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
