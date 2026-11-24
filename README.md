# Gestão 3D

Aplicação local para gestão de pedidos de impressão 3D, controle de pagamentos e calculadora de precificação.

## Rodar

```bash
npm install      # só na primeira vez
npm run dev      # API (porta 3001) + interface (http://localhost:5180)
```

`npm start` gera o build do front e serve tudo direto pelo backend em http://localhost:3001.

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
