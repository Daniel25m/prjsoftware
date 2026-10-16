# PetLume | Documentação detalhada

## Visão geral

PetLume é uma plataforma web de adoção responsável. O objetivo é centralizar anúncios de animais e facilitar o contato entre doadores e adotantes, com acompanhamento básico das solicitações.

O projeto está organizado como monorepo: a interface React consome uma API REST em FastAPI, que persiste os dados em PostgreSQL por meio do SQLAlchemy.

## Escopo do MVP

### Funcionalidades implementadas

- Cadastro e login de usuários com perfil de adotante ou doador.
- Senhas armazenadas com hash e autenticação por token JWT.
- Cadastro de anúncio por doador, incluindo foto por URL, espécie, porte, idade, cidade e descrição.
- Busca de pets disponíveis por espécie, porte e cidade.
- Solicitação de adoção por adotante.
- Consulta das solicitações enviadas pelo adotante e recebidas pelo doador.
- Aprovação ou recusa de uma solicitação pelo doador.
- Bloqueio de solicitações para pets indisponíveis e de ações incompatíveis com o perfil da conta.

### Fora do escopo atual

Marketplace, eventos, campanhas beneficentes, feed da comunidade, favoritos, upload de imagens, edição de perfil, notificações e administração de usuários ainda não estão implementados.

## Tecnologias

- **Front-end:** React, Vite, Axios e Lucide React.
- **Back-end:** Python, FastAPI, Pydantic Settings, SQLAlchemy e PyJWT.
- **Banco de dados:** PostgreSQL com psycopg. Os testes usam SQLite temporário.
- **Testes:** pytest, httpx e FastAPI TestClient.

## Estrutura do repositório

```text
.
├── backend/
│   ├── app/
│   │   ├── api/routes/       # Rotas de conta, pets e adoções
│   │   ├── core/             # Configurações da aplicação
│   │   ├── db/               # Engine, sessões e base ORM
│   │   ├── models/           # Entidades SQLAlchemy
│   │   ├── dependencies.py   # Autenticação e autorização
│   │   ├── schemas.py        # Validação de entrada e saída
│   │   ├── security.py       # Hash de senha e tokens JWT
│   │   └── main.py           # Criação da aplicação e rotas
│   ├── tests/                # Testes dos fluxos principais
│   ├── .env.example
│   ├── requirements.txt
│   └── requirements-dev.txt
├── frontend/
│   ├── src/                  # Interface React
│   ├── package.json
│   └── vite.config.js         # Servidor e proxy local para /api
├── README.md                 # Resumo do projeto
└── README-detalhado.md       # Este documento
```

## Requisitos

- Python 3.12 ou superior.
- Node.js 22 ou superior e npm.
- PostgreSQL instalado e iniciado localmente.

## Configurar o banco

O arquivo `backend/.env.example` usa esta URL por padrão:

```text
postgresql+psycopg://petlume:petlume-dev@localhost:5432/petlume
```

Crie o usuário e o banco no PostgreSQL, se ainda não existirem:

```sql
CREATE USER petlume WITH PASSWORD 'petlume-dev';
CREATE DATABASE petlume OWNER petlume;
```

Se você já usa outro usuário ou senha no PostgreSQL, ajuste `DATABASE_URL` no arquivo `backend/.env`.

## Configurar e executar o back-end

Na raiz do repositório:

```bash
cd backend
python -m venv .venv
```

Ative o ambiente virtual. No Linux/macOS:

```bash
source .venv/bin/activate
```

No Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Instale as dependências, crie o arquivo local de configuração e inicie a API:

```bash
python -m pip install -r requirements.txt
cp .env.example .env
python -m app.seed_demo
uvicorn app.main:app --reload
```

No PowerShell, use `Copy-Item .env.example .env` no lugar de `cp`.

A API fica em http://localhost:8000. A documentação interativa dos endpoints fica em http://localhost:8000/docs e o schema OpenAPI em http://localhost:8000/openapi.json.

### Variáveis de ambiente

| Variável | Finalidade | Valor local de exemplo |
| --- | --- | --- |
| `DATABASE_URL` | URL de conexão do SQLAlchemy | `postgresql+psycopg://petlume:petlume-dev@localhost:5432/petlume` |
| `JWT_SECRET_KEY` | Chave usada para assinar tokens de acesso | Defina uma chave longa e aleatória |
| `CORS_ORIGINS` | Origens autorizadas para chamadas do navegador | `http://localhost:5173` |
| `SEED_DEMO_DATA` | Permite criar os dados de demonstração | `true` |

O arquivo `.env` não deve ser enviado ao Git. Os valores de exemplo são apenas para desenvolvimento.

### Criação das tabelas

Ao iniciar, a API chama `SQLAlchemy Base.metadata.create_all` para criar tabelas que ainda não existem. Isso não altera tabelas já existentes se os modelos forem modificados. Como este projeto não usa ferramenta de migrations, mudanças futuras no schema precisam ser aplicadas manualmente ao banco ou exigir uma estratégia de atualização antes de distribuir a nova versão.

## Configurar e executar o front-end

Em outro terminal, na raiz do repositório:

```bash
cd frontend
npm ci
npm run dev
```

A interface fica em http://localhost:5173. Durante o desenvolvimento, o Vite encaminha as chamadas iniciadas em `/api` para http://localhost:8000. Se a API estiver em outro endereço, defina `VITE_API_PROXY` antes de iniciar o Vite.

Para gerar a versão de produção e verificar o código:

```bash
npm run build
npm run lint
```

## Usuários de demonstração

Com `SEED_DEMO_DATA=true`, o comando `python -m app.seed_demo` cria alguns anúncios e uma conta de doador:

- E-mail: `protetor@petlume.local`
- Senha: `adote123`

Use essas credenciais somente em ambiente local. Para não inserir dados de demonstração, defina `SEED_DEMO_DATA=false` no `backend/.env`.

## Fluxo principal de adoção

1. O doador cria uma conta e publica o anúncio de um pet.
2. O adotante cria uma conta, busca pets disponíveis e envia uma mensagem de interesse.
3. O anúncio passa para o status `adoption_pending` e deixa de aparecer na busca pública.
4. O doador aprova ou recusa a solicitação.
5. Se aprovada, a solicitação fica `approved` e o pet fica `adopted`. Se recusada, o pet volta a ficar `available`.

## Endpoints principais

Todas as rotas da API usam o prefixo `/api`.

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| `GET` | `/health` | Público | Verifica acesso ao banco de dados |
| `POST` | `/auth/register` | Público | Cria uma conta de adotante ou doador |
| `POST` | `/auth/login` | Público | Autentica e retorna token JWT |
| `GET` | `/auth/me` | Autenticado | Retorna a conta da sessão atual |
| `GET` | `/pets` | Público | Lista pets disponíveis; aceita `species`, `size` e `city` |
| `GET` | `/pets/{pet_id}` | Público | Consulta um anúncio específico |
| `GET` | `/pets/mine` | Doador | Lista anúncios do doador autenticado |
| `POST` | `/pets` | Doador | Publica um anúncio |
| `POST` | `/pets/{pet_id}/adoptions` | Adotante | Solicita adoção de um pet |
| `GET` | `/adoptions/mine` | Adotante | Lista solicitações enviadas |
| `GET` | `/adoptions/incoming` | Doador | Lista solicitações recebidas |
| `PATCH` | `/adoptions/{adoption_id}/decision` | Doador | Aprova ou recusa uma solicitação pendente |

Os endpoints autenticados recebem `Authorization: Bearer <token>` no cabeçalho HTTP.

## Testes do back-end

Os testes usam um banco SQLite em memória e não precisam de uma instância PostgreSQL ativa:

```bash
cd backend
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

A suíte cobre o ciclo de solicitação/aprovação e a autorização de publicação de anúncios por perfil.

## Próximos passos sugeridos

- Adicionar atualização segura do schema quando os modelos mudarem.
- Implementar edição e remoção dos anúncios.
- Permitir envio e validação de imagens em vez de aceitar apenas URL.
- Adicionar testes para cadastro, login, filtros, recusa e conflitos de solicitações.
- Rever configurações de segurança antes de qualquer implantação pública.
