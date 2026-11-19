import { createContext, useCallback, useContext, useState } from 'react';

const Ctx = createContext(() => {});
/** Short messages at the bottom of the screen ("Booking requested", errors). */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((text, tone = 'ok') => {
    const id = Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}>
        {items.map((t) => (
          <p key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className={`animate-rise max-w-md rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ${t.tone === 'error' ? 'bg-rose-700 text-white' : 'bg-ink text-white'}`}>{t.text}</p>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
