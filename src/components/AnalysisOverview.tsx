import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  AlertCircle, 
  Award, 
  Users,
  Target
} from 'lucide-react';
import { QuestionBareme, Student } from '../types';

interface AnalysisOverviewProps {
  bareme: QuestionBareme[];
  students: Student[];
}

export const AnalysisOverview: React.FC<AnalysisOverviewProps> = ({
  bareme,
  students,
}) => {
  if (students.length === 0) return null;

  // Calculate statistics
  let attendedCount = 0;
  let absentCount = 0;
  let totalScoreSum = 0;
  let maxClassScore = 0;
  let minClassScore = 100;
  let passedCount = 0;

  const validStudentScores: number[] = [];

  students.forEach(s => {
    let sTotal = 0;
    let isAbsent = false;
    let hasScore = false;

    bareme.forEach(q => {
      const v = s.scores[q.questionNumber];
      if (v === 'G' || v === 'g') isAbsent = true;
      if (typeof v === 'number') {
        sTotal += v;
        hasScore = true;
      }
    });

    if (isAbsent) {
      absentCount++;
    } else if (hasScore) {
      attendedCount++;
      totalScoreSum += sTotal;
      validStudentScores.push(sTotal);
      if (sTotal > maxClassScore) maxClassScore = sTotal;
      if (sTotal < minClassScore) minClassScore = sTotal;
      if (sTotal >= 50) passedCount++;
    }
  });

  const classAvg = attendedCount > 0 ? (totalScoreSum / attendedCount).toFixed(1) : '0';
  const passRate = attendedCount > 0 ? Math.round((passedCount / attendedCount) * 100) : 0;
  if (attendedCount === 0) minClassScore = 0;

  // Question-by-question metrics
  const questionStats = bareme.map(q => {
    let sum = 0;
    let count = 0;
    students.forEach(s => {
      const v = s.scores[q.questionNumber];
      if (typeof v === 'number') {
        sum += v;
        count++;
      }
    });
    const avg = count > 0 ? sum / count : 0;
    const rate = q.maxScore > 0 ? Math.round((avg / q.maxScore) * 100) : 0;
    return {
      ...q,
      avgScore: avg.toFixed(1),
      rate,
      count,
    };
  });

  // Find best and lowest performing questions
  const sortedByRate = [...questionStats].filter(q => q.count > 0).sort((a, b) => b.rate - a.rate);
  const bestQuestion = sortedByRate[0];
  const lowestQuestion = sortedByRate[sortedByRate.length - 1];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              4. Adım: Sınav Başarı & Kazanım Analizi (OYSS Raporu)
            </h3>
            <p className="text-xs text-slate-500">
              Soru bazlı başarı oranları ve müfredat kazanım gerçekleşme düzeyleri
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Sınav Ortalaması
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono">
              {classAvg}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">100 üzerinden</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Başarı Oranı
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-mono">
              %{passRate}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">50 puan ve üzeri</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Sınava Giren
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-blue-600 font-mono">
              {attendedCount}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{absentCount > 0 ? `${absentCount} Girmedi` : 'Eksiksiz'}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              En Yüksek Not
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-indigo-600 font-mono">
              {maxClassScore}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Sınıf Zirvesi</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              En Düşük Not
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-amber-600 font-mono">
              {minClassScore}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Taban Puan</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Toplam Öğrenci
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-slate-800 font-mono">
              {students.length}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Kayıtlı Mevcut</span>
          </div>
        </div>

        {/* Highlights: Best Question & Needs Improvement */}
        {bestQuestion && lowestQuestion && bestQuestion !== lowestQuestion && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-emerald-900 block mb-0.5">
                  En Yüksek Başarı: Soru {bestQuestion.questionNumber} (%{bestQuestion.rate})
                </span>
                <p className="text-emerald-800">
                  <strong>{bestQuestion.outcomeCode}</strong> - {bestQuestion.topic}: {bestQuestion.outcomeDescription}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-amber-900 block mb-0.5">
                  Geliştirilmesi Gereken: Soru {lowestQuestion.questionNumber} (%{lowestQuestion.rate})
                </span>
                <p className="text-amber-800">
                  <strong>{lowestQuestion.outcomeCode}</strong> - {lowestQuestion.topic}: {lowestQuestion.outcomeDescription}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Question by Question Progress Bars */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-red-600" />
            Öğrenme Çıktısı (Kazanım) Başarı Düzeyleri
          </h4>

          <div className="space-y-3">
            {questionStats.map(q => (
              <div key={q.questionNumber} className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white bg-red-600 px-2 py-0.5 rounded text-[11px]">
                      Soru {q.questionNumber}
                    </span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                      {q.outcomeCode}
                    </span>
                    <span className="font-medium text-slate-700">
                      {q.topic}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-500 text-[11px]">
                      Ortalama: <strong>{q.avgScore}</strong> / {q.maxScore}P
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                      q.rate >= 70 ? 'bg-emerald-100 text-emerald-800' :
                      q.rate >= 50 ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      %{q.rate}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      q.rate >= 70 ? 'bg-emerald-500' :
                      q.rate >= 50 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(100, q.rate)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
