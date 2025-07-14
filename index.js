const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const path = require('path');

// Importar configurações e utilitários
const { loadConfig, saveConfig } = require('./config/database');
const { isAdmin, formatTime } = require('./utils/helpers');

// Importar comandos
const allCommand = require('./commands/all');
const adsCommand = require('./commands/ads');
const welcomeCommand = require('./commands/welcome');
const groupScheduleCommand = require('./commands/group-schedule');
const sorteioCommand = require('./commands/sorteio');
const horariosCommand = require('./commands/horarios');
const antilinkCommand = require('./commands/antilink');

// ========================================
// 📱 CONFIGURE SEU NÚMERO AQUI:
const MEU_NUMERO_WHATSAPP = '5511999999999'; // ← SUBSTITUA PELO SEU NÚMERO
// Formato: 55 + DDD + número (ex: 5511987654321)
// ========================================

class WhatsAppBot {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: "bot-admin",
                dataPath: "./sessions"
            }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        this.commands = new Map();
        this.setupCommands();
        this.setupEventListeners();
    }

    async requestPairingCode(phoneNumber) {
        try {
            console.log(`🔑 Solicitando pairing code para ${phoneNumber}...`);
            const code = await this.client.requestPairingCode(phoneNumber);
            console.log('');
            console.log('🎯 ================================');
            console.log('🔑 PAIRING CODE:', code);
            console.log('🎯 ================================');
            console.log('📱 COMO USAR:');
            console.log('1. Abra o WhatsApp no seu celular');
            console.log('2. Vá em: Configurações > Aparelhos conectados');
            console.log('3. Toque em: Conectar um aparelho');
            console.log('4. Digite o código:', code);
            console.log('🎯 ================================');
            console.log('');
            return code;
        } catch (error) {
            console.error('❌ Erro ao solicitar pairing code:', error);
        }
    }

    setupCommands() {
        // Registrar todos os comandos
        this.commands.set('!all', allCommand);
        this.commands.set('!addads', adsCommand.addAds);
        this.commands.set('!listads', adsCommand.listAds);
        this.commands.set('!rmads', adsCommand.removeAds);
        this.commands.set('!bv', welcomeCommand.toggleWelcome);
        this.commands.set('!legendabv', welcomeCommand.setWelcomeMessage);
        this.commands.set('!abrirgrupo', groupScheduleCommand.openGroup);
        this.commands.set('!fechargrupo', groupScheduleCommand.closeGroup);
        this.commands.set('!abrirgp', groupScheduleCommand.scheduleOpen);
        this.commands.set('!fechargp', groupScheduleCommand.scheduleClose);
        this.commands.set('!afgp', groupScheduleCommand.cancelSchedule);
        this.commands.set('!sorteio', sorteioCommand);
        this.commands.set('!horarios', horariosCommand.sendHorarios);
        this.commands.set('!horapg', horariosCommand.toggleAutoSend);
        this.commands.set('!addhorapg', horariosCommand.setInterval);
        this.commands.set('!banextremo', antilinkCommand.banExtremo);
        this.commands.set('!banlinkgp', antilinkCommand.banLinkGp);
        this.commands.set('!antilinkgp', antilinkCommand.antiLinkGp);
        this.commands.set('!antilink', antilinkCommand.antiLink);
        this.commands.set('!ban', antilinkCommand.banUser);
    }

    setupEventListeners() {
        this.client.on('qr', async (qr) => {
            console.log('📱 Gerando pairing code automaticamente...');
            await this.requestPairingCode(MEU_NUMERO_WHATSAPP);
        });

        this.client.on('ready', () => {
            console.log('🤖 Bot WhatsApp conectado com sucesso!');
            console.log('📱 Número:', this.client.info.wid.user);
            
            // Inicializar sistemas automáticos
            this.initializeAutomaticSystems();
        });

        this.client.on('authenticated', () => {
            console.log('✅ Autenticação realizada com sucesso!');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('❌ Falha na autenticação:', msg);
        });

        this.client.on('disconnected', (reason) => {
            console.log('⚠️ Bot desconectado:', reason);
            console.log('🔄 Tentando reconectar...');
            this.reconnect();
        });

        this.client.on('message_create', async (message) => {
            await this.handleMessage(message);
        });

        this.client.on('group_join', async (notification) => {
            await this.handleGroupJoin(notification);
        });
    }

    async handleMessage(message) {
        if (message.fromMe) return;
        if (!message.from.includes('@g.us')) return; // Apenas grupos

        const groupId = message.from;
        const messageBody = message.body.trim();
        const isUserAdmin = await isAdmin(this.client, groupId, message.author);

        // Verificar sistemas anti-link antes dos comandos
        const antilinkResult = await antilinkCommand.checkMessage(this.client, message, groupId);
        if (antilinkResult.shouldDelete) {
            await message.delete(true);
            if (antilinkResult.shouldBan && isUserAdmin) {
                // Lógica de ban seria implementada aqui
            }
            return;
        }

        // Processar comandos
        if (messageBody.startsWith('!')) {
            const commandParts = messageBody.split(' ');
            const command = commandParts[0].toLowerCase();

            if (this.commands.has(command)) {
                // Verificar se o comando requer admin
                const adminCommands = ['!all', '!addads', '!rmads', '!bv', '!legendabv', 
                                     '!abrirgrupo', '!fechargrupo', '!abrirgp', '!fechargp', 
                                     '!afgp', '!horapg', '!addhorapg', '!banextremo', 
                                     '!banlinkgp', '!antilinkgp', '!antilink', '!ban'];

                if (adminCommands.includes(command) && !isUserAdmin) {
                    await message.reply('⚠️ Apenas administradores podem usar este comando!');
                    return;
                }

                try {
                    await this.commands.get(command)(this.client, message, commandParts.slice(1));
                } catch (error) {
                    console.error(`Erro no comando ${command}:`, error);
                    await message.reply('❌ Erro ao executar comando. Tente novamente.');
                }
            }
        }
    }

    async handleGroupJoin(notification) {
        const groupId = notification.chatId;
        const config = await loadConfig(groupId);

        if (config.welcomeEnabled) {
            const welcomeMsg = config.welcomeMessage || 
                `🎉 Bem-vindo(a) ao grupo @user! 👋\n\n🙌 Esperamos que se sinta em casa no @group!`;

            // Processar variáveis na mensagem
            const chat = await this.client.getChatById(groupId);
            const contact = await this.client.getContactById(notification.recipientIds[0]);
            
            let finalMessage = welcomeMsg
                .replace('@user', `@${contact.id.user}`)
                .replace('@group', chat.name);

            await this.client.sendMessage(groupId, finalMessage, {
                mentions: [contact.id._serialized]
            });
        }
    }

    async initializeAutomaticSystems() {
        // Inicializar anúncios automáticos
        await adsCommand.initializeAds(this.client);
        
        // Inicializar horários pagantes automáticos
        await horariosCommand.initializeAutoSend(this.client);
        
        // Inicializar agendamentos de grupo
        await groupScheduleCommand.initializeSchedules(this.client);
    }

    async reconnect() {
        setTimeout(() => {
            console.log('🔄 Reconectando...');
            this.client.initialize();
        }, 5000);
    }

    async start() {
        console.log('🚀 Iniciando Bot WhatsApp Admin...');
        
        // Verificar se há sessão salva
        const sessionPath = './sessions/session-bot-admin';
        if (fs.existsSync(sessionPath)) {
            console.log('📁 Sessão encontrada, conectando...');
        } else {
            console.log('🆕 Nova sessão, será necessário parear dispositivo');
            console.log('📱 Número configurado:', MEU_NUMERO_WHATSAPP);
        }

        await this.client.initialize();
    }
}

// Inicializar o bot
const bot = new WhatsAppBot();

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
    console.error('❌ Erro não tratado:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Exceção não capturada:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Encerrando bot...');
    await bot.client.destroy();
    process.exit(0);
});

// Iniciar o bot
bot.start().catch(console.error);

module.exports = WhatsAppBot;