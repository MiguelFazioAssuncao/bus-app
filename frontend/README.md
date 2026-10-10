# Bus App — Frontend

Interface em português para explorar São Paulo, consultar posições de ônibus e organizar destinos. A modernização mantém o laranja da marca (`#FFA652`), com temas claro/escuro, navegação adaptada ao celular e acesso às consultas sem cadastro.

O diagnóstico, o design system, a estrutura das páginas, as animações e as prioridades estão em [UX_DESIGN.md](docs/UX_DESIGN.md).

## Desenvolvimento

Na pasta `frontend`, instale as dependências do lockfile:

```sh
npm ci
```

Comandos disponíveis:

```sh
npm run dev      # Servidor Vite, normalmente em http://localhost:5173
npm run build    # Gera a versão de produção em dist/
npm run lint     # Verifica JavaScript/JSX e regras de React
npm run preview # Serve o build para conferência local
```

A interface usa React 19, React Router e Vite. O design é composto por CSS com tokens, ícones SVG locais e ilustrações SVG. Telas secundárias carregam sob demanda; o Leaflet é carregado apenas na tela de mapa.

## API e ambientes

A base da API é definida em `src/lib/api.js`:

- **Desenvolvimento:** a base padrão é `/api`. O proxy de `vite.config.js` encaminha `/api/auth/login`, por exemplo, para `http://localhost:3000/auth/login`.
- **Produção:** configure um encaminhamento `/api` no servidor de hospedagem ou defina `VITE_API_URL` antes do build. Para uma API em outro domínio, configure também o CORS do backend.

Exemplo de `.env.local` quando a API usa um endereço diferente:

```dotenv
VITE_API_URL=https://api.exemplo.com
```

Variáveis com prefixo `VITE_` entram no código público do frontend. As chaves de SPTrans, GraphHopper, banco e JWT ficam no backend. Consulte [backend/README.md](../backend/README.md) e [backend/.env.example](../backend/.env.example) para preparar os serviços.

As requisições têm prazo de 15 segundos, mensagens de erro em português e cancelamento quando a tela é abandonada. Consultas a serviços reais precisam do backend configurado; autenticação, SPTrans e GraphHopper não foram validados com credenciais reais nesta modernização.

## Páginas e navegação

| Rota | Conteúdo |
| --- | --- |
| `/` | Abre `/directions`, inclusive para visitantes. |
| `/directions` | Visão geral, origem/destino, localização atual, atalhos de casa/trabalho e descobertas. |
| `/search` | Busca no catálogo local, filtros por categoria, favoritos, recentes e cadastro de lugares. |
| `/lines` | Linhas e sentidos com posições disponíveis na SPTrans, busca, ordenação, favoritas e paginação. |
| `/stations` | Mapa, origem/destino, cálculo de trajeto e resultado com distância e duração. |
| `/profile` | Dados da conta autenticada, tema e saída; visitantes recebem acesso a entrar/criar conta. |
| `/login` | Entrada por e-mail e senha, com validação, feedback e acesso sem conta. |
| `/register` | Cadastro de nome, e-mail e senha com pelo menos 8 caracteres. |

No desktop, a navegação fica na lateral. No celular, as quatro áreas principais aparecem na barra inferior. Foco visível, atalhos para o conteúdo, rótulos de formulário, sugestões navegáveis por teclado e modais com foco controlado apoiam a navegação acessível. As animações respeitam `prefers-reduced-motion`.

## Comportamentos principais

### Destinos e busca

A busca oferece sugestões de um catálogo pequeno em `src/lib/locations.js` e dos lugares salvos neste navegador. Ela ignora acentos e diferenças entre maiúsculas e minúsculas. As coordenadas do catálogo são pontos aproximados de destinos; elas não representam uma base de paradas de ônibus.

O frontend ainda não possui geocodificação de endereços. Para lugares fora do catálogo, informe latitude e longitude decimais, como `-23.5505,-46.6333`. A localização atual depende da permissão do navegador e de um contexto seguro (HTTPS ou localhost).

Casa, trabalho e outros favoritos podem ser salvos sem cadastro. A preferência de tema, as linhas favoritas e os destinos recentes também ficam no dispositivo. Os dados de lugares são separados por usuário ou visitante, sem sincronização com outros navegadores ou dispositivos.

### Linhas de ônibus

`GET /lines/positions` fornece os dados de linhas e veículos. A tela mostra somente posições informadas pela SPTrans, com atualização manual e automática a cada 30 segundos enquanto a página estiver visível. Em falhas de atualização, a última consulta bem-sucedida continua identificada pelo horário de recebimento.

É possível buscar número/terminal, ordenar, filtrar favoritas e abrir no mapa a posição de um veículo quando houver coordenadas válidas. As posições não fornecem previsão de chegada. Uma linha favorita aparece na lista quando a consulta informa dados para ela.

### Mapa e trajetos

O mapa usa Leaflet e tiles do OpenStreetMap, com marcadores de partida/destino e estados de carregamento/erro. O backend consulta GraphHopper por `GET /stations/route?point1=lat,lng&point2=lat,lng`.

O perfil atual do backend é **carro**: a duração e o traçado são referências viárias, sem itinerário de ônibus, conexão entre linhas ou previsão de chegada. A interface apresenta essa informação junto ao planejamento. Integrar roteamento por transporte público é uma próxima etapa.

### Conta

`POST /auth/register` cria a conta e retorna o usuário, sem iniciar uma sessão. Após o cadastro, a interface abre o login com uma confirmação. Somente `POST /auth/login`, que retorna `{ token, user }`, salva o acesso.

`GET /auth/me` confirma os dados exibidos no perfil. Sessões inválidas ou expiradas recebem um convite para entrar novamente. Sair limpa `token`, `user` e o antigo `passwordLength`; a interface não guarda nem registra senha ou seu comprimento. Os formulários permitem envio pelo teclado e alternância da visibilidade da senha.

## Persistência local

| Chave | Uso |
| --- | --- |
| `token`, `user` | Sessão JWT e perfil seguro retornados pelo backend. |
| `busapp-theme` | Tema claro ou escuro; na ausência de preferência salva, usa o tema do sistema. |
| `homeInfo_<id>`, `workInfo_<id>` | Atalhos de casa/trabalho. |
| `favorites_<id>`, `recents_<id>` | Lugares favoritos e recentes. |
| `favoriteLines_<id>` | Identificadores das linhas favoritas. |

O sufixo é o ID da conta ou `anon` para visitantes. Leituras inválidas voltam a um estado vazio; o usuário recebe feedback quando o navegador impede uma gravação. O indicador offline explica que consultas, mapas e autenticação precisam de conexão. O aplicativo ainda não inclui cache de instalação/offline por service worker.

## Estrutura

```text
src/
  components/
    AppLayout.jsx       # Navegação, área principal e indicador offline
    AuthFrame.jsx       # Estrutura compartilhada de login/cadastro
    CityIllustration.jsx
    LocationInput.jsx   # Combobox com sugestões e teclado
    TransitMap.jsx      # Leaflet, tiles e geometria do trajeto
    ui.jsx              # Ícones, botões de tema, modal, skeleton e estados vazios
  lib/
    api.js              # Base da API, timeout e cancelamento
    locations.js        # Catálogo, normalização e resolução de coordenadas
    storage.js          # Persistência por usuário/visitante
    theme.js            # Tema e assinatura de mudanças
  pages/                # Páginas das rotas
  styles/               # Estilos por área
  App.jsx               # Rotas e carregamento sob demanda
  App.css               # Layout e componentes comuns
  index.css             # Tokens de design e estilos de base
```

`Header.jsx` e `Footer.jsx` permanecem como arquivos legados; o fluxo atual usa `AppLayout.jsx`.

## Conferência e próximas integrações

Antes de publicar, execute build/lint e confira as telas em celular e desktop, nos dois temas, com teclado e movimento reduzido. Valide também os estados vazios, falhas de rede, sessão expirada e serviços reais com o ambiente do backend.

As próximas prioridades de produto são geocodificação de endereços, itinerários de transporte público e sincronização de lugares com a conta. Medições de Core Web Vitals e auditoria de acessibilidade no ambiente publicado completam a verificação de produção.
