import { useEffect, useRef, useState } from 'react';
import { ClipboardPaste, ImagePlus, Loader2, Maximize2, Trash2, Upload } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from './ui';

/**
 * Campo de imagem do pedido: upload por arquivo, arrastar-e-soltar
 * ou Ctrl+V de um print (Win+Shift+S) em qualquer lugar do formulário.
 */
export default function ImageField({ image, onChange, onUploaded, onZoom }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [flash, setFlash] = useState(false);
  const toast = useToast();

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast('O arquivo precisa ser uma imagem', 'error');
      return;
    }
    setBusy(true);
    try {
      const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const named = file.name ? file : new File([file], `print.${ext}`, { type: file.type });
      const { filename } = await api.uploadImage(named);
      onUploaded?.(filename);
      onChange(filename);
      setFlash(true);
      setTimeout(() => setFlash(false), 700);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  // Ctrl+V global enquanto o formulário está aberto
  const handleRef = useRef(handleFile);
  handleRef.current = handleFile;
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          e.preventDefault();
          handleRef.current(item.getAsFile());
          return;
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <div
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`group relative flex aspect-[16/9] w-full sm:aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed outline-none transition
          focus:border-amber-400 ${drag ? 'border-amber-400 bg-amber-400/10' : 'border-zinc-700 bg-zinc-950'}
          ${flash ? 'ring-4 ring-emerald-400/60' : ''}`}
      >
        {busy && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
            <Loader2 className="animate-spin text-amber-300" size={32} />
          </div>
        )}
        {image ? (
          <>
            <img src={`/uploads/${image}`} alt="Imagem do pedido" className="h-full w-full cursor-zoom-in object-contain"
              onClick={() => onZoom?.(`/uploads/${image}`)} />
            <div className="absolute right-2 top-2 flex gap-1.5 opacity-90">
              <button type="button" title="Ampliar" onClick={() => onZoom?.(`/uploads/${image}`)}
                className="rounded-lg bg-black/70 p-1.5 text-white hover:bg-black">
                <Maximize2 size={16} />
              </button>
              <button type="button" title="Remover imagem" onClick={() => onChange(null)}
                className="rounded-lg bg-black/70 p-1.5 text-red-300 hover:bg-red-600 hover:text-white">
                <Trash2 size={16} />
              </button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-zinc-400 hover:text-zinc-200">
            <ImagePlus size={40} className="text-zinc-600 group-hover:text-amber-400" />
            {/* mouse/teclado */}
            <span className="text-sm font-semibold pointer-coarse:hidden">Clique, arraste uma imagem</span>
            <span className="flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs font-bold text-amber-300 pointer-coarse:hidden">
              <ClipboardPaste size={14} /> ou cole um print com Ctrl + V
            </span>
            <span className="text-[11px] text-zinc-500 pointer-coarse:hidden">Win + Shift + S no fatiador → Ctrl + V aqui</span>
            {/* celular/tablet */}
            <span className="hidden text-sm font-semibold pointer-coarse:inline">Toque para tirar foto ou escolher da galeria</span>
          </button>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn btn-ghost flex-1 py-1.5" onClick={() => inputRef.current?.click()}>
          <Upload size={15} /> {image ? 'Trocar imagem' : 'Enviar arquivo'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
