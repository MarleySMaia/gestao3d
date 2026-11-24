import { useMemo, useState } from 'react';
import { MessageCircle, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { api } from '../lib/api';
import { useData } from '../lib/store';
import { Field, Modal, useToast } from '../components/ui';

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const waLink = (phone) => {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}`;
};

export default function ClientsPage() {
  const { clients, reloadClients } = useData();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);

  const list = useMemo(() => {
    const n = norm(q);
    return clients.filter((c) => !n || norm(`${c.name} ${c.phone} ${c.notes}`).includes(n));
  }, [clients, q]);

  const save = async () => {
    if (!edit.name?.trim()) return toast('Informe o nome', 'error');
    try {
      if (edit.id) await api.put(`/api/clients/${edit.id}`, edit);
      else await api.post('/api/clients', edit);
      await reloadClients();
      setEdit(null);
      toast('Cliente salvo');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const remove = async () => {
    try {
      await api.del(`/api/clients/${del.id}`);
      await reloadClients();
      toast('Cliente excluído');
    } catch (e) {
      toast(e.message, 'error');
    }
    setDel(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-white sm:text-2xl"><Users className="text-amber-400" /> Clientes</h1>
          <p className="text-sm text-zinc-400">{clients.length} cliente(s) cadastrado(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEdit({ name: '', phone: '', notes: '' })}><Plus size={18} /> Novo cliente</button>
      </div>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input className="input pl-10" placeholder="Buscar cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card divide-y divide-zinc-800">
        {list.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white">{c.name}</div>
              <div className="text-sm text-zinc-400">{c.phone || 'sem telefone'}{c.notes ? ` • ${c.notes}` : ''}</div>
            </div>
            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-300">{c.orders_count} pedido(s)</span>
            {waLink(c.phone) && (
              <a href={waLink(c.phone)} target="_blank" rel="noreferrer" className="btn btn-ghost py-1.5 text-emerald-300">
                <MessageCircle size={15} /> WhatsApp
              </a>
            )}
            <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-amber-300" onClick={() => setEdit(c)} title="Editar"><Pencil size={17} /></button>
            <button className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400" onClick={() => setDel(c)} title="Excluir"><Trash2 size={17} /></button>
          </div>
        ))}
        {!list.length && <div className="p-8 text-center text-zinc-500">Nenhum cliente encontrado.</div>}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} size="sm" title={edit?.id ? 'Editar cliente' : 'Novo cliente'}
        footer={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancelar</button><button className="btn btn-primary" onClick={save}>Salvar</button></>}>
        {edit && (
          <div className="space-y-3">
            <Field label="Nome *"><input className="input" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="WhatsApp / Telefone"><input className="input" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            <Field label="Observação"><textarea className="input" rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
      <Modal open={!!del} onClose={() => setDel(null)} size="sm" title="Excluir cliente?"
        footer={<><button className="btn btn-ghost" onClick={() => setDel(null)}>Cancelar</button><button className="btn btn-danger" onClick={remove}>Excluir</button></>}>
        <p className="text-zinc-300"><b className="text-white">{del?.name}</b> será removido. Os pedidos dele continuam salvos, marcados como “Balcão”.</p>
      </Modal>
    </div>
  );
}
