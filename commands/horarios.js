const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const { loadConfig, saveConfig, checkGroupPlan } = require('../config/database');
const { parseInterval, formatInterval } = require('../utils/helpers');

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
        const now = moment.tz("America/Sao_Paulo");
        const currentHour = now.hours();

        const plataformas = [
            "🐯 FORTUNE TIGER", "🐉 DRAGON LUCK", "🐰 FORTUNE RABBIT", "🐭 FORTUNE MOUSE",
            "🐘 GANESHA GOLD", "👙 BIKINI", "🥊 MUAY THAI", "🎪 CIRCUS", "🐂 FORTUNE OX",
            "💰 DOUBLE FORTUNE", "🐉🐅 DRAGON TIGER LUCK", "🧞 GENIE'S WISHES(GENIO)",
            "🌳🌲 JUNGLE DELIGHT", "🐷 PIGGY GOLD", "👑 MIDAS FORTUNE", "🌞🌛 SUN & MOON",
            "🦹‍♂️ WILD BANDITO", "🔥🕊️ PHOENIX RISES", "🛒 SUPERMARKET SPREE",
            "🚢👨‍✈️ CAPTAIN BOUNTY", "🎃 MISTER HOLLOWEEN", "🍀💰 LEPRECHAUN RICHES"
        ];

        function gerarHorarioAleatorio(horaBase, minIntervalo, maxIntervalo) {
            const minutoAleatorio = Math.floor(Math.random() * (maxIntervalo - minIntervalo + 1)) + minIntervalo;
            return `${horaBase.toString().padStart(2, '0')}:${minutoAleatorio.toString().padStart(2, '0')}`;
        }

        let horariosText = `🍀 *SUGESTÃO DE HORÁRIOS PAGANTES DAS ${currentHour.toString().padStart(2, '0')}h* 💰\n\n`;
        let foundRelevantHorarios = false;

        plataformas.forEach(plataforma => {
            const horariosGerados = Array.from({ length: 7 }, () => {
                const primeiroHorario = gerarHorarioAleatorio(currentHour, 0, 59);
                const segundoHorario = gerarHorarioAleatorio(currentHour, 0, 59);
                return `${primeiroHorario} - ${segundoHorario}`;
            });

            if (horariosGerados.length > 0) {
                foundRelevantHorarios = true;
                horariosText += `*${plataforma}*\n`;
                horariosGerados.forEach(horario => {
                    horariosText += `  └ ${horario}\n`;
                });
                horariosText += `\n`;
            }
        });

        if (!foundRelevantHorarios) {
            horariosText += "Não foi possível gerar horários pagantes para a hora atual. Tente novamente mais tarde!\n\n";
        }

        const mensagemFinal = `Dica: alterne entre os giros entre normal e turbo, se vier um Grande Ganho, PARE e espere a próxima brecha!\n🔞NÃO INDICADO PARA MENORES🔞\nLembrando a todos!\nHorários de probabilidades aumentam muito sua chance de lucrar, mas lembrando que não anula a chance de perda, por mais que seja baixa jogue com responsabilidade...\n\nSistema By: Aurora\nCreat: Aurora Bot Oficial`;

        horariosText += mensagemFinal;

        await message.reply(horariosText);

    } catch (error) {
        console.error("Erro no comando !horarios:", error);
        await message.reply("❌ Erro ao buscar horários. Tente novamente.");
    }
};

/**
 * Comando !horapg - Ativa/desativa envio automático de horários
 * Sintaxe: !horapg 1 (ativar) ou !horapg 0 (desativar)
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const toggleAutoHorarios = async (client, message, args) => {
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
        const newInterval = args[0];

        if (!newInterval) {
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
        const intervalMs = parseInterval(newInterval);
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
        await saveConfig(groupId, 'horariosInterval', newInterval);

        // Verificar se está ativo e reiniciar se necessário
        const config = await loadConfig(groupId);
        if (config.horariosEnabled) {
            stopAutoHorarios(groupId);
            await startAutoHorarios(client, groupId);
        }

        const formattedInterval = formatInterval(newInterval);
        const status = config.horariosEnabled ? 'ATIVO 🔁' : 'INATIVO ⏸️';

        await message.reply(
            `✅ INTERVALO ATUALIZADO! ⏱️\n\n` +
            `🕐 Novo intervalo: ${formattedInterval}\n` +
            `📊 Status: ${status}\n\n` +
            `${config.horariosEnabled ? 
                '🔄 Intervalo reiniciado com novo tempo' : 
                '💡 Use !horapg 1 para ativar envio automático'}`
        );

        console.log(`⏱️ Intervalo de horários atualizado - Grupo: ${groupId} - Novo intervalo: ${newInterval}`);
        
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

                // Enviar horários automaticamente
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
        const now = moment.tz("America/Sao_Paulo");
        const currentHour = now.hours();

        const plataformas = [
            "🐯 FORTUNE TIGER", "🐉 DRAGON LUCK", "🐰 FORTUNE RABBIT", "🐭 FORTUNE MOUSE",
            "🐘 GANESHA GOLD", "👙 BIKINI", "🥊 MUAY THAI", "🎪 CIRCUS", "🐂 FORTUNE OX",
            "💰 DOUBLE FORTUNE", "🐉🐅 DRAGON TIGER LUCK", "🧞 GENIE'S WISHES(GENIO)",
            "🌳🌲 JUNGLE DELIGHT", "🐷 PIGGY GOLD", "👑 MIDAS FORTUNE", "🌞🌛 SUN & MOON",
            "🦹‍♂️ WILD BANDITO", "🔥🕊️ PHOENIX RISES", "🛒 SUPERMARKET SPREE",
            "🚢👨‍✈️ CAPTAIN BOUNTY", "🎃 MISTER HOLLOWEEN", "🍀💰 LEPRECHAUN RICHES"
        ];

        function gerarHorarioAleatorio(horaBase, minIntervalo, maxIntervalo) {
            const minutoAleatorio = Math.floor(Math.random() * (maxIntervalo - minIntervalo + 1)) + minIntervalo;
            return `${horaBase.toString().padStart(2, '0')}:${minutoAleatorio.toString().padStart(2, '0')}`;
        }

        let horariosText = `🍀 *SUGESTÃO DE HORÁRIOS PAGANTES DAS ${currentHour.toString().padStart(2, '0')}h* 💰\n\n`;

        plataformas.forEach(plataforma => {
            const horariosGerados = Array.from({ length: 7 }, () => {
                const primeiroHorario = gerarHorarioAleatorio(currentHour, 0, 59);
                const segundoHorario = gerarHorarioAleatorio(currentHour, 0, 59);
                return `${primeiroHorario} - ${segundoHorario}`;
            });

            horariosText += `*${plataforma}*\n`;
            horariosGerados.forEach(horario => {
                horariosText += `  └ ${horario}\n`;
            });
            horariosText += `\n`;
        });

        const mensagemFinal = `Dica: alterne entre os giros entre normal e turbo, se vier um Grande Ganho, PARE e espere a próxima brecha!\n🔞NÃO INDICADO PARA MENORES🔞\nLembrando a todos!\nHorários de probabilidades aumentam muito sua chance de lucrar, mas lembrando que não anula a chance de perda, por mais que seja baixa jogue com responsabilidade...\n\nSistema By: Aurora\nCreat: Aurora Bot Oficial`;

        horariosText += mensagemFinal;

        await client.sendMessage(groupId, horariosText);
        console.log(`💰 Horários enviados automaticamente - Grupo: ${groupId} - Hora: ${currentHour}h`);
        
    } catch (error) {
        console.error('Erro no envio automático de horários:', error);
    }
};

/**
 * Inicializa envio automático para todos os grupos ativos
 * @param {Client} client - Cliente WhatsApp
 */
const initializeAutoHorarios = async (client) => {
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
    toggleAutoHorarios,
    setInterval,
    initializeAutoHorarios,
    startAutoHorarios,
    stopAutoHorarios,
    activeHorariosIntervals
};