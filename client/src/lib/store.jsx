import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

/** dados compartilhados: configurações, filamentos e clientes */
export function DataProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [filaments, setFilaments] = useState([]);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState(null);

  const reloadSettings = useCallback(() => api.get('/api/settings').then(setSettings), []);
  const reloadFilaments = useCallback(() => api.get('/api/filaments').then(setFilaments), []);
  const reloadClients = useCallback(() => api.get('/api/clients').then(setClients), []);

  useEffect(() => {
    Promise.all([reloadSettings(), reloadFilaments(), reloadClients()]).catch((e) =>
      setError(e.message || 'Não foi possível conectar à API'),
    );
  }, [reloadSettings, reloadFilaments, reloadClients]);

  return (
    <DataCtx.Provider
      value={{ settings, setSettings, filaments, clients, reloadSettings, reloadFilaments, reloadClients, error }}
    >
      {children}
    </DataCtx.Provider>
  );
}
