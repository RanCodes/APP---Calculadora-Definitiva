
import React from 'react';
import { ProcessedRow } from '../types';

interface StatCardProps {
  title: string;
  value: number | string;
  subtext: string;
  colorClass: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, colorClass, icon }) => (
  <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex items-start justify-between transition-all hover:translate-y-[-2px] hover:shadow-2xl group">
    <div className="flex-1">
      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{title}</p>
      <h4 className={`text-3xl font-black ${colorClass} tracking-tighter mb-1`}>{value}</h4>
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-tight leading-tight">{subtext}</p>
    </div>
    <div className={`p-4 rounded-2xl ${colorClass.replace('text-', 'bg-').replace('600', '50').replace('500', '50').replace('400', '50')} dark:bg-slate-800 dark:bg-opacity-100 transition-colors group-hover:scale-110`}>
       {icon}
    </div>
  </div>
);

const StatsDashboard: React.FC<{ results: ProcessedRow[] }> = ({ results }) => {
  if (!results || results.length === 0) return null;

  const total = results.length;
  const notSynced = results.filter(r => r['Notas'].includes('SKU no encontrado')).length;
  const synced = total - notSynced;
  const priceChanged = results.filter(r => Math.abs((r['Precio Publicación'] as number) - (r['Precio Anterior ML'] as number)) > 5).length;
  const stockChanged = results.filter(r => (r['Stock Publicado'] as number) !== (r['Stock Anterior ML'] as number)).length;
  const warnings = results.filter(r => r['Notas'] !== 'OK').length;

  return (
    <div className="h-full flex flex-col space-y-5 pr-1">
      <StatCard 
          title="Analizados" 
          value={total} 
          subtext="Total procesado"
          colorClass="text-blue-600 dark:text-blue-400"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
      />

      <StatCard 
          title="Sincronizados" 
          value={synced} 
          subtext="Cruces exitosos"
          colorClass="text-emerald-600 dark:text-emerald-400"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
      />

      <StatCard 
          title="Sin Odoo" 
          value={notSynced} 
          subtext="SKU sin catálogo"
          colorClass="text-rose-600 dark:text-rose-400"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
      />

      <StatCard 
          title="Cambios de Precio" 
          value={priceChanged} 
          subtext="Requieren actualización"
          colorClass="text-indigo-600 dark:text-indigo-400"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      />

      <StatCard 
          title="Ajustes de Stock" 
          value={stockChanged} 
          subtext="Diferencia ML / Odoo"
          colorClass="text-amber-600 dark:text-amber-400"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
      />

      <StatCard 
          title="Alertas" 
          value={warnings} 
          subtext="Ver columna Notas"
          colorClass="text-slate-600 dark:text-slate-300"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      />
    </div>
  );
};

export default StatsDashboard;
