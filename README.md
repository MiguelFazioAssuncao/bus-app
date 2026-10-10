# Bus App

Aplicativo de mobilidade para São Paulo com React + Vite no frontend e Express + PostgreSQL no backend. A interface prioriza planejamento, descoberta de destinos e consulta de posições de ônibus da SPTrans.

- Navegação em português, responsiva e acessível por teclado.
- Temas claro/escuro com preferência salva.
- Catálogo de locais, busca instantânea, favoritos e recentes no navegador.
- Consulta de linhas com filtros, ordenação, paginação e tratamento de dados desatualizados.
- Mapa OpenStreetMap com trajetos viários da GraphHopper.
- Login, cadastro e perfil conectados aos endpoints existentes.

**Limite de produto:** a GraphHopper está configurada com `profile: car`. Os trajetos calculados são para automóveis, não itinerários de ônibus nem previsões de chegada. Posições de veículos são fornecidas separadamente pela SPTrans.

## Desenvolvimento

```bash
cd frontend
npm ci
npm run dev
```

O Vite encaminha `/api` ao backend em `http://localhost:3000`. Configure os serviços conforme [backend/README.md](backend/README.md). Para hospedar o frontend separadamente, use `VITE_API_URL` com a origem pública da API antes do build.

```bash
npm run build
npm run lint
```

Documentação: [frontend](frontend/README.md), [diagnóstico e design system](frontend/docs/UX_DESIGN.md), [verificação da modernização](frontend/docs/VERIFICATION.md).

As consultas públicas começam em `/directions`; `/search`, `/lines` e `/stations` não exigem login. Conta disponível em `/login`, `/register` e `/profile`.
