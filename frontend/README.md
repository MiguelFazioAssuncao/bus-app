# Bus App – Frontend

Interface web em React para um aplicativo de acompanhamento de ônibus, rotas e preferências do usuário. Este frontend consome a API do backend local (Node/Express) e implementa autenticação, pesquisa, direções favoritas e visualização de linhas em tempo real.

## Visão geral

- Tema escuro consistente com variáveis:
  - `--primary-color: #FFA652`
  - Cinzas: `#6F6F6F`, `#9C9A9A`
  - Fundo: `#363636`
  - Cards: `#2D2B2B`
- Navegação: Header fixo no topo com campo de busca; Footer fixo com atalhos (Directions, Stations, Lines).
- Páginas principais:
  - Directions: destinos frequentes (Home/Work) com tempo/distância e modal para salvar rotas.
  - Lines: lista de veículos e posições em tempo real (lt0, lt1, ta) com filtro, paginação e auto‑refresh.
  - Stations: mapa (Leaflet + OSM) e traçado de rotas via GraphHopper.
  - Search: busca com favoritos/recentes por usuário e modal “Add location”.
  - UserProfile: dados do usuário logado e logout.
  - Login/Register: autenticação com redirecionamento para Directions.

## Stack

- React + Vite
- React Router DOM
- Tailwind CSS (utilização de classes utilitárias no tema escuro)
- Font Awesome (ícones)
- Leaflet (mapa) + OpenStreetMap tiles
- Fetch/Axios para integração com a API (base: `http://localhost:3000`)

## Estrutura de pastas (resumo)

```
frontend/
  public/
    bus1.png, bus2.png, favicon.ico
  src/
    components/
      Header.jsx
      Footer.jsx
    pages/
      Directions.jsx
      Lines.jsx
      Stations.jsx
      Search.jsx
      Login.jsx
      Register.jsx
      UserProfile.jsx
    App.jsx
    App.css
  index.html
```

## Rotas

- `/login` – Login
- `/register` – Cadastro
- `/directions` – Destinos frequentes (Home/Work) com modal de configuração
- `/lines` – Linhas/veículos em tempo real
- `/stations` – Mapa e traçado de rotas (GraphHopper)
- `/search` – Tela de busca, favoritos e recentes
- `/profile` – Perfil do usuário, logout
- `/` – Redireciona para `/directions` se autenticado, senão `/login`

## Componentes

- `Header`: ícone do usuário (vai/volta do perfil) e campo de busca (abre `/search`).
- `Footer`: navegação inferior com realce da rota ativa.

## Funcionalidades principais

- Autenticação com JWT (token salvo em `localStorage`).
- `UserProfile` consome `GET /auth/me` para obter dados reais do usuário.
- `Directions` salva e busca preferências por usuário via endpoints de `directions` no backend; persiste `homeInfo`/`workInfo` no `localStorage`.
- `Lines` consome `GET /lines/positions` e mostra lt0/lt1/ta, com:
  - Filtro por texto (origem/destino/veículo)
  - Paginação e seleção de page size
  - Atualização manual e auto‑refresh 30s
  - Formatação local de data/hora
- `Stations` chama `GET /stations/route?point1=lat,lng&point2=lat,lng`, decodifica a polyline e desenha no Leaflet, com distância/tempo resumidos.
- `Search` gerencia Favoritos e Recentes por usuário (chaves `favorites_<userId>`/`recents_<userId>` no `localStorage`). Modal “Add location” adiciona itens em Recent (não favoritos por padrão).

## Variáveis e configuração

- API Base URL: `http://localhost:3000`
- JWT é armazenado em `localStorage.token` após login/registro.
- Usuário atual em `localStorage.user` (objeto com pelo menos `id`, `name`, `email`).
- Preferências locais:
  - `homeInfo`, `workInfo`: objetos usados na Directions.
  - `favorites_<userId>`, `recents_<userId>`: listas da Search.

## Como executar

1. Instale dependências:
   - `npm install`
2. Rode em desenvolvimento (porta padrão do Vite):
   - `npm run dev`
3. Build para produção:
   - `npm run build`
4. Preview do build:
   - `npm run preview`

Certifique‑se de que o backend está rodando em `http://localhost:3000`.

## Endpoints utilizados

- `POST /auth/login` – Login (retorna `{ token, user }`)
- `POST /auth/register` – Registro (retorna `{ token?, user }`)
- `GET /auth/me` – Dados do usuário autenticado
- `POST /directions/setHome` – Salva Home do usuário
- `POST /directions/setWork` – Salva Work do usuário
- `GET /directions/preferences?userId=...` – Busca preferências
- `GET /lines/positions` – Linhas/veículos em tempo real (usa `l[].vs[]`)
- `GET /stations/route?point1=..&point2=..` – Rota GraphHopper (polyline/geojson)

## Estilo e ícones

- Tailwind classes para compor o tema escuro (cores definidas acima).
- Font Awesome para ícones (usuário, busca, mapa, favorito, etc.).

## Estado e persistência

- `localStorage` é usado para:
  - `token`, `user`, `passwordLength`
  - `homeInfo`, `workInfo`
  - `favorites_<userId>`, `recents_<userId>`

## Dicas de solução de problemas

- Página Lines mostra “Nenhum veículo disponível”:
  - Verifique se `data.l[*].vs` existe no retorno do backend.
  - Confira CORS e status do endpoint `/lines/positions`.
- Mapa em Stations não renderiza/está cortado:
  - Verifique o carregamento do Leaflet via CDN e chame `invalidateSize` após montar.
  - Confirme os parâmetros `point1`/`point2` no formato `lat,lng`.
- Perfil sem dados de usuário:
  - Confira o token no `localStorage` e o retorno de `/auth/me`.

## Roadmap (idéias)

- Sincronizar Favorites/Recents com o backend por usuário.
- Seleção de ponto pelo mapa (Stations) para preencher “Add location”.
- Melhorias de acessibilidade e testes automatizados.

---

Feito com React + Vite e muito café. ☕
