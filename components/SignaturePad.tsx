import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
    onSave: (signatureDataUrl: string) => void;
    onCancel: () => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [mode, setMode] = useState<'draw' | 'upload'>('draw');
    const [hasContent, setHasContent] = useState(false);
    const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState('');

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const previousTouchAction = document.body.style.touchAction;
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
        return () => {
            document.body.style.overflow = previousOverflow;
            document.body.style.touchAction = previousTouchAction;
        };
    }, []);

    useEffect(() => {
        if (mode === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.floor(rect.width * dpr));
            canvas.height = Math.max(1, Math.floor(rect.height * dpr));
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }
    }, [mode]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) e.preventDefault();
        setIsDrawing(true);
        setHasContent(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.beginPath();
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if ('touches' in e) e.preventDefault();
        if (!isDrawing || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            if (!e.touches[0]) return;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            setHasContent(false);
        }
    };

    const handleSave = () => {
        if (!hasContent) return;
        if (mode === 'draw' && canvasRef.current) {
            onSave(canvasRef.current.toDataURL());
        } else if (mode === 'upload' && uploadedPreviewUrl) {
            onSave(uploadedPreviewUrl);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setUploadedPreviewUrl(event.target.result as string);
                    setHasContent(true);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-hidden overscroll-none">
            <div className="bg-white dark:bg-[#1a1d23] rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-xl max-h-[calc(100dvh-1.5rem)] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center shrink-0">
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Assinatura Digital</h3>
                        <p className="text-sm text-slate-500">Assine manualmente ou suba uma imagem.</p>
                    </div>
                    <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
                        <button 
                            onClick={() => { setMode('draw'); setUploadedPreviewUrl(''); setHasContent(false); }}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'draw' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                        >
                            Desenhar
                        </button>
                        <button 
                            onClick={() => { setMode('upload'); clearCanvas(); }}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'upload' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                        >
                            Subir Imagem
                        </button>
                    </div>
                </div>

                <div className="p-4 sm:p-8 flex flex-col items-center overflow-y-auto overscroll-contain">
                    {mode === 'draw' ? (
                        <div className="w-full">
                            <canvas
                                ref={canvasRef}
                                className="w-full h-48 sm:h-56 bg-slate-50 dark:bg-black/20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-crosshair touch-none select-none overscroll-contain"
                                style={{ touchAction: 'none' }}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseOut={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                            <div className="mt-4 flex justify-between">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Área de Assinatura</p>
                                <button onClick={clearCanvas} className="text-xs font-bold text-rose-500 hover:underline">Limpar Tudo</button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full">
                            {uploadedPreviewUrl ? (
                                <div className="flex flex-col items-center">
                                    <img src={uploadedPreviewUrl} className="max-h-48 object-contain border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-black/20" alt="Preview assinatura" />
                                    <div className="mt-4 flex justify-between w-full">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Preview da Assinatura</p>
                                        <button onClick={() => { setUploadedPreviewUrl(''); setHasContent(false); }} className="text-xs font-bold text-rose-500 hover:underline">Remover</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full py-10 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-black/20">
                                    <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">upload_file</span>
                                    <p className="text-sm text-slate-500 mb-4">Escolha um arquivo PNG ou JPG com sua assinatura</p>
                                    <label className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl font-bold text-sm cursor-pointer transition-all shadow-lg shadow-primary/20">
                                        Selecionar Arquivo
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 sm:p-6 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-slate-800 flex gap-3 shrink-0">
                    <button onClick={onCancel} className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-slate-600 dark:text-white hover:bg-white dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                    <button 
                        onClick={handleSave}
                        disabled={!hasContent}
                        className="flex-1 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all"
                    >
                        Confirmar Assinatura
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignaturePad;
