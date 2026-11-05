import React from 'react';
import { 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  RotateCcw, 
  ListOrdered,
  BookOpen,
  Edit3
} from 'lucide-react';
import { QuestionBareme } from '../types';

interface RubricEditorProps {
  bareme: QuestionBareme[];
  onUpdateBareme: (updated: QuestionBareme[]) => void;
  scenarioName: string;
}

export const RubricEditor: React.FC<RubricEditorProps> = ({
  bareme,
  onUpdateBareme,
  scenarioName,
}) => {
  const totalPoints = bareme.reduce((sum, q) => sum + (q.maxScore || 0), 0);

  const handleScoreChange = (index: number, newScore: number) => {
    const updated = [...bareme];
    updated[index] = { ...updated[index], maxScore: Math.max(0, newScore) };
    onUpdateBareme(updated);
  };

  const handleCriteriaChange = (index: number, newCriteria: string) => {
    const updated = [...bareme];
    updated[index] = { ...updated[index], criteria: newCriteria };
    onUpdateBareme(updated);
  };

  const handleDistributeEqually = () => {
    if (bareme.length === 0) return;
    const count = bareme.length;
    const base = Math.floor(100 / count);
    const remainder = 100 % count;

    const updated = bareme.map((q, idx) => ({
      ...q,
      maxScore: base + (idx < remainder ? 1 : 0),
    }));

    onUpdateBareme(updated);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-6">
      {/* Step Header */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              2. Adım: Soru Bazlı Not Baremi & Puanlama Ölçütleri
            </h3>
            <p className="text-xs text-slate-500">
              {scenarioName} kapsamında toplam <strong className="text-slate-800">{bareme.length} soru</strong> oluşturuldu.
            </p>
          </div>
        </div>

        {/* Total Points Status and Quick Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDistributeEqually}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition shadow-xs"
            title="Tüm sorulara toplam 100 puan olacak şekilde eşit dağıt"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            100 Puana Eşit Dağıt
          </button>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
            totalPoints === 100
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}>
            {totalPoints === 100 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Toplam: 100 / 100 Puan (Tam)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Toplam: {totalPoints} / 100 Puan ({100 - totalPoints > 0 ? `${100 - totalPoints}p eksik` : `${totalPoints - 100}p fazla`})</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Questions Rubric List */}
      <div className="p-5 divide-y divide-slate-100">
        {bareme.map((q, idx) => (
          <div key={q.questionNumber} className="py-4 first:pt-1 last:pb-1">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              {/* Question Meta */}
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-red-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                    S{q.questionNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {q.outcomeCode}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 bg-amber-50 text-amber-900 border border-amber-200/60 px-2 py-0.5 rounded">
                    {q.topic}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({q.unit})
                  </span>
                </div>

                <p className="text-xs text-slate-600 pl-0.5 leading-relaxed">
                  {q.outcomeDescription}
                </p>

                {/* Rubrik / Değerlendirme Kriteri Input */}
                <div className="pt-1.5">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    Puanlama Basamakları / Barem Açıklaması:
                  </label>
                  <input
                    type="text"
                    value={q.criteria || ''}
                    onChange={e => handleCriteriaChange(idx, e.target.value)}
                    placeholder="Örn: 1. Adım doğru kurgu: 5p, 2. Adım işlem ve sonuç: 5p"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Score Input */}
              <div className="flex items-center gap-3 shrink-0 self-start md:self-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="text-right">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase">
                    Soru Puanı
                  </label>
                  <span className="text-[10px] text-slate-400">En Fazla</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={q.maxScore}
                    onChange={e => handleScoreChange(idx, parseInt(e.target.value, 10) || 0)}
                    className="w-20 text-center font-bold text-base text-slate-900 bg-white border border-slate-300 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <span className="absolute right-2 top-2 text-xs font-semibold text-slate-400 pointer-events-none">
                    P
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
