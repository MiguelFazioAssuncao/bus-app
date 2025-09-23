# Bus App SA - Backend

Este projeto é o backend para o aplicativo de transporte Bus App SA, desenvolvido em Node.js com Express e Sequelize.

## Sumário

- [Pré-requisitos](#pré-requisitos)
- [Configuração do ambiente](#configuração-do-ambiente)
- [Execução local](#execução-local)
- [Execução com Docker](#execução-com-docker)
- [Endpoints principais](#endpoints-principais)

---

## Pré-requisitos

- Node.js >= 18
- npm
- Banco de dados PostgreSQL (local ou via Docker)
- (Opcional) Docker e Docker Compose

## Configuração do ambiente

1. Clone o repositório:
   ```sh
   git clone https://github.com/MiguelFazioAssuncao/bus-app-sa.git
   cd bus-app-sa/backend
   ```
2. Instale as dependências:
   ```sh
   npm install
   ```
3. Configure o arquivo `.env` com suas credenciais e chaves:
   ```env
   PORT=8080
   JWT_SECRET=senhasecreta
   GRAPH_HOPPER_API_KEY=seu_token_aqui
   GRAPH_HOPPER_BASE_URL=https://graphhopper.com/api/1
   # ... outros parâmetros ...
   ```
4. Configure o banco de dados em `src/database/client.js` conforme sua instância local ou Docker.

## Execução local

1. Certifique-se que o banco de dados está rodando.
2. Execute o backend:
   ```sh
   npm start
   ```
   O servidor estará disponível em `http://localhost:8080` (ou porta definida no `.env`).

## Execução com Docker

1. Certifique-se que Docker e Docker Compose estão instalados.
2. Crie um arquivo `docker-compose.yml` semelhante ao exemplo abaixo:
   ```yaml
   version: "3.8"
   services:
     db:
       image: postgres:15
       environment:
         POSTGRES_USER: user
         POSTGRES_PASSWORD: password
         POSTGRES_DB: busapp
       ports:
         - "5432:5432"
     backend:
       build: .
       environment:
         PORT: 8080
         JWT_SECRET: senhasecreta
         GRAPH_HOPPER_API_KEY: seu_token_aqui
         GRAPH_HOPPER_BASE_URL: https://graphhopper.com/api/1
       ports:
         - "8080:8080"
       depends_on:
         - db
   ```
3. Execute:
   ```sh
   docker-compose up --build
   ```

## Endpoints principais

### Posições das linhas

- `GET /lines/positions`
  **Exemplo de retorno:**
  ```json
  [
    {
    "hr": "15:10",
    "l": [
        {
            "c": "2008-10",
            "cl": 33665,
            "sl": 2,
            "lt0": "CPTM ITAIM PAULISTA",
            "lt1": "JD. NSA. SRA. DO CAMINHO",
            "qv": 5,
            "vs": [
                {
                    "p": 36060,
                    "a": true,
                    "ta": "2025-09-23T18:10:40Z",
                    "py": -23.52118775,
                    "px": -46.38765975,
                    "sv": null,
                    "is": null
                }
        }
  ]
  ```

### Rota entre pontos

- `GET /stations/route`
  **Parâmetros (query):**

  - `point1`: string, coordenada inicial no formato "lat,lng" (ex: -23.55052,-46.633308)
  - `point2`: string, coordenada final no formato "lat,lng" (ex: -23.551234,-46.634567)

  **Exemplo de requisição:**

  ```http
  GET /stations/route?point1=-23.55052,-46.633308&point2=-23.551234,-46.634567
  ```

  **Exemplo de retorno:**

  ```json
  {
    "hints": {
      "visited_nodes.sum": 8,
      "visited_nodes.average": 8
    },
    "info": {
      "copyrights": ["GraphHopper", "OpenStreetMap contributors"],
      "took": 1,
      "road_data_timestamp": "2025-09-17T13:00:00Z"
    },
    "paths": [
      {
        "distance": 130.199,
        "weight": 31.293842,
        "time": 29341,
        "transfers": 0,
        "legs": [],
        "points_encoded": true,
        "points_encoded_multiplier": 100000,
        "bbox": [-46.63466, -23.551193, -46.63388, -23.550572],
        "points": "jwvnCvds{GEBc@zAzBz@",
        "instructions": [
          {
            "distance": 54.449,
            "heading": 324.61,
            "sign": 0,
            "interval": [0, 2],
            "text": "Continue na Praça da Sé",
            "time": 19602,
            "street_name": "Praça da Sé"
          },
          {
            "distance": 75.75,
            "sign": -2,
            "interval": [2, 3],
            "text": "Vire à esquerda na Praça da Sé",
            "time": 9739,
            "street_name": "Praça da Sé"
          },
          {
            "distance": 0,
            "sign": 4,
            "last_heading": 204.13340324920972,
            "interval": [3, 3],
            "text": "Destino alcançado!",
            "time": 0,
            "street_name": ""
          }
        ],
        "details": {},
        "ascend": 3.18304443359375,
        "descend": 1.3599853515625,
        "snapped_waypoints": "jwvnCvds{GpAzC"
      }
    ]
  }
  ```

### Autenticação

- `POST /auth/login`
  **Payload:**

  ```json
  {
    "email": "usuario@email.com",
    "password": "senha"
  }
  ```

  **Exemplo de retorno:**

  ```json
  {
    "message": "Login successful",
    "token": "<jwt_token>"
  }
  ```

- `POST /auth/register`
  **Payload:**
  ```json
  {
    "name": "Novo Usuário",
    "email": "novo@email.com",
    "password": "senha"
  }
  ```
  **Exemplo de retorno:**
  ```json
  {
    "message": "User created successfully",
    "user": {
      "created_at": "2025-09-23T17:54:12.911Z",
      "id": 2,
      "name": "Novo Usuário",
      "email": "novo@email.com",
      "password": "<password>"
    }
  }
  ```

### Direções

- `POST /directions/setHome`
  **Payload:**
  ```json
  {
    "userId": 1,
    "homeName": "Casa",
    "point1": "-23.55052,-46.633308",
    "point2": "-23.551234,-46.634567"
  }
  ```
  **Exemplo de retorno:**
  ```json
  {
    "message": "Home atualizado com sucesso.",
    "home": {
      "name": "Casa",
      "point": "-23.55052,-46.633308",
      "distanceMeters": 130,
      "timeMinutes": 1,
      "distance": "0.13 km",
      "time": "1 min"
    },
    "routePreview": {
      "distance": "0.13 km",
      "time": "1 min"
    }
  }
  ```
- `POST /directions/setWork`
  **Payload:**
  ```json
  {
    "userId": 1,
    "workName": "Trabalho",
    "point1": "-23.55052,-46.633308",
    "point2": "-23.551234,-46.634567"
  }
  ```
  **Exemplo de retorno:**
  ```json
  {
    "message": "Work atualizado com sucesso.",
    "work": {
      "name": "Trabalho",
      "point": "-23.55052,-46.633308",
      "distanceMeters": 130,
      "timeMinutes": 1,
      "distance": "0.13 km",
      "time": "1 min"
    },
    "routePreview": {
      "distance": "0.13 km",
      "time": "1 min"
    }
  }
  ```

## Observações

- Certifique-se de configurar corretamente as variáveis de ambiente e o banco de dados.
- Para uso da API GraphHopper, obtenha uma chave em https://graphhopper.com/
- Para dúvidas, consulte os arquivos de configuração e o código fonte.
