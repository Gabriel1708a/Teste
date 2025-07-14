# 🤖 Bot Administrador de Grupos WhatsApp

Bot completo para administração de grupos WhatsApp desenvolvido com **whatsapp-web.js**, com arquitetura modular preparada para integração futura com painel Laravel.

## 🚀 Características Principais

- ✅ **Conexão via Pairing Code** (evita QR Code)
- 🔄 **Reconexão automática** e sessões persistentes
- 📱 **Suporte multi-dispositivo** (Baileys)
- 🌐 **Preparado para integração Laravel** via API RESTful
- 🎯 **Comandos modulares** e configuração por grupo
- ⚡ **Sistemas automáticos** (anúncios, horários, agendamentos)

## 📋 Funcionalidades

### 🔈 Marcação Silenciosa
- **!all** - Menciona todos do grupo sem exibir os @

### 📢 Sistema de Anúncios Automáticos
- **!addads** mensagem|intervalo - Agenda envio automático
- **!listads** - Lista todos anúncios ativos
- **!rmads** ID - Remove anúncio pelo ID

### 👋 Sistema de Boas-Vindas
- **!bv** 1/0 - Ativa/desativa boas-vindas
- **!legendabv** mensagem - Personaliza mensagem com @user e @group

### 🔐 Abertura/Fechamento de Grupo
- **!abrirgrupo** / **!fechargrupo** - Controle manual
- **!abrirgp** HH:MM - Agenda abertura automática
- **!fechargp** HH:MM - Agenda fechamento automático
- **!afgp** 0 - Cancela agendamentos

### 🎁 Sorteios com Enquete
- **!sorteio** prêmio|tempo - Cria sorteio com enquete interativa

### 🍀 Horários Pagantes
- **!horarios** - Envia sugestão de horários
- **!horapg** 1/0 - Ativa/desativa envio automático
- **!addhorapg** tempo - Define intervalo de envio

### 🛡️ Sistema Anti-Link e Moderação
- **!banextremo** - Bane qualquer link (mais restritivo)
- **!banlinkgp** - Bane apenas links de grupos WhatsApp
- **!antilinkgp** - Deleta links de grupos (sem banir)
- **!antilink** - Deleta qualquer link (sem banir)
- **!ban** - Bane usuário (resposta ou menção)

## 🛠️ Instalação

### Pré-requisitos
- Node.js 16+ 
- NPM ou Yarn
- Google Chrome/Chromium

### 1. Clone o repositório
```bash
git clone <repositorio>
cd whatsapp-admin-bot
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Inicie o bot
```bash
npm start
```

### 4. Conecte ao WhatsApp

#### ⚡ Pairing Code Automático (Recomendado)

**ANTES de iniciar o bot:**

1. **Configure seu número** no arquivo `index.js` (linha 11):
```javascript
const MEU_NUMERO_WHATSAPP = '5511987654321'; // ← SEU NÚMERO AQUI
```

2. **Formato:** `55` + `DDD` + `número` (ex: `5511987654321`)

3. **Inicie o bot:**
```bash
npm start
```

4. **O pairing code aparecerá automaticamente:**
```
🔑 PAIRING CODE: A1B2C3D4
```

5. **No WhatsApp:** **Configurações** > **Aparelhos conectados** > **Conectar aparelho** > Digite o código

#### Opção B: QR Code (Fallback)
Se o pairing code falhar, escaneie o QR Code que aparecer

## 📁 Estrutura do Projeto

```
├── index.js                 # Arquivo principal
├── package.json            # Dependências e scripts
├── config/
│   └── database.js         # Sistema de configuração local
├── commands/               # Comandos modulares
│   ├── all.js             # Marcação silenciosa
│   ├── ads.js             # Anúncios automáticos
│   ├── welcome.js         # Boas-vindas
│   ├── group-schedule.js  # Abertura/fechamento
│   ├── sorteio.js         # Sorteios com enquete
│   ├── horarios.js        # Horários pagantes
│   └── antilink.js        # Sistema anti-link
├── utils/
│   └── helpers.js         # Funções utilitárias
├── data/                  # Dados locais (JSONs)
│   ├── groups.json        # Configurações por grupo
│   ├── ads.json           # Anúncios ativos
│   ├── horarios.json      # Horários e mensagens
│   └── images.json        # Configuração de imagens
└── sessions/              # Sessões persistentes
```

## 🎮 Como Usar

### Para Administradores

1. **Adicione o bot ao grupo** e **torne-o administrador**
2. **Configure as funções desejadas:**

```
# Ativar boas-vindas
!bv 1
!legendabv Bem-vindo @user ao @group! 🎉

# Criar anúncio automático
!addads Promoção especial todos os dias!|2h

# Agendar abertura/fechamento
!abrirgp 08:00
!fechargp 22:00

# Ativar proteção anti-link
!antilinkgp

# Criar sorteio
!sorteio iPhone 15 Pro|1h
```

### Para Integração Laravel (Futuro)

O bot está preparado para integração com painel web Laravel:

```javascript
// Verificação de plano via API
const response = await axios.get(`https://bottechwpp.com/api/groups/${groupId}/status`);

// Configurações via API
const config = await axios.get(`https://bottechwpp.com/api/groups/${groupId}/config`);
```

## ⚙️ Configuração Avançada

### Horários Pagantes
Edite `data/horarios.json` para personalizar:

```json
{
  "horarios": ["08:30", "09:15", "10:45", "..."],
  "messages": [
    "🍀 HORÁRIOS PAGANTES 💰\n\n🕐 Próximo: {horario}",
    "💰 DICA QUENTE! 🔥\n\n⏰ Horário: {horario}"
  ]
}
```

### Intervalos Aceitos
- **30m** = 30 minutos
- **1h** = 1 hora  
- **2h30m** = 2 horas e 30 minutos
- **1h15m** = 1 hora e 15 minutos

## 🔧 Desenvolvimento

### Adicionar Novo Comando

1. **Crie arquivo em `commands/`:**
```javascript
// commands/meucomando.js
const meuComando = async (client, message, args) => {
    // Lógica do comando
    await message.reply('Comando executado!');
};
module.exports = meuComando;
```

2. **Registre no `index.js`:**
```javascript
const meuComando = require('./commands/meucomando');
this.commands.set('!meucomando', meuComando);
```

### Sistema de Configuração
```javascript
const { loadConfig, saveConfig } = require('./config/database');

// Carregar configuração
const config = await loadConfig(groupId);

// Salvar configuração
await saveConfig(groupId, 'chave', 'valor');
await saveConfig(groupId, 'objeto.propriedade', 'valor');
```

## 🐛 Solução de Problemas

### Bot não responde
1. Verifique se o bot é **administrador do grupo**
2. Confirme que a **sessão está ativa**
3. Reinicie o bot: `npm start`

### Comandos não funcionam
1. Certifique-se de usar **!** no início
2. Apenas **administradores** podem usar comandos de configuração
3. Verifique **logs no console** para erros

### Reconexão constante
1. Verifique **conexão com internet**
2. Pode ser **limite de sessões** do WhatsApp
3. Remova pasta `sessions/` e reconecte

## 📈 Logs e Monitoramento

O bot registra todas as atividades importantes:

```
🤖 Bot WhatsApp conectado com sucesso!
📱 Número: 5511999999999
🔔 Comando !all executado no grupo - 15 membros marcados
📌 Anúncio criado - Grupo: xxxxx - ID: 1699123456789
🏆 Ganhador sorteado - Grupo: xxxxx - Ganhador: usuario
```

## 🔒 Segurança

- ✅ **Administradores são isentos** dos sistemas anti-link
- ✅ **Verificação de permissões** em todos os comandos
- ✅ **Não é possível banir outros admins**
- ✅ **Sessões criptografadas** localmente

## 🌐 Integração Futura Laravel

### API Endpoints Preparados:
- `GET /api/groups/{id}/status` - Status do plano
- `GET /api/groups/{id}/config` - Configurações do grupo
- `POST /api/groups/{id}/commands` - Execução remota
- `GET /api/groups/{id}/stats` - Estatísticas de uso

### Estrutura de Dados:
```javascript
// Identificação única por groupId
const groupId = "123456789-123456@g.us";

// Configurações modulares
const config = {
    welcomeEnabled: true,
    adsEnabled: true,
    planActive: true,
    lastUpdate: "2024-01-01T00:00:00.000Z"
};
```

## 🚀 Scripts Disponíveis

```bash
npm start      # Inicia o bot
npm run dev    # Modo desenvolvimento (nodemon)
```

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o bot:
- 🌐 **Site:** bottechwpp.com
- 📧 **Email:** suporte@bottechwpp.com

---

**Desenvolvido com ❤️ para comunidades WhatsApp**