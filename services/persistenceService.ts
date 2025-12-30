import { ShippingRate, WeightEntry } from '../types';

export interface LogisticsPayload {
  weights: WeightEntry[];
  rates: ShippingRate[];
}

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = (errorBody as { error?: string }).error || 'Error al consultar la API';
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function fetchLogistics(): Promise<LogisticsPayload> {
  const res = await fetch(`${API_BASE}/logistics`, { cache: 'no-store' });
  return handleResponse<LogisticsPayload>(res);
}

export async function saveLogistics(payload: LogisticsPayload): Promise<LogisticsPayload> {
  const res = await fetch(`${API_BASE}/logistics`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<LogisticsPayload>(res);
}

export async function fetchLogo(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/logo?cb=${Date.now()}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = (errorBody as { error?: string }).error || 'Error al cargar logo';
    throw new Error(message);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function uploadLogo(file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/logo`, {
    method: 'POST',
    body: formData,
  });
  await handleResponse(res);
}

export async function deleteLogo(): Promise<void> {
  const res = await fetch(`${API_BASE}/logo`, { method: 'DELETE' });
  await handleResponse(res);
}
