
import * as XLSX from 'xlsx';
import { ParsedSheet, ExcelRow, CalculatorConfig, ProcessedRow, WeightEntry, ShippingRate } from '../types';

const extractPercentage = (str: any): number => {
  if (typeof str === 'number') return str;
  if (!str || typeof str !== 'string') return 0;
  const match = str.match(/(\d+(?:[.,]\d+)?)%/);
  if (match) return parseFloat(match[1].replace(',', '.')) / 100;
  return 0;
};

const parseMLFee = (str: any) => {
  let pct = 0;
  let fixed = 0;
  if (!str) return { pct, fixed };
  const stringVal = String(str);
  const pctMatch = stringVal.match(/(\d+(?:[.,]\d+)?)%/);
  if (pctMatch) pct = parseFloat(pctMatch[1].replace(',', '.')) / 100;
  const parts = stringVal.split('+');
  parts.forEach(p => {
    if (!p.includes('%')) {
       const val = parseFloat(p.replace(/[^\d.]/g, ''));
       if (!isNaN(val)) fixed = val;
    }
  });
  return { pct, fixed };
};

export const parseExcelFile = async (file: File): Promise<ParsedSheet[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("No se pudieron leer los datos del archivo."));
          return;
        }
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheets: ParsedSheet[] = [];
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { defval: "" });
          if (jsonData.length > 0) {
            const columns = Object.keys(jsonData[0]);
            sheets.push({ name: sheetName, data: jsonData, columns: columns });
          }
        });
        resolve(sheets);
      } catch (error) { reject(error); }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const processFiles = (
  mlSheet: ParsedSheet,
  odooSheet: ParsedSheet,
  config: CalculatorConfig,
  weights: WeightEntry[] = [],
  rates: ShippingRate[] = []
): ProcessedRow[] => {
  const odooMap = new Map<string, ExcelRow>();
  odooSheet.data.forEach(row => {
    const sku = String(row['Código Neored'] || row['Referencia interna'] || '').trim();
    if (sku) odooMap.set(sku, row);
  });

  const weightMap = new Map<string, number>();
  weights.forEach(w => weightMap.set(w.sku, w.weight));

  const results: ProcessedRow[] = [];

  mlSheet.data.forEach(mlRow => {
    const itemId = String(mlRow['ITEM_ID'] || '');
    const sku = String(mlRow['SKU'] || mlRow['seller_sku'] || '').trim();
    if (!itemId.startsWith('ML') || !sku) return;

    const title = String(mlRow['TITLE'] || '');
    const mlPrice = parseFloat(String(mlRow['PRICE'] || '0'));
    const mlQuantity = parseFloat(String(mlRow['QUANTITY'] || mlRow['available_quantity'] || '0'));
    const feeStr = mlRow['FEE_PER_SALE_MARKETPLACE_V2'];
    const financingStr = mlRow['COST_OF_FINANCING_MARKETPLACE'];
    const listingType = String(mlRow['LISTING_TYPE_V3'] || '');
    const shippingMethod = String(mlRow['SHIPPING_METHOD'] || '').toLowerCase();
    
    const { pct: feePct, fixed: feeFixed } = parseMLFee(feeStr);
    const financingPct = extractPercentage(financingStr);
    const retentionPct = config.retentionsPct / 100;

    const odooRow = odooMap.get(sku);
    let notes: string[] = [];
    let basePrice = 0, odooStock = 0, taxesPct = 0, odooName = '';

    if (!odooRow) {
      notes.push("SKU no encontrado en Odoo");
    } else {
      odooName = String(odooRow['Nombre'] || odooRow['Name'] || '');
      basePrice = parseFloat(String(odooRow['Precio Tarifa'] || odooRow['Price'] || '0'));
      odooStock = parseFloat(String(odooRow['Cantidad a mano'] || odooRow['Quantity'] || '0'));
      const taxStr = String(odooRow['Impuestos del cliente'] || '');
      const matchTax = taxStr.match(/(\d+(?:[.,]\d+)?)%/);
      if (matchTax) taxesPct = parseFloat(matchTax[1].replace(',', '.')) / 100;
      if (basePrice <= 0) notes.push("Tarifa 0 o faltante");
    }

    let shippingSurcharge = 0;
    let productWeight = weightMap.get(sku) || 0;
    const appliesShipping = shippingMethod.includes('gratis') || shippingMethod.includes('mi cuenta') || shippingMethod.includes('self_service');

    if (appliesShipping) {
      if (config.useWeightTable && productWeight > 0) {
        const sortedRates = [...rates].sort((a, b) => a.maxWeight - b.maxWeight);
        const rate = sortedRates.find(r => productWeight <= r.maxWeight);
        if (rate) {
          shippingSurcharge = rate.cost;
        } else if (rates.length > 0) {
          shippingSurcharge = sortedRates[sortedRates.length - 1].cost;
          notes.push(`Peso (${productWeight}kg) excede escalas`);
        } else {
          notes.push("Base de pesos activa sin escalas");
        }
      } else {
        shippingSurcharge = config.shippingSurchargeType === 'fixed' 
          ? config.shippingSurchargeAmount 
          : (basePrice * (config.shippingSurchargeAmount / 100));
      }
    }

    let tariffBase = config.includeTaxes ? basePrice * (1 + taxesPct) : basePrice;
    const targetTariff = tariffBase + shippingSurcharge;

    const totalDeductionsPct = feePct + financingPct + retentionPct;
    const denominator = 1 - totalDeductionsPct;
    
    let finalPrice = 0, sellingFee = 0, financingCost = 0, retentionCost = 0, netReceipt = 0, estimatedIva = 0;
    let publishedStock = Math.floor(odooStock * (config.stockPercentage / 100));

    if (denominator <= 0) {
      notes.push("ERROR: Porcentajes superan 100%");
    } else {
      finalPrice = (targetTariff + feeFixed) / denominator;
      sellingFee = (finalPrice * feePct) + feeFixed;
      financingCost = finalPrice * financingPct;
      retentionCost = finalPrice * retentionPct;
      netReceipt = finalPrice - (sellingFee + financingCost + retentionCost);
      if (taxesPct > 0) estimatedIva = (finalPrice * taxesPct) / (1 + taxesPct);
    }

    const r2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

    results.push({
      'SKU': sku,
      'Publicación': itemId,
      'Descripción': odooName || title,
      'Stock Real': odooStock,
      'Stock Publicado': publishedStock,
      'Stock Anterior ML': mlQuantity,
      'Moneda': String(mlRow['CURRENCY_ID'] || 'ARS'),
      'Costo Base (Odoo)': r2(basePrice),
      'Tarifa Objetivo': r2(targetTariff),
      'Precio Publicación': r2(finalPrice),
      'Precio Anterior ML': r2(mlPrice),
      'Cargo por Vender': r2(sellingFee),
      'Fee Pct Aplicado': feePct * 100,
      'Fee Fijo Aplicado': feeFixed,
      'Financing Pct Aplicado': financingPct * 100,
      'Costo Financiación': r2(financingCost),
      'Retenciones': r2(retentionCost),
      'IVA Estimado': r2(estimatedIva),
      'Recibís (Neto)': r2(netReceipt),
      'Peso (kg)': productWeight,
      'Recargo Envío': r2(shippingSurcharge),
      'Tipo Publicación': listingType,
      'Envío': shippingMethod,
      'Notas': notes.join(' | ') || 'OK'
    });
  });

  return results;
};

export const downloadExcel = (data: ProcessedRow[], filename: string) => {
  const exportData = data.map(row => ({
    "Numero de publicación": row['Publicación'],
    "SKU": row['SKU'],
    "Descripción del producto": row['Descripción'],
    "Stock": row['Stock Real'],
    "% Stock": row['Stock Publicado'],
    "Precio de Tarifa": row['Costo Base (Odoo)'],
    "Precio final": row['Precio Publicación'],
    "IVA": row['IVA Estimado'],
    "Recargo % ML (importe)": Math.round((row['Precio Publicación'] * (row['Fee Pct Aplicado'] / 100)) * 100) / 100,
    "Recargo fijo ML ($)": row['Fee Fijo Aplicado'],
    "Cargo por vender ($)": row['Cargo por Vender'],
    "Recargo financiación (importe)": row['Costo Financiación'],
    "Retenciones ML ($)": row['Retenciones'],
    "Recibis ($)": row['Recibís (Neto)'],
    "Recargo envío ($)": row['Recargo Envío'],
    "% ML aplicado": `${(Math.round((row['Fee Pct Aplicado'] + Number.EPSILON) * 100) / 100).toFixed(2)}%`,
    "% financiación aplicado": `${(Math.round((row['Financing Pct Aplicado'] + Number.EPSILON) * 100) / 100).toFixed(2)}%`,
    "Tipo de publicación": row['Tipo Publicación'],
    "Precio actual en ML": row['Precio Anterior ML'],
    "Peso": row['Peso (kg)'],
    "Moneda": row['Moneda'],
    "Notas-Flags": row['Notas']
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const colWidths = Object.keys(exportData[0]).map((key) => {
    if (key === "Descripción del producto") return { wch: 50 };
    const headerLen = key.length;
    const maxDataLen = exportData.reduce((max, row) => {
      const val = String((row as any)[key] || "");
      return Math.max(max, val.length);
    }, 0);
    return { wch: Math.min(Math.max(headerLen, maxDataLen) + 2, 80) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte Sincronizacion");
  XLSX.writeFile(wb, filename);
};

/** 
 * Función para exportar un backup completo de la base de datos de logística
 * Ideal para persistencia en contenedores Docker via volúmenes o descargas.
 */
export const downloadLogisticsBackup = (weights: WeightEntry[], rates: ShippingRate[]) => {
  const wb = XLSX.utils.book_new();
  
  // Hoja de Pesos con columnas exactas: SKU / PRODUCTO / PESO
  const weightData = weights.map(w => ({
    "SKU": w.sku,
    "PRODUCTO": w.product || "",
    "PESO": w.weight
  }));
  const wsWeights = XLSX.utils.json_to_sheet(weightData);
  XLSX.utils.book_append_sheet(wb, wsWeights, "Base de Pesos");
  
  // Hoja de Escalas Tarifarias
  const rateData = rates.map(r => ({
    "Hasta Kg": r.maxWeight,
    "Costo": r.cost
  }));
  const wsRates = XLSX.utils.json_to_sheet(rateData);
  XLSX.utils.book_append_sheet(wb, wsRates, "Escalas Tarifarias");
  
  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `BACKUP_LOGISTICA_${date}.xlsx`);
};
