const { loadConfig, saveConfig } = require('../config/database');

/**
 * Comando !bv - Ativa ou desativa sistema de boas-vindas
 * Sintaxe: !bv 1 (ativar) ou !bv 0 (desativar)
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const toggleWelcome = async (client, message, args) => {
    try {
        const groupId = message.from;
        const action = args[0];

        if (!action || (action !== '1' && action !== '0')) {
            await message.reply(
                '❌ Parâmetro inválido!\n\n' +
                '📝 Use:\n' +
                '• !bv 1 → Ativar boas-vindas 👋\n' +
                '• !bv 0 → Desativar boas-vindas ❌'
            );
            return;
        }

        const enabled = action === '1';
        await saveConfig(groupId, 'welcomeEnabled', enabled);

        const status = enabled ? 'ATIVADO 🎉' : 'DESATIVADO ❌';
        const emoji = enabled ? '✅' : '🔕';
        
        let response = `${emoji} Sistema de boas-vindas ${status}\n\n`;
        
        if (enabled) {
            const config = await loadConfig(groupId);
            response += `👋 MENSAGEM ATUAL:\n"${config.welcomeMessage}"\n\n`;
            response += `💡 Para personalizar use: !legendabv sua mensagem`;
        } else {
            response += `📝 Novos membros não receberão mensagem de boas-vindas`;
        }

        await message.reply(response);
        
        console.log(`👋 Boas-vindas ${enabled ? 'ativado' : 'desativado'} - Grupo: ${groupId}`);
        
    } catch (error) {
        console.error('Erro no comando !bv:', error);
        await message.reply('❌ Erro ao configurar boas-vindas. Tente novamente.');
    }
};

/**
 * Comando !legendabv - Define mensagem personalizada de boas-vindas
 * Suporta variáveis: @user (menciona novo membro) e @group (nome do grupo)
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const setWelcomeMessage = async (client, message, args) => {
    try {
        const groupId = message.from;
        const customMessage = args.join(' ');

        if (!customMessage) {
            const config = await loadConfig(groupId);
            
            await message.reply(
                '📝 CONFIGURAR MENSAGEM DE BOAS-VINDAS\n\n' +
                '💡 Use: !legendabv sua mensagem personalizada\n\n' +
                '🔧 VARIÁVEIS DISPONÍVEIS:\n' +
                '• @user → menciona o novo membro\n' +
                '• @group → nome do grupo\n\n' +
                '📋 EXEMPLO:\n' +
                '!legendabv Olá @user! Seja bem-vindo(a) ao @group! 🎉\n\n' +
                `👋 MENSAGEM ATUAL:\n"${config.welcomeMessage}"`
            );
            return;
        }

        // Salvar nova mensagem
        await saveConfig(groupId, 'welcomeMessage', customMessage);

        // Verificar se o sistema está ativo
        const config = await loadConfig(groupId);
        
        let response = `✅ Mensagem de boas-vindas atualizada!\n\n`;
        response += `📝 NOVA MENSAGEM:\n"${customMessage}"\n\n`;
        
        if (config.welcomeEnabled) {
            response += `🎉 Sistema ATIVO - Novos membros receberão esta mensagem`;
        } else {
            response += `⚠️ Sistema INATIVO - Use !bv 1 para ativar`;
        }

        await message.reply(response);
        
        console.log(`📝 Mensagem de boas-vindas atualizada - Grupo: ${groupId}`);
        
    } catch (error) {
        console.error('Erro no comando !legendabv:', error);
        await message.reply('❌ Erro ao configurar mensagem. Tente novamente.');
    }
};

/**
 * Processa mensagem de boas-vindas substituindo variáveis
 * @param {string} template - Template da mensagem
 * @param {string} userName - Nome do usuário
 * @param {string} groupName - Nome do grupo
 * @returns {string} Mensagem processada
 */
const processWelcomeMessage = (template, userName, groupName) => {
    return template
        .replace(/@user/g, `@${userName}`)
        .replace(/@group/g, groupName);
};

/**
 * Envia mensagem de boas-vindas para novo membro
 * @param {Client} client - Cliente WhatsApp
 * @param {string} groupId - ID do grupo
 * @param {string} newMemberId - ID do novo membro
 */
const sendWelcomeMessage = async (client, groupId, newMemberId) => {
    try {
        const config = await loadConfig(groupId);
        
        if (!config.welcomeEnabled) {
            return; // Sistema desativado
        }

        const chat = await client.getChatById(groupId);
        const contact = await client.getContactById(newMemberId);
        
        const processedMessage = processWelcomeMessage(
            config.welcomeMessage,
            contact.id.user,
            chat.name
        );

        await client.sendMessage(groupId, processedMessage, {
            mentions: [newMemberId]
        });

        console.log(`👋 Boas-vindas enviada - Grupo: ${groupId} - Membro: ${contact.id.user}`);
        
    } catch (error) {
        console.error('Erro ao enviar boas-vindas:', error);
    }
};

module.exports = {
    toggleWelcome,
    setWelcomeMessage,
    processWelcomeMessage,
    sendWelcomeMessage
};