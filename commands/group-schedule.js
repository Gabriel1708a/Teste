const { loadConfig, saveConfig } = require('../config/database');
const { isValidTime, timeToDate, formatTime } = require('../utils/helpers');
const moment = require('moment-timezone');

// Armazenar agendamentos ativos
const activeSchedules = new Map();

/**
 * Comando !abrirgrupo - Abre o grupo imediatamente (apenas mensagens)
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const openGroup = async (client, message, args) => {
    try {
        const groupId = message.from;
        const chat = await client.getChatById(groupId);

        // Configurar para apenas mensagens
        await chat.setMessagesAdminsOnly(false);

        const currentTime = formatTime('HH:mm:ss');
        
        await message.reply(
            `🔓 GRUPO ABERTO! 📅\n\n` +
            `✅ Todos os membros podem enviar mensagens\n` +
            `🕐 Horário: ${currentTime}\n` +
            `📅 Data: ${moment().tz('America/Sao_Paulo').format('DD/MM/YYYY')}`
        );

        console.log(`🔓 Grupo aberto manualmente - ${groupId} às ${currentTime}`);
        
    } catch (error) {
        console.error('Erro ao abrir grupo:', error);
        await message.reply('❌ Erro ao abrir grupo. Verifique se o bot é administrador.');
    }
};

/**
 * Comando !fechargrupo - Fecha o grupo imediatamente (apenas admins)
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const closeGroup = async (client, message, args) => {
    try {
        const groupId = message.from;
        const chat = await client.getChatById(groupId);

        // Configurar para apenas administradores
        await chat.setMessagesAdminsOnly(true);

        const currentTime = formatTime('HH:mm:ss');
        
        await message.reply(
            `🔐 GRUPO FECHADO! 📅\n\n` +
            `🛡️ Apenas administradores podem enviar mensagens\n` +
            `🕐 Horário: ${currentTime}\n` +
            `📅 Data: ${moment().tz('America/Sao_Paulo').format('DD/MM/YYYY')}`
        );

        console.log(`🔐 Grupo fechado manualmente - ${groupId} às ${currentTime}`);
        
    } catch (error) {
        console.error('Erro ao fechar grupo:', error);
        await message.reply('❌ Erro ao fechar grupo. Verifique se o bot é administrador.');
    }
};

/**
 * Comando !abrirgp - Agenda abertura automática do grupo
 * Sintaxe: !abrirgp HH:MM
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const scheduleOpen = async (client, message, args) => {
    try {
        const groupId = message.from;
        const timeString = args[0];

        if (!timeString || !isValidTime(timeString)) {
            await message.reply(
                '❌ Horário inválido!\n\n' +
                '📝 Use: !abrirgp HH:MM\n\n' +
                '📋 Exemplos:\n' +
                '• !abrirgp 08:00\n' +
                '• !abrirgp 14:30\n\n' +
                '⏰ Fuso horário: São Paulo (GMT-3)'
            );
            return;
        }

        // Cancelar agendamento anterior se existir
        const scheduleKey = `${groupId}_open`;
        if (activeSchedules.has(scheduleKey)) {
            clearTimeout(activeSchedules.get(scheduleKey));
        }

        // Calcular próximo horário
        const targetDate = timeToDate(timeString);
        const now = moment().tz('America/Sao_Paulo');
        const target = moment(targetDate).tz('America/Sao_Paulo');

        // Salvar configuração
        await saveConfig(groupId, 'schedules.open', timeString);

        // Agendar abertura
        const timeout = setTimeout(async () => {
            try {
                const chat = await client.getChatById(groupId);
                await chat.setMessagesAdminsOnly(false);
                
                await client.sendMessage(groupId, 
                    `🔓 GRUPO ABERTO AUTOMATICAMENTE! ⏰\n\n` +
                    `✅ Todos podem enviar mensagens\n` +
                    `🕐 Horário programado: ${timeString}\n` +
                    `📅 ${target.format('DD/MM/YYYY')}`
                );
                
                console.log(`🔓 Grupo aberto automaticamente - ${groupId} às ${timeString}`);
                
                // Reagendar para o próximo dia
                scheduleOpen(client, { from: groupId, reply: () => {} }, [timeString]);
                
            } catch (error) {
                console.error('Erro na abertura agendada:', error);
            }
        }, targetDate.getTime() - now.toDate().getTime());

        activeSchedules.set(scheduleKey, timeout);

        await message.reply(
            `⏰ ABERTURA AGENDADA! 🔓\n\n` +
            `🕐 Horário: ${timeString}\n` +
            `📅 Próxima execução: ${target.format('DD/MM/YYYY [às] HH:mm')}\n` +
            `🔁 Repetição: Diária\n\n` +
            `💡 Para cancelar use: !afgp 0`
        );

        console.log(`⏰ Abertura agendada - ${groupId} para ${timeString}`);
        
    } catch (error) {
        console.error('Erro ao agendar abertura:', error);
        await message.reply('❌ Erro ao agendar abertura. Tente novamente.');
    }
};

/**
 * Comando !fechargp - Agenda fechamento automático do grupo
 * Sintaxe: !fechargp HH:MM
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const scheduleClose = async (client, message, args) => {
    try {
        const groupId = message.from;
        const timeString = args[0];

        if (!timeString || !isValidTime(timeString)) {
            await message.reply(
                '❌ Horário inválido!\n\n' +
                '📝 Use: !fechargp HH:MM\n\n' +
                '📋 Exemplos:\n' +
                '• !fechargp 22:00\n' +
                '• !fechargp 18:30\n\n' +
                '⏰ Fuso horário: São Paulo (GMT-3)'
            );
            return;
        }

        // Cancelar agendamento anterior se existir
        const scheduleKey = `${groupId}_close`;
        if (activeSchedules.has(scheduleKey)) {
            clearTimeout(activeSchedules.get(scheduleKey));
        }

        // Calcular próximo horário
        const targetDate = timeToDate(timeString);
        const now = moment().tz('America/Sao_Paulo');
        const target = moment(targetDate).tz('America/Sao_Paulo');

        // Salvar configuração
        await saveConfig(groupId, 'schedules.close', timeString);

        // Agendar fechamento
        const timeout = setTimeout(async () => {
            try {
                const chat = await client.getChatById(groupId);
                await chat.setMessagesAdminsOnly(true);
                
                await client.sendMessage(groupId, 
                    `🔐 GRUPO FECHADO AUTOMATICAMENTE! ⏰\n\n` +
                    `🛡️ Apenas administradores podem enviar mensagens\n` +
                    `🕐 Horário programado: ${timeString}\n` +
                    `📅 ${target.format('DD/MM/YYYY')}`
                );
                
                console.log(`🔐 Grupo fechado automaticamente - ${groupId} às ${timeString}`);
                
                // Reagendar para o próximo dia
                scheduleClose(client, { from: groupId, reply: () => {} }, [timeString]);
                
            } catch (error) {
                console.error('Erro no fechamento agendado:', error);
            }
        }, targetDate.getTime() - now.toDate().getTime());

        activeSchedules.set(scheduleKey, timeout);

        await message.reply(
            `⏰ FECHAMENTO AGENDADO! 🔐\n\n` +
            `🕐 Horário: ${timeString}\n` +
            `📅 Próxima execução: ${target.format('DD/MM/YYYY [às] HH:mm')}\n` +
            `🔁 Repetição: Diária\n\n` +
            `💡 Para cancelar use: !afgp 0`
        );

        console.log(`⏰ Fechamento agendado - ${groupId} para ${timeString}`);
        
    } catch (error) {
        console.error('Erro ao agendar fechamento:', error);
        await message.reply('❌ Erro ao agendar fechamento. Tente novamente.');
    }
};

/**
 * Comando !afgp - Cancela agendamentos automáticos
 * Sintaxe: !afgp 0
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const cancelSchedule = async (client, message, args) => {
    try {
        const groupId = message.from;
        const action = args[0];

        if (action !== '0') {
            await message.reply(
                '❌ Comando inválido!\n\n' +
                '📝 Use: !afgp 0 para cancelar agendamentos\n\n' +
                '💡 Outros comandos:\n' +
                '• !abrirgp HH:MM → Agendar abertura\n' +
                '• !fechargp HH:MM → Agendar fechamento'
            );
            return;
        }

        // Cancelar agendamentos ativos
        const openKey = `${groupId}_open`;
        const closeKey = `${groupId}_close`;
        let cancelled = 0;

        if (activeSchedules.has(openKey)) {
            clearTimeout(activeSchedules.get(openKey));
            activeSchedules.delete(openKey);
            cancelled++;
        }

        if (activeSchedules.has(closeKey)) {
            clearTimeout(activeSchedules.get(closeKey));
            activeSchedules.delete(closeKey);
            cancelled++;
        }

        // Limpar configurações
        await saveConfig(groupId, 'schedules.open', null);
        await saveConfig(groupId, 'schedules.close', null);

        if (cancelled > 0) {
            await message.reply(
                `✅ AGENDAMENTOS CANCELADOS! 🗓️\n\n` +
                `🔄 ${cancelled} agendamento(s) removido(s)\n` +
                `📝 O grupo voltou ao modo manual\n\n` +
                `💡 Para reagendar use:\n` +
                `• !abrirgp HH:MM\n` +
                `• !fechargp HH:MM`
            );
        } else {
            await message.reply(
                `ℹ️ Nenhum agendamento ativo encontrado.\n\n` +
                `💡 Para criar agendamentos use:\n` +
                `• !abrirgp HH:MM\n` +
                `• !fechargp HH:MM`
            );
        }

        console.log(`🗓️ Agendamentos cancelados - ${groupId}`);
        
    } catch (error) {
        console.error('Erro ao cancelar agendamentos:', error);
        await message.reply('❌ Erro ao cancelar agendamentos. Tente novamente.');
    }
};

/**
 * Inicializa agendamentos salvos na inicialização do bot
 * @param {Client} client - Cliente WhatsApp
 */
const initializeSchedules = async (client) => {
    try {
        // Nota: Em uma implementação real, você carregaria as configurações de todos os grupos
        // e reativaria os agendamentos. Por agora, será necessário reagendar manualmente.
        console.log('🕐 Sistema de agendamentos inicializado');
        
    } catch (error) {
        console.error('Erro ao inicializar agendamentos:', error);
    }
};

module.exports = {
    openGroup,
    closeGroup,
    scheduleOpen,
    scheduleClose,
    cancelSchedule,
    initializeSchedules,
    activeSchedules
};