import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, Phone, Search, Store, UserPlus, User, X } from 'lucide-react';
import { api } from '../lib/api';
import { useData } from '../lib/store';
import { Segmented, useToast } from './ui';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export default function ClientPicker({ clientType, clientId, onChange }) {
  const { clients, reloadClients } = useData();
  const toast = useToast();
  const selected = clients.find((c) => c.id === clientId);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [quick, setQuick] = useState(null); // {name, phone, notes}
  const [saving, setSaving] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const close = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const matches = useMemo(() => {
    const q = norm(query);
    const list = q ? clients.filter((c) => norm(c.name).includes(q) || norm(c.phone).includes(q)) : clients;
    return list.slice(0, 8);
  }, [clients, query]);
  const exact = clients.some((c) => norm(c.name) === norm(query));

  const pick = (c) => {
    onChange({ client_type: 'cliente', client_id: c.id });
    setQuery('');
    setOpen(false);
    setQuick(null);
  };

  const saveQuick = async () => {
    if (!quick?.name?.trim()) return toast('Informe o nome do cliente', 'error');
    setSaving(true);
    try {
      const c = await api.post('/api/clients', quick);
      await reloadClients();
      pick(c);
      toast(`Cliente "${c.name}" cadastrado`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Segmented
        value={clientType}
        onChange={(v) => onChange({ client_type: v, client_id: v === 'cliente' ? clientId : null })}
        options={[
          { value: 'balcao', label: 'Avulso / Balcão', icon: <Store size={15} /> },
          { value: 'interno', label: 'Uso Interno', icon: <Building2 size={15} /> },
          { value: 'cliente', label: 'Cliente cadastrado', icon: <User size={15} /> },
        ]}
      />

      {clientType === 'cliente' && (
        <div ref={boxRef} className="relative">
          {selected && !open ? (
            <div className="flex items-center justify-between rounded-lg border border-teal-500/50 bg-teal-500/10 px-3 py-2">
              <div>
                <div className="font-bold text-white">{selected.name}</div>
                {selected.phone && (
                  <div className="flex items-center gap-1 text-xs text-teal-200"><Phone size={12} /> {selected.phone}</div>
                )}
              </div>
              <button type="button" className="btn btn-ghost py-1 text-xs" onClick={() => { setOpen(true); setQuery(''); }}>
                Trocar
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  autoFocus={!selected}
                  className="input pl-9"
                  placeholder="Buscar cliente por nome ou telefone…"
                  value={query}
                  onFocus={() => setOpen(true)}
                  onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (matches[0] && query) pick(matches[0]);
                      else if (query.trim() && !exact) setQuick({ name: query.trim(), phone: '', notes: '' });
                    }
                  }}
                />
              </div>
              {open && !quick && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
                  {matches.map((c) => (
                    <button key={c.id} type="button" onClick={() => pick(c)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-zinc-800">
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-xs text-zinc-500">{c.phone}</span>
                    </button>
                  ))}
                  {!matches.length && !query && (
                    <div className="px-3 py-2 text-sm text-zinc-500">Nenhum cliente cadastrado ainda. Digite um nome.</div>
                  )}
                  {query.trim() && !exact && (
                    <button type="button" onClick={() => setQuick({ name: query.trim(), phone: '', notes: '' })}
                      className="flex w-full items-center gap-2 border-t border-zinc-800 bg-amber-400/10 px-3 py-2.5 text-left font-bold text-amber-300 hover:bg-amber-400/20">
                      <UserPlus size={16} /> + Cadastrar novo cliente rápido: “{query.trim()}”
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {quick && (
            <div className="mt-2 space-y-2 rounded-xl border border-amber-400/50 bg-amber-400/5 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-amber-300"><UserPlus size={16} /> Cadastro rápido</span>
                <button type="button" onClick={() => setQuick(null)} className="text-zinc-400 hover:text-white"><X size={16} /></button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="input" placeholder="Nome *" value={quick.name} autoFocus
                  onChange={(e) => setQuick({ ...quick, name: e.target.value })} />
                <input className="input" placeholder="WhatsApp / Telefone" value={quick.phone}
                  onChange={(e) => setQuick({ ...quick, phone: e.target.value })} />
                <input className="input sm:col-span-2" placeholder="Observação (opcional)" value={quick.notes}
                  onChange={(e) => setQuick({ ...quick, notes: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), saveQuick())} />
              </div>
              <div className="flex justify-end">
                <button type="button" className="btn btn-primary py-1.5" onClick={saveQuick} disabled={saving}>
                  <Check size={16} /> Salvar e selecionar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
