import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export function Modal({ open, onClose, title, children, footer, size = 'lg', closeOnBackdrop = true }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-6 ${
        size === 'sm' ? 'items-end p-0 sm:p-6' : 'items-stretch'
      }`}
      onMouseDown={(e) => closeOnBackdrop && e.target === e.currentTarget && onClose?.()}>
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex w-full ${widths[size]} flex-col overflow-hidden border-zinc-700 bg-zinc-900 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl sm:border ${
          size === 'sm'
            ? 'max-h-[90dvh] rounded-t-2xl border-t'
            : 'h-dvh sm:h-auto'
        }`}>
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:py-4">
          <h2 className="truncate text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="-mr-1 shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white" aria-label="Fechar">
            <X size={22} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-900 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Badge({ className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-bold ${className}`}>
      {children}
    </span>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

/** input numérico que aceita vírgula, com prefixo/sufixo opcional */
export function NumInput({ value, onChange, prefix, suffix, className = '', ...rest }) {
  return (
    <div className={`relative flex items-center ${className}`}>
      {prefix && <span className="pointer-events-none absolute left-3 text-sm font-semibold text-zinc-500">{prefix}</span>}
      <input
        type="text"
        inputMode="decimal"
        className={`input ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-12' : ''}`}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ''))}
        onFocus={(e) => e.target.select()}
        {...rest}
      />
      {suffix && <span className="pointer-events-none absolute right-3 text-sm font-semibold text-zinc-500">{suffix}</span>}
    </div>
  );
}

export function Segmented({ options, value, onChange, className = '', size = 'md' }) {
  const sm = size === 'sm';
  return (
    <div className={`inline-flex flex-wrap rounded-lg border border-zinc-700 bg-zinc-950 ${sm ? 'p-0.5' : 'p-1'} ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex items-center gap-1.5 rounded-md font-semibold transition ${sm ? 'px-2 py-0.5 text-xs' : 'px-3 py-1.5 text-sm'} ${
            value === o.value ? 'bg-amber-400 text-on-primary' : 'text-zinc-300 hover:bg-zinc-800'
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- toasts ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, type = 'ok') => {
    const id = Math.random();
    setItems((s) => [...s, { id, msg, type }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 md:inset-x-auto md:right-4 md:bottom-4 md:items-end">
        {items.map((t) => (
          <div key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold shadow-xl ${
              t.type === 'error' ? 'border-red-500/60 bg-red-950 text-red-200' : 'border-emerald-500/60 bg-emerald-950 text-emerald-200'
            }`}>
            {t.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function ImageLightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [src, onClose]);
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
      <button className="absolute right-4 top-4 rounded-full bg-zinc-800 p-2 text-white hover:bg-zinc-700" aria-label="Fechar">
        <X size={22} />
      </button>
      <img src={src} alt="" className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
    </div>
  );
}
