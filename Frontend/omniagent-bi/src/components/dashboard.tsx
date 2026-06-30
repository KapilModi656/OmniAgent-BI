import {useAtom} from 'jotai';
import Plot from 'react-plotly.js';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Chats, CurrentChat, edaUrls, themeModeAtom} from '../store/store';
import {
    API_BASE,
    extractPathName,
    getAuthHeaders,
    getFileContent,
    parseChatsPayload,
    parseCsv,
    tryJson,
    type CsvPreview
} from '../utils';

interface ColumnField {
    name: string;
    type: string;
}

interface DatasetItem {
    id: number;
    datasetUrl: string;
    isTraining: boolean;
    predictionUrl: string | null;
}

interface PlotPreview {
    path: string;
    status: 'loading' | 'success' | 'error';
    data?: unknown[];
    layout?: Record<string, unknown>;
}

interface PairPreview {
    dataset: CsvPreview | null;
    prediction: CsvPreview | null;
}

function FileUploadDropzone({
    file,
    setFile,
    accept,
    title = "Click or drag file to this area to upload",
    subtitle = "Support for a single CSV file upload.",
}: {
    file: File | null;
    setFile: (f: File | null) => void;
    accept: string;
    title?: string;
    subtitle?: string;
}) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div 
            className={`relative flex flex-col items-center justify-center w-full min-h-[140px] rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden group ${isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/50'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    setFile(e.dataTransfer.files[0]);
                }
            }}
            onClick={() => fileInputRef.current?.click()}
        >
            <input 
                type="file" 
                ref={fileInputRef} 
                accept={accept} 
                className="hidden" 
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        setFile(e.target.files[0]);
                    }
                }} 
            />
            {file ? (
                <div className="flex flex-col items-center text-primary">
                    <svg className="w-10 h-10 mb-2 opacity-80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    <span className="font-semibold text-sm truncate max-w-[200px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
            ) : (
                <div className="flex flex-col items-center text-muted-foreground">
                    <div className="p-3 bg-background rounded-full mb-3 shadow-sm group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-primary/80" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                    </div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs mt-1">{subtitle}</p>
                </div>
            )}
        </div>
    );
}

function Dashboard() {
    const [chats, setChats] = useAtom(Chats);
    const [currentChat, setCurrentChat] = useAtom(CurrentChat);
    const [edaUrlsState, setEdaUrlsState] = useAtom(edaUrls);
    const [themeMode] = useAtom(themeModeAtom);

    const [loadingState, setLoadingState] = useState({
        chats: false,
        training: false,
        predictionFile: false,
        predictionInput: false,
        datasets: false,
        fields: false,
        preview: false,
    });
    const [error, setError] = useState<string | null>(null);

    const [datasetItems, setDatasetItems] = useState<DatasetItem[]>([]);
    const [columns, setColumns] = useState<ColumnField[]>([]);
    const [inputRows, setInputRows] = useState<Record<string, string>[]>([{}]);
    const [plotPreviews, setPlotPreviews] = useState<PlotPreview[]>([]);
    const [openPreviewId, setOpenPreviewId] = useState<number | 'training' | null>(null);
    const [pairPreview, setPairPreview] = useState<PairPreview>({ dataset: null, prediction: null });
    
    const [previewRowCount, setPreviewRowCount] = useState<number>(30);
    const [datasetCollapsed, setDatasetCollapsed] = useState<boolean>(false);
    const [predictionCollapsed, setPredictionCollapsed] = useState<boolean>(false);

    const trainingDataset = useMemo(
        () => datasetItems.find((item) => item.isTraining),
        [datasetItems],
    );

    const [trainFile, setTrainFile] = useState<File | null>(null);
    const [predictFile, setPredictFile] = useState<File | null>(null);

    const currentChatRef = useRef(currentChat);
    useEffect(() => {
        if (currentChatRef.current !== currentChat) {
            // Reset preview states when switching chats
            setOpenPreviewId(null);
            setPairPreview({ dataset: null, prediction: null });
            setError(null);
            setTrainFile(null);
            setPredictFile(null);
            setEdaUrlsState([]);
        }
        currentChatRef.current = currentChat;
    }, [currentChat,setEdaUrlsState]);

    const selectedChat = useMemo(
        () => chats.find((chat) => chat.id === currentChat) ?? null,
        [chats, currentChat],
    );

    const isTrained = Boolean(selectedChat?.trainingUrl);

    const predictionPairs = useMemo(
        () => datasetItems.filter((item) => !item.isTraining && Boolean(item.predictionUrl)),
        [datasetItems],
    );

    const parsedMetrics = useMemo(() => {
        if (!selectedChat?.modelMetrics) return null;
        try {
            return JSON.parse(selectedChat.modelMetrics) as Record<string, number>;
        } catch {
            return null;
        }
    }, [selectedChat]);

    const setLoading = useCallback((key: keyof typeof loadingState, value: boolean) => {
        setLoadingState((prev) => ({ ...prev, [key]: value }));
    }, []);

    const fetchChats = useCallback(async () => {
        setLoading('chats', true);
        try {
            const data = await tryJson(`${API_BASE}/chats/list`, { method: 'GET', headers: getAuthHeaders() });
            const parsed = parseChatsPayload(data);
            setChats(parsed);
            if (parsed.length > 0 && !parsed.some((chat) => chat.id === currentChatRef.current)) {
                setCurrentChat(parsed[0].id);
            }
            if (parsed.length === 0) {
                setCurrentChat(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to fetch chats');
        } finally {
            setLoading('chats', false);
        }
    }, [setChats, setCurrentChat, setLoading]);

    const fetchColumns = useCallback(async (chatId: number) => {
        setLoading('fields', true);
        const attempts = [
            () => tryJson(`${API_BASE}/predict/get-fields`, { method: 'POST', headers: getAuthHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ chatId }) }),
        ];

        for (const request of attempts) {
            try {
                const result = await request();
                const list = result && typeof result === 'object'
                    ? (result as { columns?: unknown[] }).columns
                    : [];

                const parsed = Array.isArray(list)
                    ? list
                            .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
                            .map((item) => ({ name: String(item.name ?? item.columnName ?? ''), type: String(item.type ?? item.columnType ?? 'string') }))
                            .filter((item) => item.name)
                    : [];

                setColumns(parsed);
                const initialRow: Record<string, string> = {};
                for (const col of parsed) initialRow[col.name] = '';
                setInputRows([initialRow]);
                setLoading('fields', false);
                return;
            } catch {
                // Try next endpoint.
            }
        }

        setLoading('fields', false);
    }, [setLoading]);

    const fetchDatasets = useCallback(async (chatId: number) => {
        setLoading('datasets', true);
        const attempts = [
            () => tryJson(`${API_BASE}/get-datasets?chatId=${chatId}`, { method: 'GET', headers: getAuthHeaders() }),
        ];

        for (const request of attempts) {
            try {
                const result = await request();
                const rawList = Array.isArray(result)
                    ? result
                    : result && typeof result === 'object' && Array.isArray((result as { datasets?: unknown[] }).datasets)
                        ? (result as { datasets: unknown[] }).datasets
                        : [];

                const parsed: DatasetItem[] = rawList
                    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
                    .map((item) => ({
                        id: Number(item.id ?? 0),
                        datasetUrl: String(item.datasetUrl ?? item.dataset_url ?? ''),
                        isTraining: Boolean(item.isTraining ?? item.is_training),
                        predictionUrl: item.predictionUrl
                            ? String(item.predictionUrl)
                            : item.prediction && typeof item.prediction === 'object' && (item.prediction as { predictionUrl?: unknown }).predictionUrl
                                ? String((item.prediction as { predictionUrl: unknown }).predictionUrl)
                                : null,
                    }))
                    .filter((item) => Boolean(item.datasetUrl));

                setDatasetItems(parsed);
                
                // Find training dataset and extract edaUrls if present
                const trainingItem = rawList.find(item => item && typeof item === 'object' && Boolean((item as Record<string, unknown>).isTraining || (item as Record<string, unknown>).is_training)) as Record<string, unknown> | undefined;
                if (trainingItem && Array.isArray(trainingItem.edaUrls)) {
                    setEdaUrlsState(trainingItem.edaUrls.map((u: unknown) => {
                        if (typeof u === 'string') return u;
                        if (u && typeof u === 'object' && typeof (u as Record<string, unknown>).url === 'string') return (u as Record<string, unknown>).url;
                        return '';
                    }).filter(Boolean) as string[]);
                } else {
                    setEdaUrlsState([]);
                }
                
                setLoading('datasets', false);
                return;
            } catch {
                // Try next endpoint.
            }
        }

        setDatasetItems([]);
        setLoading('datasets', false);
    }, [setLoading, setEdaUrlsState]);

    const loadEdaPlots = useCallback(async (paths: string[]) => {
        if (paths.length === 0) {
            setPlotPreviews([]);
            return;
        }

        setPlotPreviews(paths.map(path => ({ path, status: 'loading' })));

        paths.forEach(async (path) => {
            try {
                const content = await getFileContent(path);
                const parsed = JSON.parse(content) as { data?: unknown[]; layout?: Record<string, unknown> };
                if (Array.isArray(parsed.data)) {
                    setPlotPreviews(prev => prev.map(p => p.path === path ? { path, status: 'success', data: parsed.data, layout: parsed.layout ?? {} } : p));
                } else {
                    setPlotPreviews(prev => prev.map(p => p.path === path ? { path, status: 'error' } : p));
                }
            } catch {
                setPlotPreviews(prev => prev.map(p => p.path === path ? { path, status: 'error' } : p));
            }
        });
    }, []);

    async function startTraining() {
        if (!currentChat) return;
        const file = trainFile;
        if (!file) {
            setError('Please select a dataset file to start training.');
            return;
        }

        setError(null);
        setLoading('training', true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('chatId', String(currentChat));

            const data = await tryJson(`${API_BASE}/train`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });

            if (data && typeof data === 'object' && (data as { error?: string }).error) {
                throw new Error((data as { error: string }).error);
            }

            const nextEda = data && typeof data === 'object'
                ? ((data as { edaPaths?: unknown; eda_output?: unknown }).edaPaths ?? (data as { eda_output?: unknown }).eda_output)
                : [];

            setEdaUrlsState(Array.isArray(nextEda) ? nextEda.map(String) : []);
            await fetchChats();
            await fetchDatasets(currentChat);
            setTrainFile(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Training failed');
        } finally {
            setLoading('training', false);
        }
    }

    async function predictByFile() {
        if (!currentChat) return;
        const file = predictFile;
        if (!file) {
            setError('Please choose a file for prediction.');
            return;
        }

        setError(null);
        setLoading('predictionFile', true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('chatId', String(currentChat));

            const data = await tryJson(`${API_BASE}/predict/predict-file`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });

            if (data && typeof data === 'object' && (data as { error?: string }).error) {
                throw new Error((data as { error: string }).error);
            }

            await fetchDatasets(currentChat);
            setPredictFile(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Prediction by file failed');
        } finally {
            setLoading('predictionFile', false);
        }
    }

    function castInputValue(value: string, type: string): string | number {
        if (!value) return value;
        const lowered = type.toLowerCase();
        if (lowered.includes('int') || lowered.includes('float') || lowered.includes('number') || lowered.includes('double')) {
            const numberValue = Number(value);
            return Number.isNaN(numberValue) ? value : numberValue;
        }
        return value;
    }

    async function predictByInput() {
        if (!currentChat) return;
        setError(null);
        setLoading('predictionInput', true);
        try {
            const formatted: Record<string, Array<string | number>> = {};
            for (const col of columns) {
                formatted[col.name] = inputRows.map(row => castInputValue(row[col.name] ?? '', col.type));
            }

            const data = await tryJson(`${API_BASE}/predict`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ chatId: currentChat, inputData: formatted }),
            });

            if (data && typeof data === 'object' && (data as { error?: string }).error) {
                throw new Error((data as { error: string }).error);
            }

            await fetchDatasets(currentChat);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Prediction by input failed');
        } finally {
            setLoading('predictionInput', false);
        }
    }

    async function openPreview(datasetUrl: string, predictionUrl: string | null) {
        setLoading('preview', true);
        try {
            const promises: Promise<string>[] = [getFileContent(datasetUrl)];
            if (predictionUrl) promises.push(getFileContent(predictionUrl));
            
            const results = await Promise.all(promises);
            const datasetRaw = results[0];
            const predictionRaw = predictionUrl ? results[1] : null;

            setPairPreview({
                dataset: parseCsv(datasetRaw),
                prediction: predictionRaw ? parseCsv(predictionRaw) : null,
            });
            setDatasetCollapsed(false);
            setPredictionCollapsed(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load file preview');
            setPairPreview({ dataset: null, prediction: null });
        } finally {
            setLoading('preview', false);
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchChats();
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchChats]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!currentChat) {
                setDatasetItems([]);
                setColumns([]);
                setPairPreview({ dataset: null, prediction: null });
                setOpenPreviewId(null);
                return;
            }

            void fetchDatasets(currentChat);
            void fetchColumns(currentChat);
        }, 0);
        return () => clearTimeout(timer);
    }, [currentChat, fetchDatasets, fetchColumns]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadEdaPlots(edaUrlsState);
        }, 0);
        return () => clearTimeout(timer);
    }, [edaUrlsState, loadEdaPlots]);

    if (loadingState.chats && chats.length === 0) {
        return <div className="rounded-xl border border-border bg-card p-8 text-muted-foreground shadow-sm">Loading chats...</div>;
    }

    if (chats.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center shadow-sm">
                <p className="text-2xl font-semibold text-foreground">Welcome</p>
                <p className="mt-2 text-muted-foreground">No active chat selected. Create a new chat or select an existing one from the sidebar to begin.</p>
            </div>
        );
    }

    if (!selectedChat) {
        return (
            <div className="rounded-xl border border-border bg-card p-8 text-muted-foreground shadow-sm">
                Select a chat from sidebar to continue.
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto pr-1">
            <div className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
                <h1 className="text-2xl font-bold text-foreground">{selectedChat.name}</h1>
                <p className="mt-1 text-muted-foreground">{isTrained ? 'Model trained. You can run predictions now.' : 'Training pending. Upload a dataset to start.'}</p>
            </div>

            {error && (
                <div className="mb-6 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
                    {error}
                </div>
            )}

            {!isTrained && (
                <section className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-foreground">Upload Training Dataset</h2>
                        <p className="mt-2 text-muted-foreground text-sm max-w-lg mx-auto">Drop your CSV dataset here to initiate the automated model training pipeline. The AI will analyze, clean, and train a model for you.</p>
                    </div>
                    <div className="mt-4 flex flex-col gap-4 items-center">
                        <FileUploadDropzone 
                            file={trainFile} 
                            setFile={setTrainFile} 
                            accept=".csv" 
                            title="Drag & drop your training dataset here"
                        />
                        <button
                            type="button"
                            onClick={() => void startTraining()}
                            disabled={loadingState.training || !trainFile}
                            className="w-full sm:w-auto rounded-lg bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 shadow-md"
                        >
                            {loadingState.training ? 'Training...' : 'Start Training Pipeline'}
                        </button>
                    </div>
                </section>
            )}

            {isTrained && (
                <>
                    <section className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
                        <h2 className="text-xl font-semibold text-foreground">EDA Results</h2>
                        <p className="mt-2 text-muted-foreground">Exploratory Data Analysis visualizations generated during the model training phase.</p>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            {plotPreviews.length === 0 && (
                                <div className="rounded border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                                    No EDA plots are currently available. They will appear here once the model training is complete.
                                </div>
                            )}
                            {plotPreviews.map((plot) => (
                                <div key={plot.path} className="rounded-lg border border-border bg-background p-3 shadow-sm min-h-[380px] flex flex-col">
                                    <p className="mb-2 truncate text-xs text-muted-foreground">{extractPathName(plot.path)}</p>
                                    
                                    {plot.status === 'loading' && (
                                        <div className="flex-1 flex flex-col items-center justify-center">
                                            <svg className="animate-spin h-8 w-8 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <span className="text-sm text-muted-foreground">Loading plot...</span>
                                        </div>
                                    )}

                                    {plot.status === 'error' && (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                                            <svg className="h-10 w-10 text-red-500/50 mb-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                                            <span className="text-sm font-medium text-red-500">Something wrong happened while rendering plot</span>
                                            <span className="text-xs text-muted-foreground mt-1">This plot could not be loaded.</span>
                                        </div>
                                    )}

                                    {plot.status === 'success' && (
                                        <Plot
                                            data={plot.data as never[]}
                                            layout={{
                                                ...plot.layout,
                                                autosize: true,
                                                paper_bgcolor: themeMode === 'dark' ? '#020617' : '#ffffff',
                                                plot_bgcolor: themeMode === 'dark' ? '#020617' : '#ffffff',
                                                font: { color: themeMode === 'dark' ? '#f8fafc' : '#0f172a' },
                                            }}
                                            style={{ width: '100%', height: '340px' }}
                                            useResizeHandler
                                            config={{ displaylogo: false, responsive: true }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {parsedMetrics && Object.keys(parsedMetrics).length > 0 && (
                        <section className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
                            <h2 className="text-xl font-semibold text-foreground">Model Performance</h2>
                            <p className="mt-2 text-muted-foreground">Evaluation metrics calculated on validation data during the training phase.</p>
                            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                {Object.entries(parsedMetrics).map(([key, value]) => (
                                    <div key={key} className="rounded-lg border border-border bg-muted/10 p-5 flex flex-col justify-center items-center text-center shadow-sm transition-all hover:border-primary/50 hover:bg-muted/30 hover:shadow-md">
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{key.replace(/_/g, ' ')}</span>
                                        <span className="text-2xl font-black text-primary">
                                            {typeof value === 'number' ? (value % 1 === 0 ? value : value.toFixed(4)) : String(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
                        <h2 className="text-xl font-semibold text-foreground">Prediction</h2>
                        <p className="mt-2 text-muted-foreground">Execute predictions by uploading a batch dataset file or by providing manual data entry.</p>

                        <div className="mt-4 grid gap-6 xl:grid-cols-2">
                            <div className="rounded-lg border border-border bg-muted/10 p-5 flex flex-col h-full">
                                <h3 className="text-sm font-semibold text-foreground mb-1">1) Predict by dataset file</h3>
                                <p className="text-xs text-muted-foreground mb-4">Upload a CSV file containing records to predict.</p>
                                <div className="mt-auto flex flex-col gap-4">
                                    <FileUploadDropzone 
                                        file={predictFile} 
                                        setFile={setPredictFile} 
                                        accept=".csv" 
                                        title="Drop prediction dataset"
                                        subtitle="Only CSV files are supported"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void predictByFile()}
                                        disabled={loadingState.predictionFile || !predictFile}
                                        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 shadow-sm"
                                    >
                                        {loadingState.predictionFile ? 'Predicting...' : 'Run Prediction'}
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-lg border border-border bg-muted/10 p-5 flex flex-col h-full">
                                <h3 className="text-sm font-semibold text-foreground mb-1">2) Predict by manual input</h3>
                                <p className="text-xs text-muted-foreground mb-4">Enter values manually into the fields to generate a prediction.</p>
                                <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                    {inputRows.map((row, rowIndex) => (
                                        <div key={rowIndex} className="relative rounded-md border border-border bg-background p-3 shadow-sm transition hover:border-primary/50">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-muted-foreground">Record #{rowIndex + 1}</span>
                                                {inputRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setInputRows(prev => prev.filter((_, i) => i !== rowIndex))}
                                                        className="text-muted-foreground hover:text-red-500 transition-colors"
                                                        title="Remove row"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                                                {columns.map((col) => (
                                                    <label key={col.name} className="flex flex-col text-xs text-muted-foreground">
                                                        <span className="mb-1 text-foreground font-medium">{col.name}</span>
                                                        <input
                                                            value={row[col.name] ?? ''}
                                                            onChange={(event) => {
                                                                const newVal = event.target.value;
                                                                setInputRows(prev => prev.map((r, i) => i === rowIndex ? { ...r, [col.name]: newVal } : r));
                                                            }}
                                                            className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                                            placeholder={col.type}
                                                        />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center justify-between border-t border-border pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newRow: Record<string, string> = {};
                                            for (const col of columns) newRow[col.name] = '';
                                            setInputRows(prev => [...prev, newRow]);
                                        }}
                                        className="flex items-center gap-1 text-sm font-medium text-primary transition hover:opacity-80"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                        Add Row
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void predictByInput()}
                                        disabled={loadingState.predictionInput || columns.length === 0}
                                        className="rounded bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60 shadow-sm"
                                    >
                                        {loadingState.predictionInput ? 'Predicting...' : 'Predict from Input'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border bg-card p-6 shadow-sm transition-colors duration-300">
                        <h2 className="text-xl font-semibold text-foreground">Dataset & Prediction Files</h2>
                        <p className="mt-2 text-muted-foreground">Historical inference results, pairing source datasets with their corresponding predictions.</p>

                        <div className="mt-4 space-y-2">
                            {trainingDataset && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOpenPreviewId('training');
                                        void openPreview(trainingDataset.datasetUrl, null);
                                    }}
                                    className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left transition ${openPreviewId === 'training' ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:border-muted-foreground'}`}
                                >
                                    <span className="truncate text-sm font-medium text-foreground">Training Dataset</span>
                                    <span className="ml-4 text-xs text-muted-foreground">{extractPathName(trainingDataset.datasetUrl)}</span>
                                </button>
                            )}
                            {!loadingState.datasets && predictionPairs.length === 0 && !trainingDataset && (
                                <div className="rounded border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                                    No historical predictions are available yet.
                                </div>
                            )}

                            {predictionPairs.map((pair) => (
                                <button
                                    key={pair.id}
                                    type="button"
                                    onClick={() => {
                                        setOpenPreviewId(pair.id);
                                        void openPreview(pair.datasetUrl, pair.predictionUrl ?? '');
                                    }}
                                    className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left transition ${openPreviewId === pair.id ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:border-muted-foreground'}`}
                                >
                                    <span className="truncate text-sm text-foreground">{extractPathName(pair.datasetUrl)}</span>
                                    <span className="ml-4 text-xs text-muted-foreground">{extractPathName(pair.predictionUrl ?? '')}</span>
                                </button>
                            ))}
                        </div>

                        {openPreviewId && (
                            <div className="mt-5 border-t border-border pt-5">
                                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <h3 className="text-lg font-semibold text-foreground">Data Explorer</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Show rows:</span>
                                        <select
                                            value={previewRowCount}
                                            onChange={(e) => setPreviewRowCount(Number(e.target.value))}
                                            className="rounded border border-input bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
                                        >
                                            <option value={10}>Top 10</option>
                                            <option value={20}>Top 20</option>
                                            <option value={30}>Top 30</option>
                                            <option value={50}>Top 50</option>
                                            <option value={100}>Top 100</option>
                                            <option value={2000}>All</option>
                                        </select>
                                    </div>
                                </div>
                                <div className={`grid gap-4 ${pairPreview.dataset && pairPreview.prediction ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                                    {pairPreview.dataset && (
                                        <div className="rounded-lg border border-border bg-background shadow-sm overflow-hidden flex flex-col transition-all">
                                            <div 
                                                className="flex items-center justify-between p-3 border-b border-border bg-muted/10 cursor-pointer hover:bg-muted/20 transition select-none"
                                                onClick={() => setDatasetCollapsed(!datasetCollapsed)}
                                            >
                                                <h4 className="text-sm font-semibold text-foreground">Dataset Preview</h4>
                                                <button className="text-muted-foreground hover:text-foreground">
                                                    {datasetCollapsed ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                                    )}
                                                </button>
                                            </div>
                                            {!datasetCollapsed && (
                                                <div className="overflow-auto p-3 max-h-[500px]">
                                                    <table className="min-w-full text-xs">
                                                        <thead>
                                                            <tr>
                                                                {pairPreview.dataset.headers.map((header) => (
                                                                    <th key={header} className="border-b border-border px-2 py-1 text-left text-muted-foreground whitespace-nowrap">{header}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {pairPreview.dataset.rows.slice(0, previewRowCount).map((row, idx) => (
                                                                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                                                    {pairPreview.dataset?.headers.map((header) => (
                                                                        <td key={`${idx}-${header}`} className="px-2 py-1 text-foreground whitespace-nowrap">{String(row[header] ?? '')}</td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {pairPreview.prediction && (
                                        <div className="rounded-lg border border-border bg-background shadow-sm overflow-hidden flex flex-col transition-all">
                                            <div 
                                                className="flex items-center justify-between p-3 border-b border-border bg-muted/10 cursor-pointer hover:bg-muted/20 transition select-none"
                                                onClick={() => setPredictionCollapsed(!predictionCollapsed)}
                                            >
                                                <h4 className="text-sm font-semibold text-foreground">Prediction Preview</h4>
                                                <button className="text-muted-foreground hover:text-foreground">
                                                    {predictionCollapsed ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                                    )}
                                                </button>
                                            </div>
                                            {!predictionCollapsed && (
                                                <div className="overflow-auto p-3 max-h-[500px]">
                                                    <table className="min-w-full text-xs">
                                                        <thead>
                                                            <tr>
                                                                {pairPreview.prediction.headers.map((header) => (
                                                                    <th key={header} className="border-b border-border px-2 py-1 text-left text-muted-foreground whitespace-nowrap">{header}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {pairPreview.prediction.rows.slice(0, previewRowCount).map((row, idx) => (
                                                                <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                                                    {pairPreview.prediction?.headers.map((header) => (
                                                                        <td key={`${idx}-${header}`} className="px-2 py-1 text-foreground whitespace-nowrap">{String(row[header] ?? '')}</td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}

export default Dashboard;