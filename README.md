# Bus App SA 

Uma aplicação completa para consulta de transporte público, com integração às APIs SPTrans (Olho Vivo) e GraphHopper para planejamento de rotas.

## Sobre o Projeto

O Bus App SA é uma solução moderna para facilitar o uso do transporte público. A aplicação oferece:

- **Consulta em tempo real** de posições dos ônibus
- **Planejamento de rotas** inteligente
- **Gerenciamento de preferências** (casa e trabalho)
- **Interface intuitiva** e responsiva

## Arquitetura

O projeto está dividido em duas partes principais:

### Backend (API REST)
- **Node.js** com Express
- **PostgreSQL** como banco de dados
- **Integração** com APIs SPTrans e GraphHopper
- **Autenticação JWT**

### 🎨 Frontend

Interface web em React que consome a API do backend e entrega a experiência ao usuário final.

— Tecnologias
- React + Vite
- React Router DOM
- Tailwind CSS (tema escuro)
- Font Awesome (ícones)
- Leaflet + OpenStreetMap (mapa)

— Funcionalidades
- Header com campo de busca que abre a tela de Search; Footer com navegação (Directions, Stations, Lines)
- Autenticação (Login/Register) com redirecionamento para Directions
- UserProfile com dados do usuário via `GET /auth/me` e logout
- Directions com “Home/Work” e modal para salvar rotas e preferências por usuário
- Lines com dados em tempo real de `/lines/positions` (filtro, paginação, auto‑refresh)
- Stations com traçado de rota (GraphHopper) e visualização no Leaflet
- Search com favoritos e recentes por usuário (persistência no localStorage) e modal “Add location”

— Rotas principais
- `/login`, `/register`, `/directions`, `/lines`, `/stations`, `/search`, `/profile`

— Scripts (na pasta frontend/)
- `npm install` — instala dependências
- `npm run dev` — desenvolvimento (Vite)
- `npm run build` — build de produção
- `npm run preview` — preview do build

📖 **[Documentação completa do Frontend →](./frontend/README.md)**


📖 **[Documentação completa do Backend →](./backend/README.md)**
