const { loadConfig, saveConfig } = require('../config/database');
const { detectLinks, isAdmin } = require('../utils/helpers');

/**
 * Comando !banextremo - Ativa modo extremo (bane qualquer link)
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const banExtremo = async (client, message, args) => {
    try {
        const groupId = message.from;
        
        // Resetar outros modos anti-link
        await saveConfig(groupId, 'antilink.banLinkGp', false);
        await saveConfig(groupId, 'antilink.antiLinkGp', false);
        await saveConfig(groupId, 'antilink.enabled', false);
        
        // Ativar modo extremo
        await saveConfig(groupId, 'antilink.banExtremo', true);

        await message.reply(
            `🚫 BAN EXTREMO ATIVADO! 💥\n\n` +
            `⚠️ MODO MAIS RESTRITIVO:\n` +
            `• Qualquer tipo de link será DELETADO\n` +
            `• Autor será BANIDO automaticamente\n` +
            `• Sem exceções ou avisos\n\n` +
            `🛑 Use com EXTREMA cautela!\n` +
            `💡 Para desativar: !banextremo off`
        );

        console.log(`🚫 Ban extremo ativado - Grupo: ${groupId}`);
        
    } catch (error) {
        console.error('Erro no comando !banextremo:', error);
        await message.reply('❌ Erro ao ativar ban extremo. Tente novamente.');
    }
};

/**
 * Comando !banlinkgp - Bane apenas links de grupos WhatsApp
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const banLinkGp = async (client, message, args) => {
    try {
        const groupId = message.from;
        
        // Resetar outros modos
        await saveConfig(groupId, 'antilink.banExtremo', false);
        await saveConfig(groupId, 'antilink.antiLinkGp', false);
        await saveConfig(groupId, 'antilink.enabled', false);
        
        // Ativar ban de links de grupo
        await saveConfig(groupId, 'antilink.banLinkGp', true);

        await message.reply(
            `🔨 BAN LINK GRUPO ATIVADO! ⚠️\n\n` +
            `🎯 FOCADO EM GRUPOS:\n` +
            `• Links de grupos WhatsApp serão DELETADOS\n` +
            `• Autor será BANIDO automaticamente\n` +
            `• Detecta: chat.whatsapp.com\n\n` +
            `✅ Outros links são permitidos\n` +
            `💡 Para desativar: !banlinkgp off`
        );

        console.log(`🔨 Ban link grupo ativado - Grupo: ${groupId}`);
        
    } catch (error) {
        console.error('Erro no comando !banlinkgp:', error);
        await message.reply('❌ Erro ao ativar ban de links de grupo. Tente novamente.');
    }
};

/**
 * Comando !antilinkgp - Apenas deleta links de grupos (sem banir)
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const antiLinkGp = async (client, message, args) => {
    try {
        const groupId = message.from;
        
        // Resetar outros modos
        await saveConfig(groupId, 'antilink.banExtremo', false);
        await saveConfig(groupId, 'antilink.banLinkGp', false);
        await saveConfig(groupId, 'antilink.enabled', false);
        
        // Ativar anti-link de grupo
        await saveConfig(groupId, 'antilink.antiLinkGp', true);

        await message.reply(
            `🛡️ ANTI-LINK GRUPO ATIVADO! 🚷\n\n` +
            `🎯 PROTEÇÃO MODERADA:\n` +
            `• Links de grupos WhatsApp serão DELETADOS\n` +
            `• Autor NÃO será banido (apenas aviso)\n` +
            `• Detecta: chat.whatsapp.com\n\n` +
            `✅ Outros links são permitidos\n` +
            `💡 Para desativar: !antilinkgp off`
        );

        console.log(`🛡️ Anti-link grupo ativado - Grupo: ${groupId}`);
        
    } catch (error) {
        console.error('Erro no comando !antilinkgp:', error);
        await message.reply('❌ Erro ao ativar anti-link de grupo. Tente novamente.');
    }
};

/**
 * Comando !antilink - Deleta qualquer link (sem banir)
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const antiLink = async (client, message, args) => {
    try {
        const groupId = message.from;
        
        // Resetar outros modos
        await saveConfig(groupId, 'antilink.banExtremo', false);
        await saveConfig(groupId, 'antilink.banLinkGp', false);
        await saveConfig(groupId, 'antilink.antiLinkGp', false);
        
        // Ativar anti-link geral
        await saveConfig(groupId, 'antilink.enabled', true);

        await message.reply(
            `🛡️ ANTI-LINK ATIVADO! 🚫\n\n` +
            `🎯 PROTEÇÃO BÁSICA:\n` +
            `• Qualquer tipo de link será DELETADO\n` +
            `• Autor NÃO será banido (apenas aviso)\n` +
            `• Detecta todos os tipos de links\n\n` +
            `⚠️ Modo educativo - sem punições\n` +
            `💡 Para desativar: !antilink off`
        );

        console.log(`🛡️ Anti-link ativado - Grupo: ${groupId}`);
        
    } catch (error) {
        console.error('Erro no comando !antilink:', error);
        await message.reply('❌ Erro ao ativar anti-link. Tente novamente.');
    }
};

/**
 * Comando !ban - Bane usuário mencionado ou por resposta
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const banUser = async (client, message, args) => {
    try {
        const groupId = message.from;
        let targetUserId = null;
        let targetUser = null;

        // Verificar se é resposta a uma mensagem
        if (message.hasQuotedMsg) {
            const quotedMsg = await message.getQuotedMessage();
            targetUserId = quotedMsg.author || quotedMsg.from;
        } else if (message.mentionedIds && message.mentionedIds.length > 0) {
            // Verificar se há menções na mensagem
            targetUserId = message.mentionedIds[0];
        }

        if (!targetUserId) {
            await message.reply(
                '❌ Usuário não identificado!\n\n' +
                '📝 Como usar o comando !ban:\n\n' +
                '1️⃣ Responda a mensagem do usuário:\n' +
                '   • Responda a mensagem e digite !ban\n\n' +
                '2️⃣ Mencione o usuário:\n' +
                '   • !ban @usuario\n\n' +
                '⚠️ Apenas administradores podem banir'
            );
            return;
        }

        // Verificar se o alvo não é admin
        const isTargetAdmin = await isAdmin(client, groupId, targetUserId);
        if (isTargetAdmin) {
            await message.reply(
                '⚠️ ERRO: Não é possível banir administrador!\n\n' +
                '🛡️ Administradores têm proteção contra banimento'
            );
            return;
        }

        // Verificar se não está tentando banir o bot
        const botId = client.info.wid._serialized;
        if (targetUserId === botId) {
            await message.reply('🤖 Não posso banir a mim mesmo! 😅');
            return;
        }

        try {
            // Obter informações do usuário
            const contact = await client.getContactById(targetUserId);
            const chat = await client.getChatById(groupId);

            // Tentar banir o usuário
            await chat.removeParticipants([targetUserId]);

            await message.reply(
                `🔨 USUÁRIO BANIDO! ⚠️\n\n` +
                `👤 Usuário: @${contact.id.user}\n` +
                `⚡ Banido por: @${message.author.replace('@c.us', '')}\n` +
                `📅 Data: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
                `✅ Usuário removido do grupo`
            );

            console.log(`🔨 Usuário banido - Grupo: ${groupId} - Usuário: ${contact.id.user}`);
            
        } catch (banError) {
            console.error('Erro ao banir usuário:', banError);
            await message.reply(
                '❌ ERRO AO BANIR USUÁRIO\n\n' +
                '🔍 Possíveis causas:\n' +
                '• Bot não é administrador\n' +
                '• Usuário já foi removido\n' +
                '• Erro de permissão\n\n' +
                '💡 Verifique se o bot tem permissões de admin'
            );
        }
        
    } catch (error) {
        console.error('Erro no comando !ban:', error);
        await message.reply('❌ Erro ao executar banimento. Tente novamente.');
    }
};

/**
 * Verifica mensagem contra sistemas anti-link ativos
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {string} groupId - ID do grupo
 * @returns {Object} Resultado da verificação
 */
const checkMessage = async (client, message, groupId) => {
    try {
        const config = await loadConfig(groupId);
        const messageBody = message.body || '';
        
        // Se nenhum sistema anti-link está ativo
        if (!config.antilink.banExtremo && !config.antilink.banLinkGp && 
            !config.antilink.antiLinkGp && !config.antilink.enabled) {
            return { shouldDelete: false, shouldBan: false };
        }

        // Verificar se o autor é admin (admins são isentos)
        const isAuthorAdmin = await isAdmin(client, groupId, message.author);
        if (isAuthorAdmin) {
            return { shouldDelete: false, shouldBan: false };
        }

        // Detectar links na mensagem
        const linkInfo = detectLinks(messageBody);

        // Ban extremo - qualquer link
        if (config.antilink.banExtremo && linkInfo.hasAnyLink) {
            await notifyLinkDetected(client, groupId, message, 'BAN EXTREMO', 'qualquer link', true);
            return { shouldDelete: true, shouldBan: true };
        }

        // Ban link de grupo - apenas links do WhatsApp
        if (config.antilink.banLinkGp && linkInfo.hasWhatsAppGroupLink) {
            await notifyLinkDetected(client, groupId, message, 'BAN LINK GRUPO', 'link de grupo WhatsApp', true);
            return { shouldDelete: true, shouldBan: true };
        }

        // Anti-link de grupo - apenas deleta links do WhatsApp
        if (config.antilink.antiLinkGp && linkInfo.hasWhatsAppGroupLink) {
            await notifyLinkDetected(client, groupId, message, 'ANTI-LINK GRUPO', 'link de grupo WhatsApp', false);
            return { shouldDelete: true, shouldBan: false };
        }

        // Anti-link geral - deleta qualquer link
        if (config.antilink.enabled && linkInfo.hasAnyLink) {
            await notifyLinkDetected(client, groupId, message, 'ANTI-LINK', 'link', false);
            return { shouldDelete: true, shouldBan: false };
        }

        return { shouldDelete: false, shouldBan: false };
        
    } catch (error) {
        console.error('Erro na verificação anti-link:', error);
        return { shouldDelete: false, shouldBan: false };
    }
};

/**
 * Notifica sobre detecção de link
 * @param {Client} client - Cliente WhatsApp
 * @param {string} groupId - ID do grupo
 * @param {Message} message - Mensagem original
 * @param {string} mode - Modo anti-link
 * @param {string} linkType - Tipo de link detectado
 * @param {boolean} willBan - Se o usuário será banido
 */
const notifyLinkDetected = async (client, groupId, message, mode, linkType, willBan) => {
    try {
        const contact = await client.getContactById(message.author);
        const action = willBan ? '🔨 BANIDO' : '⚠️ AVISADO';
        
        const notification = 
            `🚫 ${mode} ATIVADO! ${action}\n\n` +
            `👤 Usuário: @${contact.id.user}\n` +
            `🔗 Detectado: ${linkType}\n` +
            `⚡ Ação: Mensagem deletada${willBan ? ' + usuário banido' : ''}\n` +
            `📅 ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

        await client.sendMessage(groupId, notification, {
            mentions: [message.author]
        });

        // Se deve banir, executar banimento
        if (willBan) {
            try {
                const chat = await client.getChatById(groupId);
                await chat.removeParticipants([message.author]);
                console.log(`🔨 Usuário banido por link - Grupo: ${groupId} - Usuário: ${contact.id.user}`);
            } catch (banError) {
                console.error('Erro ao banir por link:', banError);
                await client.sendMessage(groupId, 
                    `❌ Erro ao banir usuário. Verifique permissões do bot.`);
            }
        }
        
    } catch (error) {
        console.error('Erro ao notificar detecção de link:', error);
    }
};

/**
 * Desativa todos os sistemas anti-link
 * @param {string} groupId - ID do grupo
 */
const disableAllAntilink = async (groupId) => {
    try {
        await saveConfig(groupId, 'antilink.banExtremo', false);
        await saveConfig(groupId, 'antilink.banLinkGp', false);
        await saveConfig(groupId, 'antilink.antiLinkGp', false);
        await saveConfig(groupId, 'antilink.enabled', false);
        return true;
    } catch (error) {
        console.error('Erro ao desativar anti-link:', error);
        return false;
    }
};

module.exports = {
    banExtremo,
    banLinkGp,
    antiLinkGp,
    antiLink,
    banUser,
    checkMessage,
    notifyLinkDetected,
    disableAllAntilink
};