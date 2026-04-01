#!/bin/bash

echo "============================================"
echo "  Cosmeticos App - Setup Automatico"
echo "  White Bull & Kings Cosmeticos"
echo "============================================"
echo ""

# Verificar Node.js
echo "[1/5] Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERRO: Node.js nao encontrado!"
    echo "Instale em: https://nodejs.org (versao 18 ou superior)"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
echo "  Node.js encontrado: $(node -v)"

if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERRO: Node.js v18+ necessario. Voce tem $(node -v)"
    exit 1
fi

# Instalar dependencias
echo ""
echo "[2/5] Instalando dependencias..."
npm install
if [ $? -ne 0 ]; then
    echo "ERRO ao instalar dependencias!"
    exit 1
fi
echo "  Dependencias instaladas com sucesso!"

# Configurar .env
echo ""
echo "[3/5] Configurando arquivo .env..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "  Arquivo backend/.env criado."
    echo "  NOTA: Para integracao com Bling, edite backend/.env com suas credenciais."
    echo "  Sem credenciais Bling, o app funciona normalmente com dados locais."
else
    echo "  Arquivo backend/.env ja existe. Mantendo configuracao atual."
fi

# Seed do banco de dados
echo ""
echo "[4/5] Criando banco de dados com dados de teste..."
if [ -f data/cosmetics.db ]; then
    echo "  Banco ja existe. Deseja recriar? (s/N)"
    read -r resposta
    if [ "$resposta" = "s" ] || [ "$resposta" = "S" ]; then
        rm -f data/cosmetics.db
        node backend/src/seed.js
    else
        echo "  Mantendo banco existente."
    fi
else
    node backend/src/seed.js
fi

# Build do frontend
echo ""
echo "[5/5] Compilando frontend..."
cd frontend && npm run build 2>&1 | tail -5
cd ..

if [ ! -f frontend/build/index.html ]; then
    echo "ERRO ao compilar frontend!"
    exit 1
fi

echo ""
echo "============================================"
echo "  SETUP COMPLETO!"
echo "============================================"
echo ""
echo "  Para iniciar o servidor:"
echo "    node backend/src/server.js"
echo ""
echo "  Depois acesse no navegador:"
echo "    http://localhost:3001"
echo ""
echo "  === CREDENCIAIS ==="
echo "  Admin:  admin@cosmeticos.com / admin123"
echo "  Rep:    carlos@cosmeticos.com / rep123"
echo "  Rep:    maria@cosmeticos.com / rep123"
echo "  Rep:    joao@cosmeticos.com / rep123"
echo "  Rep:    ana@cosmeticos.com / rep123"
echo ""
echo "  Para acessar pelo celular, use o IP da"
echo "  sua maquina na mesma rede Wi-Fi:"
echo "    http://SEU-IP:3001"
echo "============================================"
