import { useCallback, useEffect, useState } from 'react';
import { Box, Calculator, ClipboardList, Moon, Settings2, Sun, Users, WifiOff } from 'lucide-react';
import { useTheme } from './lib/theme';
import { DataProvider, useData } from './lib/store';
import { ToastProvider } from './components/ui';
import OrdersPage from './pages/OrdersPage';
import CalculatorPage from './pages/CalculatorPage';
import ClientsPage from './pages/ClientsPage';
import SettingsPage from './pages/SettingsPage';

const TABS = [
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardList },
  { id: 'calculadora', label: 'Calculadora', short: 'Calcular', icon: Calculator },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'config', label: 'Configurações', short: 'Ajustes', icon: Settings2 },
];

const getHashTab = () => {
  const h = window.location.hash.replace('#', '');
  return TABS.some((t) => t.id === h) ? h : 'pedidos';
};

function Shell() {
  const { settings, error } = useData();
  const [tab, setTab] = useState(getHashTab);
  const [prefill, setPrefill] = useState(null);
  const [theme, toggleTheme] = useTheme();

  useEffect(() => {
    const onHash = () => setTab(getHashTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id) => {
    window.location.hash = id;
    setTab(id);
    window.scrollTo({ top: 0 });
  };
  const clearPrefill = useCallback(() => setPrefill(null), []);
  const current = TABS.find((t) => t.id === tab) || TABS[0];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-[max(1rem,env(safe-area-inset-left))] py-2.5 md:gap-6 md:py-3">
          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-lg bg-amber-400 p-1.5 text-on-primary"><Box size={20} strokeWidth={2.5} /></div>
            <span className="text-lg font-black tracking-tight text-white">Gestão<span className="text-amber-400">3D</span></span>
          </div>

          {/* título da aba atual (celular) */}
          <span className="truncate text-sm font-semibold text-zinc-400 md:hidden">· {current.label}</span>

          {/* navegação superior (tablet / desktop) */}
          <nav className="hidden flex-1 gap-1 md:flex">
            {TABS.map(({ id, label, short, icon: Icon }) => (
              <button key={id} onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  tab === id ? 'bg-zinc-800 text-amber-300' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}>
                <Icon size={17} />
                {/* tablet em pé: rótulos curtos; telas largas: completos */}
                <span className="lg:hidden">{short || label}</span>
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-label="Alternar tema claro/escuro"
            className="ml-auto flex h-10 shrink-0 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-bold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 md:ml-0"
          >
            {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-400" />}
            <span className="hidden lg:inline">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
          </button>
        </div>
      </header>

      {/* navegação inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {TABS.map(({ id, label, short, icon: Icon }) => (
            <button key={id} onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-bold transition active:bg-zinc-900 ${
                tab === id ? 'text-amber-400' : 'text-zinc-500'
              }`}>
              {tab === id && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-amber-400" />}
              <Icon size={22} strokeWidth={tab === id ? 2.5 : 2} />
              {short || label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1500px] px-[max(1rem,env(safe-area-inset-left))] pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:pb-8 md:pt-5">
        {error ? (
          <div className="card mx-auto mt-10 max-w-lg p-8 text-center">
            <WifiOff className="mx-auto mb-3 text-red-400" size={40} />
            <h2 className="text-lg font-bold text-white">Não foi possível conectar ao servidor</h2>
            <p className="mt-2 text-sm text-zinc-400">Verifique se o backend está rodando (<code className="text-amber-300">npm run dev</code> na pasta do projeto) e recarregue a página.</p>
            <p className="mt-2 font-mono text-xs text-zinc-600">{error}</p>
          </div>
        ) : !settings ? (
          <div className="p-10 text-center text-zinc-500">Carregando…</div>
        ) : (
          <>
            {tab === 'pedidos' && <OrdersPage newOrderPrefill={prefill} clearPrefill={clearPrefill} />}
            {tab === 'calculadora' && <CalculatorPage onCreateOrder={(p) => { setPrefill(p); go('pedidos'); }} />}
            {tab === 'clientes' && <ClientsPage />}
            {tab === 'config' && <SettingsPage />}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <Shell />
      </DataProvider>
    </ToastProvider>
  );
}
