import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Table, Sparkles, Check, Info } from 'lucide-react';
import { TopicDistributionFile } from '../types';

interface TopicDistributionTableProps {
  distribution: TopicDistributionFile;
  selectedScenario: string;
  onSelectScenario: (scenario: string) => void;
}

export const TopicDistributionTable: React.FC<TopicDistributionTableProps> = ({
  distribution,
  selectedScenario,
  onSelectScenario,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Group rows by unit
  const groupedRows: { [unit: string]: typeof distribution.rows } = {};
  distribution.rows.forEach(r => {
    if (!groupedRows[r.unit]) groupedRows[r.unit] = [];
    groupedRows[r.unit].push(r);
  });

  // Calculate totals per scenario
  const totals: { [sc: string]: number } = {};
  distribution.scenarios.forEach(sc => {
    totals[sc] = distribution.rows.reduce((sum, r) => sum + (r.scenarioCounts[sc] || 0), 0);
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden mb-6">
      {/* Header with expand/collapse */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
            <Table className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Konu Soru Dağılım Tablosu (MEB Çerçevesi)
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-medium">
                {distribution.rows.length} Öğrenme Çıktısı
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Seçili: <strong className="text-red-700">{selectedScenario}</strong> ({totals[selectedScenario] || 0} Soru)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            {isExpanded ? 'Tabloyu Gizle' : 'Tabloyu Genişlet'}
          </span>
          <button className="text-slate-400 hover:text-slate-600">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div>
          {/* Helper note */}
          <div className="px-5 py-2.5 bg-amber-50/60 border-b border-amber-200/60 flex items-center gap-2 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Aşağıdaki tabloda MEB kazanım ve soru dağılımı yer almaktadır. Sütun başlığından istediğiniz senaryoya tıklayarak hızlıca geçiş yapabilirsiniz.
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-300 shadow-xs">
                <tr>
                  <th className="py-3 px-4 w-44 border-r border-slate-200">Ünite / Tema</th>
                  <th className="py-3 px-4 w-52 border-r border-slate-200">Konu (İçerik Çerçevesi)</th>
                  <th className="py-3 px-4 border-r border-slate-200">Öğrenme Çıktıları (Kazanımlar)</th>
                  {distribution.scenarios.map(sc => {
                    const isSelected = sc === selectedScenario;
                    return (
                      <th
                        key={sc}
                        onClick={() => onSelectScenario(sc)}
                        className={`py-3 px-3 text-center cursor-pointer transition w-24 border-r border-slate-200 ${
                          isSelected
                            ? 'bg-red-600 text-white font-extrabold shadow-sm'
                            : 'hover:bg-slate-200/80 text-slate-700'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{sc}</span>
                          <span className={`text-[10px] font-semibold mt-0.5 ${
                            isSelected ? 'text-red-100' : 'text-slate-500'
                          }`}>
                            {totals[sc] || 0} Soru
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {Object.entries(groupedRows).map(([unitName, rows]) => {
                  return rows.map((row, rowIdx) => {
                    const isFirstInUnit = rowIdx === 0;
                    return (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-slate-50 transition ${
                          (row.scenarioCounts[selectedScenario] || 0) > 0 ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        {isFirstInUnit && (
                          <td
                            rowSpan={rows.length}
                            className="py-3 px-4 font-bold text-slate-800 bg-slate-50/60 align-top border-r border-slate-200 text-xs"
                          >
                            {unitName}
                          </td>
                        )}
                        <td className="py-2.5 px-4 font-medium text-slate-700 border-r border-slate-200 align-top">
                          {row.topic}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 border-r border-slate-200 align-top">
                          <span className="font-mono font-bold text-slate-800 mr-1.5 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                            {row.outcomeCode}
                          </span>
                          <span>{row.outcomeDescription}</span>
                        </td>
                        {distribution.scenarios.map(sc => {
                          const count = row.scenarioCounts[sc] || 0;
                          const isSelected = sc === selectedScenario;
                          return (
                            <td
                              key={sc}
                              onClick={() => onSelectScenario(sc)}
                              className={`py-2.5 px-3 text-center font-bold text-xs border-r border-slate-200 cursor-pointer ${
                                isSelected
                                  ? 'bg-red-50/60 text-red-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              {count > 0 ? (
                                <span className={`inline-block min-w-6 py-0.5 px-1.5 rounded-md font-bold ${
                                  isSelected 
                                    ? 'bg-red-600 text-white shadow-xs' 
                                    : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {count}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-extrabold text-slate-800 border-t-2 border-slate-300 sticky bottom-0">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right border-r border-slate-300">
                    TOPLAM SORU SAYISI:
                  </td>
                  {distribution.scenarios.map(sc => {
                    const isSelected = sc === selectedScenario;
                    return (
                      <td
                        key={sc}
                        className={`py-3 px-3 text-center border-r border-slate-300 ${
                          isSelected ? 'bg-red-600 text-white' : 'text-slate-800'
                        }`}
                      >
                        {totals[sc] || 0}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
