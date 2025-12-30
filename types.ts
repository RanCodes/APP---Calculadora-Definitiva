
export interface ExcelRow {
  [key: string]: string | number | boolean | null;
}

export interface ParsedSheet {
  name: string;
  data: ExcelRow[];
  columns: string[];
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  READY = 'READY',
  ERROR = 'ERROR'
}

export interface WeightEntry {
  sku: string;
  product: string; // "PRODUCTO"
  weight: number;  // "PESO"
  updatedAt: string;
}

export interface ShippingRate {
  maxWeight: number; 
  cost: number;      
}

export interface CalculatorConfig {
  stockPercentage: number;
  retentionsPct: number; 
  includeTaxes: boolean;
  shippingSurchargeAmount: number;
  shippingSurchargeType: 'fixed' | 'percent';
  useWeightTable: boolean; 
}

export interface ProcessedRow {
  'SKU': string;
  'Publicación': string;
  'Descripción': string;
  'Stock Real': number;
  'Stock Publicado': number;
  'Stock Anterior ML': number;
  'Moneda': string;
  'Costo Base (Odoo)': number;
  'Tarifa Objetivo': number;
  'Precio Publicación': number;
  'Precio Anterior ML': number;
  'Cargo por Vender': number;
  'Fee Pct Aplicado': number;
  'Fee Fijo Aplicado': number;
  'Financing Pct Aplicado': number;
  'Costo Financiación': number;
  'Retenciones': number;
  'IVA Estimado': number;
  'Recibís (Neto)': number;
  'Tipo Publicación': string;
  'Envío': string;
  'Peso (kg)'?: number; 
  'Recargo Envío': number;
  'Notas': string;
  [key: string]: string | number | boolean | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}
