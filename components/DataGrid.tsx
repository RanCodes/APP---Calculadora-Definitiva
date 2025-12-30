
import React, { useState } from 'react';
import { ParsedSheet } from '../types';

interface DataGridProps {
  sheet: ParsedSheet;
}

const DataGrid: React.FC<DataGridProps> = ({ sheet }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 15;

  const filteredData = sheet.data.filter((row) =>
    Object.values(row).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 transition-colors">
      {/* Search Header */}
      <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-6 bg-slate-50/30 dark:bg-slate-950/20">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            Resultados
            <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-full uppercase tracking-[0.2em]">
              {filteredData.length} registros
            </span>
          </h2>
        </div>
        
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Filtrar por SKU, Publicación o Descripción..."
            className="pl-12 pr-6 py-4 w-full text-sm font-bold border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-all shadow-sm"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto scrollbar-hide relative">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr className="bg-slate-50 dark:bg-slate-800">
              {sheet.columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className="px-6 py-5 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap border-b border-slate-100 dark:border-slate-700"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-50 dark:divide-slate-800">
            {currentData.length > 0 ? (
              currentData.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors group">
                  {sheet.columns.map((col, cIdx) => {
                    const value = row[col];
                    const isAlert = col === 'Notas' && String(value) !== 'OK';
                    const isHighlight = col === 'SKU' || col === 'Precio Publicación';
                    
                    return (
                      <td
                        key={`${rIdx}-${cIdx}`}
                        className={`px-6 py-4 text-sm font-bold whitespace-nowrap max-w-[320px] overflow-hidden text-ellipsis transition-colors
                          ${isAlert ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}
                          ${isHighlight ? 'text-slate-900 dark:text-white' : ''}
                        `}
                      >
                        {value !== undefined && value !== null ? String(value) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={sheet.columns.length} className="px-6 py-32 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-30">
                    <svg className="w-16 h-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-slate-400 font-black text-xl uppercase tracking-tighter">No se encontraron coincidencias</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 backdrop-blur-sm flex justify-between items-center">
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
          Mostrando {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredData.length)} de {filteredData.length}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-sm active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-xs font-black text-slate-900 dark:text-white min-w-[100px] text-center uppercase tracking-widest">
            {page} <span className="text-slate-400 mx-1">/</span> {Math.max(1, totalPages)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || totalPages === 0}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-sm active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataGrid;
