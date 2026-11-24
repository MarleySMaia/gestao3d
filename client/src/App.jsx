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
  { id: 'calculadora', label: 'Calculadora', icon: Calculator },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'config', label: 'Configurações', icon: Settings2 },
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

  const go = (id) => { window.location.hash = id; setTab(id); };
  const clearPrefill = useCallback(() => setPrefill(null), []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-400 p-1.5 text-on-primary"><Box size={20} strokeWidth={2.5} /></div>
            <span className="text-lg font-black tracking-tight text-white">Gestão<span className="text-amber-400">3D</span></span>
          </div>
          <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => go(id)}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  tab === id ? 'bg-zinc-800 text-amber-300' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}>
                <Icon size={17} /> {label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            aria-label="Alternar tema claro/escuro"
            className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-bold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
          >
            {theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-indigo-400" />}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-5">
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
