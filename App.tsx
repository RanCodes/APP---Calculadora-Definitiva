
import React, { useState, useEffect, useRef } from 'react';
import { parseExcelFile, processFiles, downloadExcel } from './services/excelService';
import { fetchLogistics, fetchLogo, uploadLogo, deleteLogo } from './services/persistenceService';
import { ParsedSheet, AnalysisStatus, CalculatorConfig, ProcessedRow, WeightEntry, ShippingRate } from './types';
import FileUpload from './components/FileUpload';
import DataGrid from './components/DataGrid';
import StatsDashboard from './components/StatsDashboard';
import WeightManager from './components/WeightManager';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calc' | 'logistics'>('calc');
  
  // Siempre por determinado en MODO OSCURO
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme_preference');
    return saved ? saved === 'dark' : true; 
  });

  const [logo, setLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isLogoUpdating, setIsLogoUpdating] = useState(false);
  const [isLogoLoading, setIsLogoLoading] = useState(false);
  const logoObjectUrlRef = useRef<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  // Base de Pesos y Escalas con persistencia
  const [weights, setWeights] = useState<WeightEntry[]>([]);

  const [rates, setRates] = useState<ShippingRate[]>([]);

  const [logisticsError, setLogisticsError] = useState<string | null>(null);
  const [logisticsLoading, setLogisticsLoading] = useState<boolean>(true);

  useEffect(() => {
    localStorage.setItem('theme_preference', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const loadLogistics = async () => {
    setLogisticsLoading(true);
    try {
      const data = await fetchLogistics();
      setWeights(data.weights || []);
      setRates(data.rates || []);
      setLogisticsError(null);
    } catch (error: any) {
      setLogisticsError(error.message || 'No se pudo cargar la logística');
    } finally {
      setLogisticsLoading(false);
    }
  };

  const refreshLogo = async () => {
    setIsLogoLoading(true);
    try {
      const url = await fetchLogo();
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
      }
      logoObjectUrlRef.current = url;
      setLogo(url);
      setLogoError(null);
    } catch (error: any) {
      setLogoError(error.message || 'No se pudo cargar el logo');
      setLogo(null);
    } finally {
      setIsLogoLoading(false);
    }
  };

  useEffect(() => {
    loadLogistics();
    refreshLogo();

    return () => {
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current);
      }
    };
  }, []);

  const [mlSheet, setMlSheet] = useState<ParsedSheet | null>(null);
  const [odooSheet, setOdooSheet] = useState<ParsedSheet | null>(null);
  const [mlFileName, setMlFileName] = useState<string | null>(null);
  const [odooFileName, setOdooFileName] = useState<string | null>(null);

  const [config, setConfig] = useState<CalculatorConfig>({
    stockPercentage: 100,
    retentionsPct: 1,
    includeTaxes: true,
    shippingSurchargeAmount: 0,
    shippingSurchargeType: 'fixed',
    useWeightTable: false
  });

  const [results, setResults] = useState<ProcessedRow[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resultSheet: ParsedSheet | null = results.length > 0 ? {
    name: 'Resultados Calculados',
    data: results,
    columns: Object.keys(results[0])
  } : null;

  const handleMlUpload = async (file: File) => {
    try {
      const parsed = await parseExcelFile(file);
      const validSheet = parsed.find(s => s.columns.includes('ITEM_ID') || s.columns.includes('SKU'));
      if (validSheet) {
        setMlSheet(validSheet);
        setMlFileName(file.name);
      } else {
        throw new Error("El archivo no parece ser de Mercado Libre.");
      }
    } catch (e: any) { setErrorMessage(e.message); }
  };

  const handleOdooUpload = async (file: File) => {
    try {
      const parsed = await parseExcelFile(file);
      const validSheet = parsed.find(s => s.columns.includes('Código Neored') || s.columns.includes('Referencia interna'));
      if (validSheet) {
        setOdooSheet(validSheet);
        setOdooFileName(file.name);
      } else {
        throw new Error("El archivo no parece ser de Odoo.");
      }
    } catch (e: any) { setErrorMessage(e.message); }
  };

  const handleCalculate = () => {
    if (!mlSheet || !odooSheet) {
      setErrorMessage("Por favor carga ambos archivos.");
      return;
    }
    setStatus(AnalysisStatus.PARSING);
    setTimeout(() => {
        try {
            const calculatedData = processFiles(mlSheet, odooSheet, config, weights, rates);
            setResults(calculatedData);
            setStatus(AnalysisStatus.READY);
            setErrorMessage(null);
        } catch (e: any) {
            setErrorMessage("Error: " + e.message);
            setStatus(AnalysisStatus.ERROR);
        }
    }, 100);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLogoUpdating(true);
    try {
      await uploadLogo(file);
      await refreshLogo();
    } catch (error: any) {
      setLogoError(error.message || 'No se pudo guardar el logo');
    } finally {
      setIsLogoUpdating(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleLogoDelete = async () => {
    setIsLogoUpdating(true);
    try {
      await deleteLogo();
      await refreshLogo();
    } catch (error: any) {
      setLogoError(error.message || 'No se pudo eliminar el logo');
    } finally {
      setIsLogoUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-500">
      <nav className="bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-xl shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-10">
              {/* Brand Area */}
              <div
                className={`flex items-center gap-4 cursor-pointer group ${isLogoUpdating ? 'opacity-70' : ''}`}
                onClick={() => logoInputRef.current?.click()}
              >
                <div className="relative">
                  {logo ? (
                    <img src={logo} alt="JUMA Logo" className="w-12 h-12 rounded-xl object-contain shadow-md border border-slate-200 dark:border-slate-700 bg-white" />
                  ) : isLogoLoading ? (
                    <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                  )}
                  {(isLogoLoading || isLogoUpdating) && (
                    <div className="absolute inset-0 bg-black/10 dark:bg-black/30 rounded-xl flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </div>
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">JUMA Electric</span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-[0.2em] uppercase leading-none">PROD. ELECTRICOS</span>
                  {logoError && <span className="text-[10px] font-bold text-amber-500">{logoError}</span>}
                </div>
                {logo && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLogoDelete(); }}
                    disabled={isLogoUpdating}
                    className="text-[10px] font-black bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                  >
                    Eliminar
                  </button>
                )}
              </div>
              
              {/* Tabs */}
              <div className="flex h-20 items-center gap-2">
                <button 
                  onClick={() => setActiveTab('calc')}
                  className={`px-6 h-12 rounded-2xl transition-all text-sm font-black uppercase tracking-widest flex items-center gap-2 ${activeTab === 'calc' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  Calculadora
                </button>
                <button 
                  onClick={() => setActiveTab('logistics')}
                  className={`px-6 h-12 rounded-2xl transition-all text-sm font-black uppercase tracking-widest flex items-center gap-2 ${activeTab === 'logistics' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  Logística
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
                 <button 
                    onClick={() => setDarkMode(!darkMode)} 
                    className="w-12 h-12 flex items-center justify-center text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 shadow-sm"
                  >
                    {darkMode ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                 </button>
                 {status === AnalysisStatus.READY && (
                    <button onClick={() => downloadExcel(results, `Sincro_JUMA_${new Date().toISOString().split('T')[0]}.xlsx`)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-12 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-lg shadow-emerald-600/20 active:scale-95">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar
                    </button>
                 )}
            </div>
          </div>
        </div>
      </nav>

      {(logisticsLoading || logisticsError || logoError) && (
        <div className="max-w-[1800px] w-full mx-auto px-6 pt-4 space-y-3">
          {logisticsLoading && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-2xl text-sm font-bold">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Sincronizando base logística...
            </div>
          )}
          {logisticsError && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm font-bold">
              <span>{logisticsError}</span>
              <button onClick={loadLogistics} className="px-3 py-2 bg-rose-600 text-white rounded-xl text-[10px] uppercase tracking-[0.2em]">Reintentar</button>
            </div>
          )}
          {logoError && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-2xl text-sm font-bold">
              <span>{logoError}</span>
              <button onClick={refreshLogo} className="px-3 py-2 bg-amber-500 text-white rounded-xl text-[10px] uppercase tracking-[0.2em]">Reintentar</button>
            </div>
          )}
        </div>
      )}

      <main className="flex-1 max-w-[1800px] w-full mx-auto px-6 py-10 overflow-hidden">
        {activeTab === 'calc' ? (
          <div className="flex flex-col lg:flex-row gap-10 h-full">
            <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                       <div className="w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black">01</div>
                       Carga de Archivos
                    </h3>
                    <div className="flex flex-col gap-5">
                        <FileUpload label="Catálogo ML" onFileSelect={handleMlUpload} fileName={mlFileName} />
                        <FileUpload label="Reporte Odoo" onFileSelect={handleOdooUpload} fileName={odooFileName} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800">
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                       <div className="w-6 h-6 bg-amber-500 text-white rounded-lg flex items-center justify-center text-[10px] font-black">02</div>
                       Parámetros de Cálculo
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2.5 ml-1">Stock a Publicar %</label>
                            <input type="number" value={config.stockPercentage} onChange={e => setConfig({...config, stockPercentage: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-2.5 ml-1">Retenciones Est. %</label>
                            <input type="number" value={config.retentionsPct} onChange={e => setConfig({...config, retentionsPct: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner" />
                        </div>
                        
                        <div className="space-y-3 pt-2">
                          <label className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl transition-all border ${config.includeTaxes ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800'}`}>
                             <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${config.includeTaxes ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                                {config.includeTaxes && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                             </div>
                             <input type="checkbox" checked={config.includeTaxes} onChange={e => setConfig({...config, includeTaxes: e.target.checked})} className="hidden" />
                             <span className={`text-xs font-black uppercase tracking-widest ${config.includeTaxes ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>Incluir IVA (Odoo)</span>
                          </label>

                          <label className={`flex items-center gap-4 cursor-pointer p-4 rounded-2xl transition-all border ${config.useWeightTable ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-800'}`}>
                             <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${config.useWeightTable ? 'bg-amber-500 border-amber-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                {config.useWeightTable && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                             </div>
                             <input type="checkbox" checked={config.useWeightTable} onChange={e => setConfig({...config, useWeightTable: e.target.checked})} className="hidden" />
                             <span className={`text-xs font-black uppercase tracking-widest ${config.useWeightTable ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>Usar Logística de Pesos</span>
                          </label>
                        </div>

                        {!config.useWeightTable && (
                          <div className="pt-2 animate-fade-in bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-3 ml-1">Recargo Envío Manual</label>
                              <div className="flex gap-3">
                                  <select className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs px-4 font-black text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500" value={config.shippingSurchargeType} onChange={e => setConfig({...config, shippingSurchargeType: e.target.value as any})}>
                                      <option value="fixed">AR$</option>
                                      <option value="percent">%</option>
                                  </select>
                                  <input type="number" value={config.shippingSurchargeAmount} onChange={e => setConfig({...config, shippingSurchargeAmount: parseFloat(e.target.value) || 0})} className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                          </div>
                        )}
                    </div>
                    <button onClick={handleCalculate} disabled={!mlSheet || !odooSheet} className="w-full mt-10 bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-black py-5 rounded-[1.5rem] shadow-2xl transition-all active:scale-[0.98] transform uppercase tracking-[0.2em] text-xs">
                        Ejecutar Sincronización
                    </button>
                </div>
            </div>

            <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                {status === AnalysisStatus.READY && resultSheet ? <DataGrid sheet={resultSheet} /> : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 p-20 text-center space-y-8 animate-pulse">
                        <div className="p-12 bg-slate-50 dark:bg-slate-950 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-center">
                           <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="max-w-md">
                          <p className="font-black text-2xl text-slate-400 dark:text-slate-500 uppercase tracking-tighter mb-2">Panel de Resultados</p>
                          <p className="text-sm font-medium text-slate-400 dark:text-slate-600">Sube tus archivos para generar la comparativa de stock y actualización masiva de precios para Mercado Libre.</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
               <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
                 Métricas de Sesión
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
               </h3>
               {status === AnalysisStatus.READY ? <StatsDashboard results={results} /> : (
                 <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">Sin datos</span>
                 </div>
               )}
            </div>
          </div>
        ) : (
          <WeightManager 
            weights={weights} 
            onWeightsChange={setWeights} 
            rates={rates} 
            onRatesChange={setRates} 
          />
        )}
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default App;
