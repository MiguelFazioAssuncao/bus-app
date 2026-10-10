# Deploy do Bus App

- Frontend: https://bus-app-neon.vercel.app
- API: https://bus-app-api-0nql.onrender.com
- Health check: https://bus-app-api-0nql.onrender.com/health
- Render: https://dashboard.render.com/web/srv-db57v8rrjlhs73co7cv0
- Neon: https://console.neon.tech/app/projects/raspy-sound-37195308

## Configuração

O frontend usa o projeto Vercel `bus-app`, diretório `frontend`, Node 22,
`npm ci`, `npm run build`, saída `dist` e `VITE_API_URL` apontando à API.
O arquivo `frontend/vercel.json` permite abrir rotas da aplicação diretamente.

A API usa o serviço gratuito Render `bus-app-api` no workspace My Workspace,
região Virginia e branch `main`. Build: `cd backend && npm ci`.
Inicialização: `cd backend && npm start`.
PostgreSQL gratuito externo: projeto Neon `bus-app`, produção, mesma região.

`DATABASE_URL` e `JWT_SECRET` ficam no ambiente Render, fora do repositório.
`DB_SSL=true` habilita TLS. `NODE_ENV=production` exige o segredo JWT.
`CORS_ORIGIN=https://bus-app-neon.vercel.app` autoriza o frontend publicado.
A aplicação autentica a conexão antes de escutar a porta e cria tabelas ausentes
com `sync()`, sem `alter` ou `force`. Mudanças futuras de schema devem usar migrações.

## Integrações pendentes

Configurar no ambiente do serviço Render:

- `TOKEN_LINE`: token da API Olho Vivo/SPTrans.
- `GRAPH_HOPPER_API_KEY`: chave GraphHopper.

Sem essas credenciais, os endpoints de dados ao vivo e rotas retornam 503 com feedback
claro. Cadastro, login e recursos locais usam o banco e funcionam separadamente.
Nunca colocar credenciais em variáveis `VITE_*`, Git ou documentação.

## Validação

Build e lint do frontend aprovados; npm audit após atualizações compatíveis: zero
vulnerabilidades reportadas. Frontend e rotas diretas retornam HTTP 200.
Health check da API confirmou PostgreSQL conectado. `/auth/me` sem token retorna 401.

Os planos gratuitos têm limites e o serviço Render pode levar mais tempo para responder
após inatividade. Revisar disponibilidade e limites nas plataformas antes de uso comercial.
