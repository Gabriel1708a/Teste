# 🚀 GUIA COMPLETO - Deploy na VPS

## 📋 PASSO A PASSO COMPLETO

### 1️⃣ **CONFIGURAR SEU NÚMERO**

**ANTES de iniciar o bot, configure seu número WhatsApp:**

```bash
# Editar o arquivo principal
nano index.js
```

**Encontre a linha 11:**
```javascript
const MEU_NUMERO_WHATSAPP = '5511999999999'; // ← SUBSTITUA PELO SEU NÚMERO
```

**Substitua pelo SEU número completo:**
```javascript
const MEU_NUMERO_WHATSAPP = '5511987654321'; // ← SEU NÚMERO REAL
```

### 📱 **FORMATO DO NÚMERO:**
- **Brasil:** `55` + **DDD** + **Número**
- **São Paulo:** `5511987654321`
- **Rio de Janeiro:** `5521987654321`
- **Belo Horizonte:** `5531987654321`
- **Brasília:** `5561987654321`

---

### 2️⃣ **CLONAR E INSTALAR**

```bash
# Navegar para home
cd ~

# Clonar repositório
git clone https://github.com/Gabriel1708a/Teste.git

# Entrar na pasta
cd Teste

# Instalar dependências
npm install
```

---

### 3️⃣ **CONFIGURAR NÚMERO**

```bash
# Editar o arquivo
nano index.js

# Alterar a linha 11:
# DE: const MEU_NUMERO_WHATSAPP = '5511999999999';
# PARA: const MEU_NUMERO_WHATSAPP = 'SEU_NUMERO_AQUI';

# Salvar: Ctrl+X → Y → Enter
```

---

### 4️⃣ **TESTAR O BOT**

```bash
# Executar pela primeira vez
npm start
```

**Você verá:**
```
🚀 Iniciando Bot WhatsApp Admin...
🆕 Nova sessão, será necessário parear dispositivo
📱 Número configurado: 5511987654321
📱 Gerando pairing code automaticamente...
🔑 Solicitando pairing code para 5511987654321...

🎯 ================================
🔑 PAIRING CODE: A1B2C3D4
🎯 ================================
📱 COMO USAR:
1. Abra o WhatsApp no seu celular
2. Vá em: Configurações > Aparelhos conectados
3. Toque em: Conectar um aparelho
4. Digite o código: A1B2C3D4
🎯 ================================
```

---

### 5️⃣ **PAREAR NO WHATSAPP**

1. **WhatsApp** → **Configurações** ⚙️
2. **Aparelhos conectados**
3. **Conectar um aparelho**
4. **Digite o código** (ex: A1B2C3D4)
5. **Aguarde** a confirmação

**Quando conectar:**
```
✅ Autenticação realizada com sucesso!
🤖 Bot WhatsApp conectado com sucesso!
📱 Número: 5511987654321
```

---

### 6️⃣ **CONFIGURAR PM2 (Rodar 24/7)**

```bash
# Parar o bot (Ctrl+C)

# Instalar PM2
npm install -g pm2

# Criar arquivo de configuração
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'whatsapp-bot',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Criar pasta de logs
mkdir -p logs

# Iniciar com PM2
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Ver logs
pm2 logs whatsapp-bot
```

---

### 7️⃣ **TESTAR O BOT**

```bash
# Adicionar o número do bot a um grupo
# Tornar o bot administrador do grupo
# Testar comandos:
```

**Comandos de teste:**
```
!all
!bv 1
!addads Teste de anúncio|1h
!sorteio Prêmio Teste|5m
!horarios
```

---

## 🔧 COMANDOS ÚTEIS PM2

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs whatsapp-bot

# Parar bot
pm2 stop whatsapp-bot

# Reiniciar bot
pm2 restart whatsapp-bot

# Remover bot
pm2 delete whatsapp-bot

# Salvar configuração
pm2 save

# Auto-start no boot
pm2 startup
```

---

## 📊 MONITORAMENTO

```bash
# Status detalhado
pm2 show whatsapp-bot

# Logs específicos
pm2 logs whatsapp-bot --lines 100

# Uso de recursos
htop

# Espaço em disco
df -h
```

---

## 🚨 SOLUÇÃO DE PROBLEMAS

### **❌ Pairing code não aparece:**
```bash
# Verificar se o número está correto
nano index.js
# Linha 11: const MEU_NUMERO_WHATSAPP = 'SEU_NUMERO';

# Reiniciar
pm2 restart whatsapp-bot
```

### **❌ Bot desconecta:**
```bash
# Ver logs
pm2 logs whatsapp-bot

# Reiniciar
pm2 restart whatsapp-bot
```

### **❌ Comando não funciona:**
```bash
# Verificar se o bot é admin do grupo
# Verificar se há erros nos logs
pm2 logs whatsapp-bot --lines 50
```

---

## ✅ CHECKLIST FINAL

- [ ] ✅ Número configurado no código
- [ ] ✅ Dependências instaladas
- [ ] ✅ Bot pareado com WhatsApp
- [ ] ✅ PM2 rodando
- [ ] ✅ Bot testado em grupo
- [ ] ✅ Comandos funcionando
- [ ] ✅ Bot é admin do grupo

---

## 🎯 RESULTADO

**🤖 Bot administrador WhatsApp rodando 24/7 na VPS!**

**Status:** `pm2 status`  
**Logs:** `pm2 logs whatsapp-bot`  
**Comandos:** `!all`, `!bv 1`, `!addads`, `!sorteio`, etc.

---

## 📱 NÚMEROS DE EXEMPLO

**Formato correto para diferentes estados:**

| Estado | DDD | Exemplo |
|--------|-----|---------|
| São Paulo | 11 | `5511987654321` |
| Rio de Janeiro | 21 | `5521987654321` |
| Belo Horizonte | 31 | `5531987654321` |
| Brasília | 61 | `5561987654321` |
| Salvador | 71 | `5571987654321` |
| Fortaleza | 85 | `5585987654321` |
| Recife | 81 | `5581987654321` |
| Porto Alegre | 51 | `5551987654321` |

**⚠️ IMPORTANTE:** Sempre use o formato `55` + `DDD` + `número` (sem espaços ou símbolos)