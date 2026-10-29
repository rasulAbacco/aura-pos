import { createContext, useCallback, useContext, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { cx } from '../utils/cx.js';

const ToastCtx = createContext(() => {});

/** toast('Saved') or toast('Something failed', 'error') from anywhere under <ToastProvider>. */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random();
    setItems((x) => [...x, { id, message, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg', t.tone === 'error' ? 'bg-rose-800 text-white' : 'bg-stone-900 text-white')}>
            {t.tone === 'error' ? <FiAlertTriangle className="mt-0.5 shrink-0" /> : <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-400" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
