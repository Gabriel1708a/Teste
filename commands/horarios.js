const { loadConfig, saveConfig, loadHorarios, loadImages, checkGroupPlan } = require('../config/database');
const { parseInterval, formatInterval, randomItem } = require('../utils/helpers');

// Armazenar intervalos ativos de horários pagantes
const activeHorariosIntervals = new Map();

/**
 * Comando !horarios - Envia sugestão de horários pagantes
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const sendHorarios = async (client, message, args) => {
    try {
        const groupId = message.from;
        
        // Verificar se o grupo tem plano ativo
        const hasActivePlan = await checkGroupPlan(groupId);
        if (!hasActivePlan) {
            await message.reply(
                '⚠️ PLANO INATIVO! 💰\n\n' +
                '🚫 Este grupo não possui plano ativo para horários pagantes\n' +
                '💳 Entre em contato com o suporte para ativar\n\n' +
                '🌐 Site: bottechwpp.com'
            );
            return;
        }

        // Carregar horários e mensagens
        const horariosData = await loadHorarios();
        const imagesData = await loadImages();

        if (!horariosData.horarios || horariosData.horarios.length === 0) {
            await message.reply('❌ Nenhum horário configurado no sistema.');
            return;
        }

        // Escolher horário aleatório
        const horarioEscolhido = randomItem(horariosData.horarios);
        
        // Escolher mensagem aleatória
        const mensagemTemplate = randomItem(horariosData.messages) || 
            "🍀 HORÁRIOS PAGANTES 💰\n\n🕐 Próximo horário: {horario}\n\n💸 Aposte com responsabilidade!\n🎰 Boa sorte a todos!";

        // Substituir variável {horario}
        const mensagemFinal = mensagemTemplate.replace(/{horario}/g, horarioEscolhido);

        // Verificar se há imagem disponível
        if (imagesData.horarios && imagesData.horarios.length > 0) {
            try {
                const imagemEscolhida = randomItem(imagesData.horarios);
                // Aqui você enviaria a imagem junto com a mensagem
                // Por enquanto, apenas texto
                await client.sendMessage(groupId, mensagemFinal);
            } catch (imageError) {
                console.error('Erro ao enviar imagem:', imageError);
                await client.sendMessage(groupId, mensagemFinal);
            }
        } else {
            await client.sendMessage(groupId, mensagemFinal);
        }

        console.log(`💰 Horários enviados - Grupo: ${groupId} - Horário: ${horarioEscolhido}`);
        
    } catch (error) {
        console.error('Erro no comando !horarios:', error);
        await message.reply('❌ Erro ao enviar horários. Tente novamente.');
    }
};

/**
 * Comando !horapg - Ativa/desativa envio automático de horários
 * Sintaxe: !horapg 1 (ativar) ou !horapg 0 (desativar)
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const toggleAutoSend = async (client, message, args) => {
    try {
        const groupId = message.from;
        const action = args[0];

        if (!action || (action !== '1' && action !== '0')) {
            await message.reply(
                '❌ Parâmetro inválido!\n\n' +
                '📝 Use:\n' +
                '• !horapg 1 → Ativar envio automático 🍀\n' +
                '• !horapg 0 → Desativar envio automático ❌'
            );
            return;
        }

        // Verificar plano ativo
        const hasActivePlan = await checkGroupPlan(groupId);
        if (!hasActivePlan && action === '1') {
            await message.reply(
                '⚠️ PLANO INATIVO! 💰\n\n' +
                '🚫 Este grupo não possui plano ativo\n' +
                '💳 Ative seu plano para usar horários automáticos\n\n' +
                '🌐 Site: bottechwpp.com'
            );
            return;
        }

        const enabled = action === '1';
        await saveConfig(groupId, 'horariosEnabled', enabled);

        if (enabled) {
            // Iniciar envio automático
            await startAutoHorarios(client, groupId);
            
            const config = await loadConfig(groupId);
            const intervalText = formatInterval(config.horariosInterval);
            
            await message.reply(
                `🍀 HORÁRIOS AUTOMÁTICOS ATIVADOS! 💰\n\n` +
                `✅ Envio automático LIGADO\n` +
                `⏱️ Intervalo: ${intervalText}\n` +
                `🔁 Funcionando continuamente\n\n` +
                `💡 Para alterar intervalo: !addhorapg tempo`
            );
        } else {
            // Parar envio automático
            stopAutoHorarios(groupId);
            
            await message.reply(
                `🔕 HORÁRIOS AUTOMÁTICOS DESATIVADOS\n\n` +
                `❌ Envio automático DESLIGADO\n` +
                `📝 Use !horapg 1 para reativar\n\n` +
                `💡 Você ainda pode usar !horarios manualmente`
            );
        }

        console.log(`🍀 Horários automáticos ${enabled ? 'ativado' : 'desativado'} - Grupo: ${groupId}`);
        
    } catch (error) {
        console.error('Erro no comando !horapg:', error);
        await message.reply('❌ Erro ao configurar horários automáticos. Tente novamente.');
    }
};

/**
 * Comando !addhorapg - Define intervalo de envio automático
 * Sintaxe: !addhorapg 1h ou !addhorapg 30m
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const setInterval = async (client, message, args) => {
    try {
        const groupId = message.from;
        const intervalStr = args[0];

        if (!intervalStr) {
            const config = await loadConfig(groupId);
            await message.reply(
                '📝 CONFIGURAR INTERVALO DE HORÁRIOS\n\n' +
                '💡 Use: !addhorapg tempo\n\n' +
                '✅ Formatos aceitos:\n' +
                '• 30m (30 minutos)\n' +
                '• 1h (1 hora)\n' +
                '• 2h (2 horas)\n' +
                '• 1h30m (1 hora e 30 minutos)\n\n' +
                `⏱️ INTERVALO ATUAL: ${formatInterval(config.horariosInterval)}`
            );
            return;
        }

        // Validar intervalo
        const intervalMs = parseInterval(intervalStr);
        if (intervalMs === 0 || intervalMs < 300000) { // Mínimo 5 minutos
            await message.reply(
                '❌ Intervalo inválido!\n\n' +
                '✅ Formatos aceitos:\n' +
                '• 30m (30 minutos)\n' +
                '• 1h (1 hora)\n' +
                '• 2h30m (2 horas e 30 minutos)\n\n' +
                '⏰ Intervalo mínimo: 5 minutos'
            );
            return;
        }

        // Salvar novo intervalo
        await saveConfig(groupId, 'horariosInterval', intervalStr);

        // Verificar se está ativo e reiniciar se necessário
        const config = await loadConfig(groupId);
        if (config.horariosEnabled) {
            stopAutoHorarios(groupId);
            await startAutoHorarios(client, groupId);
        }

        const formattedInterval = formatInterval(intervalStr);
        const status = config.horariosEnabled ? 'ATIVO 🔁' : 'INATIVO ⏸️';

        await message.reply(
            `✅ INTERVALO ATUALIZADO! ⏱️\n\n` +
            `🕐 Novo intervalo: ${formattedInterval}\n` +
            `📊 Status: ${status}\n\n` +
            `${config.horariosEnabled ? 
                '🔄 Intervalo reiniciado com novo tempo' : 
                '💡 Use !horapg 1 para ativar envio automático'}`
        );

        console.log(`⏱️ Intervalo de horários atualizado - Grupo: ${groupId} - Novo intervalo: ${intervalStr}`);
        
    } catch (error) {
        console.error('Erro no comando !addhorapg:', error);
        await message.reply('❌ Erro ao configurar intervalo. Tente novamente.');
    }
};

/**
 * Inicia envio automático de horários para um grupo
 * @param {Client} client - Cliente WhatsApp
 * @param {string} groupId - ID do grupo
 */
const startAutoHorarios = async (client, groupId) => {
    try {
        // Parar intervalo existente se houver
        stopAutoHorarios(groupId);

        const config = await loadConfig(groupId);
        const intervalMs = parseInterval(config.horariosInterval);

        if (intervalMs === 0) {
            console.warn(`Intervalo inválido para grupo ${groupId}`);
            return;
        }

        // Criar novo intervalo
        const interval = setInterval(async () => {
            try {
                // Verificar se ainda está ativo e se tem plano
                const currentConfig = await loadConfig(groupId);
                const hasActivePlan = await checkGroupPlan(groupId);

                if (!currentConfig.horariosEnabled || !hasActivePlan) {
                    stopAutoHorarios(groupId);
                    return;
                }

                // Enviar horários
                await sendHorariosAuto(client, groupId);
                
            } catch (error) {
                console.error(`Erro no envio automático de horários ${groupId}:`, error);
            }
        }, intervalMs);

        activeHorariosIntervals.set(groupId, interval);
        console.log(`🔁 Horários automáticos iniciados - Grupo: ${groupId} - Intervalo: ${config.horariosInterval}`);
        
    } catch (error) {
        console.error('Erro ao iniciar horários automáticos:', error);
    }
};

/**
 * Para envio automático de horários para um grupo
 * @param {string} groupId - ID do grupo
 */
const stopAutoHorarios = (groupId) => {
    if (activeHorariosIntervals.has(groupId)) {
        clearInterval(activeHorariosIntervals.get(groupId));
        activeHorariosIntervals.delete(groupId);
        console.log(`⏹️ Horários automáticos parados - Grupo: ${groupId}`);
    }
};

/**
 * Envia horários automaticamente (versão interna)
 * @param {Client} client - Cliente WhatsApp
 * @param {string} groupId - ID do grupo
 */
const sendHorariosAuto = async (client, groupId) => {
    try {
        const horariosData = await loadHorarios();
        const imagesData = await loadImages();

        if (!horariosData.horarios || horariosData.horarios.length === 0) {
            return;
        }

        const horarioEscolhido = randomItem(horariosData.horarios);
        const mensagemTemplate = randomItem(horariosData.messages) || 
            "🍀 HORÁRIOS PAGANTES 💰\n\n🕐 Próximo horário: {horario}\n\n💸 Aposte com responsabilidade!\n🎰 Boa sorte a todos!";

        const mensagemFinal = mensagemTemplate.replace(/{horario}/g, horarioEscolhido);

        await client.sendMessage(groupId, mensagemFinal);
        console.log(`💰 Horários enviados automaticamente - Grupo: ${groupId} - Horário: ${horarioEscolhido}`);
        
    } catch (error) {
        console.error('Erro no envio automático de horários:', error);
    }
};

/**
 * Inicializa envio automático para todos os grupos ativos
 * @param {Client} client - Cliente WhatsApp
 */
const initializeAutoSend = async (client) => {
    try {
        // Nota: Em uma implementação real, você carregaria as configurações de todos os grupos
        // Por agora, os grupos precisarão reativar manualmente após reinício do bot
        console.log('🍀 Sistema de horários automáticos inicializado');
        
    } catch (error) {
        console.error('Erro ao inicializar horários automáticos:', error);
    }
};

module.exports = {
    sendHorarios,
    toggleAutoSend,
    setInterval,
    initializeAutoSend,
    startAutoHorarios,
    stopAutoHorarios,
    activeHorariosIntervals
};