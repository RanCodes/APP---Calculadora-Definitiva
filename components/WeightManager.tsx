
import React, { useState, useRef } from 'react';
import { WeightEntry, ShippingRate } from '../types';
import { parseExcelFile, downloadLogisticsBackup } from '../services/excelService';

interface WeightManagerProps {
  weights: WeightEntry[];
  onWeightsChange: (newWeights: WeightEntry[]) => void;
  rates: ShippingRate[];
  onRatesChange: (newRates: ShippingRate[]) => void;
}

const WeightManager: React.FC<WeightManagerProps> = ({ weights, onWeightsChange, rates, onRatesChange }) => {
  const [sku, setSku] = useState('');
  const [product, setProduct] = useState('');
  const [weight, setWeight] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  
  const [maxW, setMaxW] = useState('');
  const [cost, setCost] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const addWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !weight) return;
    
    const newWeights = [...weights];
    const index = newWeights.findIndex(w => w.sku === (editingSku || sku));
    const entry: WeightEntry = { 
      sku, 
      product: product || "", 
      weight: parseFloat(weight), 
      updatedAt: new Date().toISOString() 
    };

    if (index >= 0) {
      newWeights[index] = entry;
    } else {
      newWeights.push(entry);
    }
    
    onWeightsChange(newWeights);
    resetForm();
  };

  const resetForm = () => {
    setSku('');
    setProduct('');
    setWeight('');
    setEditingSku(null);
  };

  const startEditing = (item: WeightEntry) => {
    setSku(item.sku);
    setProduct(item.product || '');
    setWeight(item.weight.toString());
    setEditingSku(item.sku);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const findColumnByKeywords = (columns: string[], keywords: string[]) => {
    return columns.find(col => {
      const lower = col.toLowerCase();
      return keywords.some(k => lower.includes(k));
    });
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const sheets = await parseExcelFile(file);
      const activeSheet = sheets[0];
      const data = activeSheet.data;
      const columns = activeSheet.columns;

      const skuCol = findColumnByKeywords(columns, ['sku', 'referencia', 'item', 'codigo', 'código']);
      const weightCol = findColumnByKeywords(columns, ['peso', 'weight', 'kg', 'kilogramos']);
      const productCol = findColumnByKeywords(columns, ['producto', 'product', 'nombre', 'name', 'descripcion', 'descripción']);

      if (!skuCol || !weightCol) {
        alert(`Error: El archivo debe contener columnas de SKU y PESO.`);
        return;
      }

      const newWeights = [...weights];
      let updatedCount = 0;
      let addedCount = 0;

      data.forEach(row => {
        const rowSku = String(row[skuCol] || '').trim();
        const rowWeightStr = String(row[weightCol] || '0').replace(',', '.').replace(/[^\d.]/g, '');
        const rowWeight = parseFloat(rowWeightStr);
        const rowProduct = productCol ? String(row[productCol] || '').trim() : "";

        if (rowSku && !isNaN(rowWeight)) {
          const index = newWeights.findIndex(w => w.sku === rowSku);
          const entry: WeightEntry = {
            sku: rowSku,
            product: rowProduct,
            weight: rowWeight,
            updatedAt: new Date().toISOString()
          };

          if (index >= 0) {
            newWeights[index] = entry;
            updatedCount++;
          } else {
            newWeights.push(entry);
            addedCount++;
          }
        }
      });

      onWeightsChange(newWeights);
      alert(`✅ Procesado: ${addedCount} nuevos, ${updatedCount} actualizados.`);
    } catch (error) {
      alert("Error al procesar el archivo.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Esta acción sobrescribirá todos los datos actuales de Logística con la información del Backup. ¿Continuar?")) return;

    try {
      const sheets = await parseExcelFile(file);
      
      // Procesar Pesos
      const weightSheet = sheets.find(s => s.name.toLowerCase().includes("pesos"));
      if (weightSheet) {
        const newWeights: WeightEntry[] = weightSheet.data.map(row => ({
           sku: String(row['SKU'] || ""),
           product: String(row['PRODUCTO'] || ""),
           weight: parseFloat(String(row['PESO'] || "0")),
           updatedAt: new Date().toISOString()
        })).filter(w => w.sku);
        onWeightsChange(newWeights);
      }

      // Procesar Escalas
      const rateSheet = sheets.find(s => s.name.toLowerCase().includes("tarifarias") || s.name.toLowerCase().includes("escalas"));
      if (rateSheet) {
        const newRates: ShippingRate[] = rateSheet.data.map(row => ({
          maxWeight: parseFloat(String(row['Hasta Kg'] || "0")),
          cost: parseFloat(String(row['Costo'] || "0"))
        })).filter(r => r.maxWeight > 0);
        onRatesChange(newRates);
      }

      alert("✅ Base de datos restaurada correctamente.");
    } catch (error) {
      alert("Error al restaurar el backup.");
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  const removeWeight = (targetSku: string) => {
    if (confirm(`¿Eliminar SKU ${targetSku}?`)) {
        onWeightsChange(weights.filter(w => w.sku !== targetSku));
        if (editingSku === targetSku) resetForm();
    }
  };

  const addRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maxW || !cost) return;
    const newRates = [...rates, { maxWeight: parseFloat(maxW), cost: parseFloat(cost) }]
      .sort((a, b) => a.maxWeight - b.maxWeight);
    onRatesChange(newRates);
    setMaxW('');
    setCost('');
  };

  const removeRate = (index: number) => {
    onRatesChange(rates.filter((_, i) => i !== index));
  };

  const filteredWeights = weights.filter(w => 
    w.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.product && w.product.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in pb-20">
      <div className="space-y-8">
        {/* DATABASE MANAGEMENT SECTION */}
        <div className="bg-slate-900 border border-slate-700 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
             <svg className="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
          </div>
          <h3 className="text-xl font-black text-white mb-2 flex items-center gap-3">Gestión de Base de Datos</h3>
          <p className="text-sm font-medium text-slate-400 mb-6">Mueve tus datos entre contenedores Docker mediante Backups maestros.</p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => downloadLogisticsBackup(weights, rates)}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Exportar DB
            </button>
            <button 
              onClick={() => backupInputRef.current?.click()}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              Restaurar DB
            </button>
            <input type="file" ref={backupInputRef} className="hidden" accept=".xlsx" onChange={handleRestoreBackup} />
          </div>
        </div>

        {/* Shipping Rates Section */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            1. Escalas Tarifarias
          </h3>
          <form onSubmit={addRate} className="flex gap-3 mb-8">
            <input 
              type="number" step="0.1" placeholder="Hasta kg" 
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-inner transition-all"
              value={maxW} onChange={e => setMaxW(e.target.value)}
            />
            <input 
              type="number" placeholder="Costo $" 
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-inner transition-all"
              value={cost} onChange={e => setCost(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-2xl transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95">
              Añadir
            </button>
          </form>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {rates.map((r, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-950 rounded-[1.25rem] border border-slate-100 dark:border-slate-800 transition-all hover:border-blue-200 dark:hover:border-blue-900">
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Hasta <b className="text-slate-900 dark:text-white ml-1">{r.maxWeight} kg</b></span>
                <div className="flex items-center gap-5">
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400">$ {r.cost.toLocaleString()}</span>
                  <button onClick={() => removeRate(i)} className="text-slate-300 hover:text-rose-600 transition-colors p-1">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bulk Upload Section */}
        <div className="bg-indigo-600 dark:bg-indigo-900/40 p-8 rounded-[2rem] border border-indigo-400/20 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <svg className="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <h3 className="text-xl font-black text-white mb-2 flex items-center gap-3">Importación Rápida</h3>
          <p className="text-sm font-medium text-indigo-100/80 mb-6">Carga un Excel con columnas SKU / PRODUCTO / PESO.</p>
          
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleBulkUpload} />
          <button 
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 px-6 bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white rounded-[1.25rem] font-black text-sm uppercase tracking-widest transition-all hover:shadow-2xl active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isProcessing ? <div className="w-5 h-5 border-4 border-indigo-600 dark:border-white border-t-transparent rounded-full animate-spin"></div> : "Subir Excel de Pesos"}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Weights Inventory Section */}
        <div className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border shadow-2xl flex flex-col h-[700px] transition-all duration-500 ${editingSku ? 'border-amber-500 ring-4 ring-amber-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <div className={`${editingSku ? 'bg-amber-500 animate-pulse' : 'bg-amber-600'} p-2 rounded-xl transition-colors`}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              2. Inventario de Pesos
            </h3>
            {editingSku && (
              <button onClick={resetForm} className="text-[10px] font-black bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                Cancelar
              </button>
            )}
          </div>
          
          <form onSubmit={addWeight} className="flex flex-col gap-3 mb-6 bg-slate-50 dark:bg-slate-950 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
            <div className="flex gap-3">
              <input 
                placeholder="SKU" 
                className={`flex-1 bg-white dark:bg-slate-900 border rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 transition-all ${editingSku ? 'border-amber-300 focus:ring-amber-500' : 'border-slate-200 dark:border-slate-800 focus:ring-blue-500'}`}
                value={sku} onChange={e => setSku(e.target.value)}
              />
              <div className="relative w-32">
                <input 
                  type="number" step="0.01" placeholder="Peso" 
                  className={`w-full bg-white dark:bg-slate-900 border rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 transition-all ${editingSku ? 'border-amber-300 focus:ring-amber-500' : 'border-slate-200 dark:border-slate-800 focus:ring-blue-500'}`}
                  value={weight} onChange={e => setWeight(e.target.value)}
                />
                <span className="absolute right-3 top-3 text-[10px] font-black text-slate-400 dark:text-slate-600">KG</span>
              </div>
            </div>
            <div className="flex gap-3">
              <input 
                placeholder="Nombre del Producto" 
                className={`flex-1 bg-white dark:bg-slate-900 border rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 transition-all ${editingSku ? 'border-amber-300 focus:ring-amber-500' : 'border-slate-200 dark:border-slate-800 focus:ring-blue-500'}`}
                value={product} onChange={e => setProduct(e.target.value)}
              />
              <button 
                type="submit" 
                className={`px-6 rounded-xl transition-all font-black text-xs uppercase tracking-widest text-white shadow-lg shadow-blue-500/10 active:scale-95 ${editingSku ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' : 'bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500'}`}
              >
                {editingSku ? 'Guardar' : 'Añadir'}
              </button>
            </div>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" placeholder="Buscar por SKU o Producto..." 
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-auto space-y-3 pr-2 custom-scrollbar">
            {filteredWeights.map((w, i) => (
              <div 
                key={i} 
                className={`flex justify-between items-center p-4 rounded-[1.5rem] transition-all group border ${editingSku === w.sku ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 shadow-lg' : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800'}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{w.sku}</p>
                  {w.product && <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 truncate">{w.product}</p>}
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400 whitespace-nowrap bg-amber-50 dark:bg-amber-900/40 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-800/50">{w.weight} kg</span>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEditing(w)} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button onClick={() => removeWeight(w.sku)} className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 flex justify-between uppercase tracking-[0.2em]">
            <span>Registros: {weights.length}</span>
            <span className="text-emerald-500 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
                Docker Persistent Storage (v1.2)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeightManager;
