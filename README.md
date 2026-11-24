# Gestão 3D

Aplicação local para gestão de pedidos de impressão 3D, controle de pagamentos e calculadora de precificação.

## Rodar

```bash
npm install      # só na primeira vez
npm run dev      # API (porta 3001) + interface (http://localhost:5180)
```

`npm start` gera o build do front e serve tudo direto pelo backend em http://localhost:3001.

## Docker / Dockhand

Imagem única (API + interface) na porta **3001**. Banco SQLite e imagens ficam em `/data`, no volume `gestao3d-data`.

```bash
docker compose up -d --build     # acesse http://IP-DO-SERVIDOR:3001
```

| Variável    | Padrão              | Para quê                                  |
|-------------|---------------------|-------------------------------------------|
| `HOST_PORT` | `3001`              | porta exposta no host (compose)           |
| `TZ`        | `America/Sao_Paulo` | fuso usado em "hoje", atrasos e mês pago  |

- **Dockhand:** crie um stack a partir do repositório Git apontando para `docker-compose.yml` (repo privado → informe um token do GitHub com acesso de leitura).
- **Atualizar:** puxe o código novo e rode `docker compose up -d --build` de novo — o volume mantém os dados.
- **Backup:** `docker run --rm -v gestao3d-data:/data -v "$PWD":/bkp alpine tar czf /bkp/gestao3d-backup.tgz -C /data .`
- **Usar pasta do host em vez de volume:** troque `gestao3d-data:/data` por `./data:/data` e dê permissão ao usuário do container (`sudo chown -R 1000:1000 ./data`).
- Saúde: `GET /api/health` (usado no `HEALTHCHECK` da imagem).

## Estrutura

```
server/            Node + Express + better-sqlite3
  index.js         rotas da API (/api/...)
  db.js            schema e dados iniciais (PLA R$110/kg, PETG R$130/kg, tarifas)
  database.sqlite  banco (criado automaticamente)
  uploads/         imagens dos pedidos
client/            React + Vite + Tailwind + lucide-react
  src/pages/       Pedidos, Calculadora, Clientes, Configurações
  src/components/  Calculator, OrderModal, ClientPicker, ImageField (Ctrl+V)
  src/lib/calc.js  fórmula de precificação
```

## Backup

Copie `server/database.sqlite` e a pasta `server/uploads/`.

## Atalhos

- **N**: novo pedido (na tela de Pedidos)
- **Ctrl+V** com o formulário de pedido aberto: cola o print (Win+Shift+S) como imagem do pedido
- Clicar nos cards do topo filtra a tabela (a receber / em produção / atrasados)
