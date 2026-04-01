# Cosmeticos App - Guia de Instalacao

App de pedidos mobile para **White Bull Cosmeticos** e **Kings Cosmeticos**.

---

## Pre-requisitos

- **Node.js v18+** - Baixe em https://nodejs.org
- **Git** - Para clonar o repositorio

### Como verificar se ja tem Node.js:
```bash
node -v
npm -v
```

Se aparecer um numero de versao (ex: v18.17.0), voce ja tem instalado.

---

## Setup Rapido (automatico)

```bash
git clone https://github.com/marcelooracle10g-ops/Claude.git
cd Claude
git checkout claude/cosmetics-mobile-orders-app-aFA11
bash setup.sh
```

Depois inicie:
```bash
node backend/src/server.js
```

Acesse: **http://localhost:3001**

---

## Setup Manual (passo a passo)

### 1. Clonar o repositorio

```bash
git clone https://github.com/marcelooracle10g-ops/Claude.git
cd Claude
git checkout claude/cosmetics-mobile-orders-app-aFA11
```

### 2. Instalar dependencias

```bash
npm install
```

> Se der erro de permissao no Linux/Mac, use: `sudo npm install`

### 3. Configurar variaveis de ambiente

```bash
cp backend/.env.example backend/.env
```

O arquivo `backend/.env` tera este conteudo:
```
PORT=3001
JWT_SECRET=cosmetics-app-secret-2024

# Bling API V3 - Substitua com suas credenciais
BLING_CLIENT_ID=your-bling-client-id
BLING_CLIENT_SECRET=your-bling-client-secret
BLING_ACCESS_TOKEN=your-bling-access-token
BLING_REFRESH_TOKEN=your-bling-refresh-token
```

> **IMPORTANTE:** Sem credenciais do Bling, o app funciona normalmente
> para criar pedidos locais. Apenas a busca de produtos e clientes
> do Bling nao estara disponivel.

### 4. Criar banco de dados com dados de teste

```bash
node backend/src/seed.js
```

Voce vera:
```
Database seeded successfully!
Admin: admin@cosmeticos.com / admin123
Representante: carlos@cosmeticos.com / rep123
```

### 5. Compilar o frontend

```bash
cd frontend
npm run build
cd ..
```

### 6. Iniciar o servidor

```bash
node backend/src/server.js
```

Voce vera: `Server running on port 3001`

### 7. Acessar o app

No navegador: **http://localhost:3001**

No celular (mesma rede Wi-Fi):
1. Descubra o IP da sua maquina:
   - Windows: `ipconfig` (procure "IPv4")
   - Mac/Linux: `ifconfig` ou `hostname -I`
2. No celular, acesse: **http://SEU-IP:3001**

---

## Credenciais de Teste

| Perfil | Email | Senha |
|--------|-------|-------|
| Administrador | admin@cosmeticos.com | admin123 |
| Rep (White Bull) | carlos@cosmeticos.com | rep123 |
| Rep (White Bull) | maria@cosmeticos.com | rep123 |
| Rep (Kings) | joao@cosmeticos.com | rep123 |
| Rep (Kings) | ana@cosmeticos.com | rep123 |

---

## Configurar Integracao com Bling

### Como obter as credenciais do Bling:

1. Acesse o **Bling** (https://www.bling.com.br)
2. Va em **Preferencias > Integradores e API**
3. Clique em **Cadastrar novo aplicativo**
4. Preencha os dados do aplicativo
5. Copie o **Client ID** e **Client Secret**
6. Use o fluxo OAuth2 para gerar o **Access Token** e **Refresh Token**

### Fluxo OAuth2 do Bling:

1. No navegador, acesse:
```
https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=SEU_CLIENT_ID&state=123
```
2. Autorize o acesso
3. Voce sera redirecionado com um `code` na URL
4. Troque o code por tokens:
```bash
curl -X POST https://www.bling.com.br/Api/v3/oauth/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic BASE64(client_id:client_secret)" \
  -d '{"grant_type":"authorization_code","code":"SEU_CODE"}'
```
5. Copie o `access_token` e `refresh_token` para o `backend/.env`

---

## Resolucao de Problemas

### "npm install" deu erro
- Verifique se tem Node.js v18+: `node -v`
- Tente limpar cache: `npm cache clean --force`
- Tente novamente: `rm -rf node_modules && npm install`

### "EADDRINUSE: port 3001 already in use"
- Outro processo esta usando a porta
- Windows: `netstat -ano | findstr :3001` e mate o processo
- Mac/Linux: `lsof -i :3001` e `kill PID`
- Ou mude a porta no `backend/.env`: `PORT=3002`

### Nao consigo acessar pelo celular
- Verifique se PC e celular estao na mesma rede Wi-Fi
- Verifique se o firewall nao esta bloqueando a porta 3001
- Windows: Permita Node.js no Windows Firewall

### Produtos nao carregam
- Configure as credenciais do Bling no `backend/.env`
- Verifique se o token nao expirou (validade de 6h)
- O app renova automaticamente usando o refresh_token
