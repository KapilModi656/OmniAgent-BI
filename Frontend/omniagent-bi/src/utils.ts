import Papa from 'papaparse';
import { type ChatItem } from './store/store';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface CsvPreview {
    headers: string[];
    rows: Array<Record<string, string>>;
}

export function getAuthHeaders(extra: HeadersInit = {}) {
    const token = localStorage.getItem('token');
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

export function extractPathName(path: string) {
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || path;
}

export function normalizeChat(value: unknown): ChatItem | null {
    if (!value || typeof value !== 'object') return null;
    const obj = value as Record<string, unknown>;
    const id = Number(obj.id ?? obj.chatId ?? 0);
    if (!Number.isFinite(id) || id <= 0) return null;
    return {
        id,
        name: String(obj.name ?? `Chat ${id}`),
        pipelineUrl: obj.pipelineUrl ? String(obj.pipelineUrl) : null,
        trainingUrl: obj.trainingUrl ? String(obj.trainingUrl) : null,
        modelMetrics: obj.modelMetrics ? String(obj.modelMetrics) : null,
    };
}

export function parseChatsPayload(payload: unknown): ChatItem[] {
    const list = Array.isArray(payload)
        ? payload
        : payload && typeof payload === 'object' && Array.isArray((payload as { chats?: unknown[] }).chats)
            ? (payload as { chats: unknown[] }).chats
            : [];

    return list
        .map(normalizeChat)
        .filter((chat): chat is ChatItem => chat !== null);
}

export function parseCsv(text: string): CsvPreview {
    const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data.slice(0, 2000); // Allow up to 2000 rows, frontend handles displaying subsets
    const headers = parsed.meta.fields ?? Object.keys(rows[0] ?? {});
    return { headers, rows };
}

export async function tryJson(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const rawText = await response.text();
    if (!response.ok) {
        throw new Error(rawText || `HTTP ${response.status}`);
    }

    try {
        return JSON.parse(rawText);
    } catch {
        return rawText;
    }
}

export async function getFileContent(path: string) {
    const attempts: Array<() => Promise<unknown>> = [
        () => tryJson(`${API_BASE}/get-file`, { method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ filePath: path }) }),
    ];

    for (const request of attempts) {
        try {
            const result = await request();
            if (typeof result === 'string') return result;
            if (result && typeof result === 'object') {
                const obj = result as Record<string, unknown>;
                if (typeof obj.content === 'string') return obj.content;
                if (typeof obj.data === 'string') return obj.data;
                if (typeof obj.file === 'string') return obj.file;
                return JSON.stringify(obj);
            }
        } catch {
            // Try next known contract.
        }
    }

    throw new Error('Unable to fetch file content from get-file endpoint.');
}
