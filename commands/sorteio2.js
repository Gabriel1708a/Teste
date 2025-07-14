const { parseInterval, formatInterval, sleep } = require('../utils/helpers');

// Armazenar sorteios por reação ativos
const activeSorteios2 = new Map();

/**
 * Comando !sorteio2 - Cria sorteio com reações
 * Sintaxe: !sorteio2 prêmio|tempo
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const sorteio2Command = async (client, message, args) => {
    try {
        const groupId = message.from;
        const input = args.join(' ');
        
        // Verificar se já existe sorteio ativo
        if (activeSorteios2.has(groupId)) {
            const sorteioAtivo = activeSorteios2.get(groupId);
            const tempoRestante = Math.ceil((sorteioAtivo.endTime - Date.now()) / 1000 / 60);
            
            await message.reply(
                `⚠️ JÁ EXISTE UM SORTEIO ATIVO! 🎲\n\n` +
                `🏆 Prêmio: ${sorteioAtivo.premio}\n` +
                `⏰ Tempo restante: ~${tempoRestante} minuto(s)\n\n` +
                `👥 Participantes: ${sorteioAtivo.participantes.size}\n` +
                `📱 Reaja à mensagem do sorteio para participar!`
            );
            return;
        }
        
        if (!input.includes('|')) {
            await message.reply(
                '❌ Formato incorreto!\n\n' +
                '📝 Use: !sorteio2 prêmio|tempo\n\n' +
                '📋 Exemplos:\n' +
                '• !sorteio2 R$ 100|10m\n' +
                '• !sorteio2 iPhone 15|1h\n' +
                '• !sorteio2 Vale-presente|30m\n\n' +
                '💡 Diferença: As pessoas reagem à mensagem ao invés de votar em enquete!'
            );
            return;
        }

        const [premio, tempoStr] = input.split('|').map(str => str.trim());
        
        if (!premio || !tempoStr) {
            await message.reply(
                '❌ Prêmio e tempo são obrigatórios!\n\n' +
                '📋 Exemplo: !sorteio2 PlayStation 5|45m'
            );
            return;
        }

        // Validar tempo
        const tempoMs = parseInterval(tempoStr);
        if (tempoMs === 0 || tempoMs < 60000) { // Mínimo 1 minuto
            await message.reply(
                '❌ Tempo inválido!\n\n' +
                '✅ Formatos aceitos:\n' +
                '• 5m (5 minutos)\n' +
                '• 30m (30 minutos)\n' +
                '• 1h (1 hora)\n' +
                '• 2h30m (2 horas e 30 minutos)\n\n' +
                '⏰ Tempo mínimo: 1 minuto'
            );
            return;
        }

        const tempoFormatado = formatInterval(tempoStr);
        const endTime = Date.now() + tempoMs;

        // Criar mensagem do sorteio
        const sorteioMessage = await client.sendMessage(groupId,
            `🎲 SORTEIO POR REAÇÃO INICIADO! 🎉\n\n` +
            `🏆 PRÊMIO: ${premio}\n` +
            `⏱️ DURAÇÃO: ${tempoFormatado}\n` +
            `👥 PARTICIPANTES: 0\n\n` +
            `📱 REAJA A ESTA MENSAGEM PARA PARTICIPAR!\n` +
            `🎯 Qualquer emoji vale!\n\n` +
            `⏰ Sorteio encerra automaticamente quando o tempo acabar!\n\n` +
            `🍀 BOA SORTE A TODOS!`
        );

        console.log(`🎲 Sorteio2 iniciado - Grupo: ${groupId} - Prêmio: ${premio} - Duração: ${tempoFormatado}`);

        // Registrar sorteio ativo
        const sorteioData = {
            messageId: sorteioMessage.id._serialized,
            premio,
            tempoStr,
            tempoMs,
            endTime,
            participantes: new Map(), // userId -> { number, name, timestamp }
            groupId,
            startTime: Date.now()
        };

        activeSorteios2.set(groupId, sorteioData);

        // Configurar listener de reações para esta mensagem específica
        setupReactionListener(client, sorteioMessage, sorteioData);

        // Agendar finalização automática
        setTimeout(async () => {
            await finalizarSorteio2(client, groupId);
        }, tempoMs);

        // Confirmação para o admin
        await message.reply(
            `✅ Sorteio por reação criado com sucesso! 🎲\n\n` +
            `🏆 Prêmio: ${premio}\n` +
            `⏱️ Duração: ${tempoFormatado}\n` +
            `📱 Mensagem enviada para o grupo!\n\n` +
            `👀 Aguarde as reações dos participantes...`
        );

    } catch (error) {
        console.error('Erro no comando !sorteio2:', error);
        await message.reply('❌ Erro ao criar sorteio. Tente novamente.');
    }
};

/**
 * Configura listener de reações para a mensagem do sorteio
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} sorteioMessage - Mensagem do sorteio
 * @param {Object} sorteioData - Dados do sorteio
 */
const setupReactionListener = (client, sorteioMessage, sorteioData) => {
    console.log(`🔧 Configurando listener de reações para sorteio - MessageID: ${sorteioMessage.id._serialized}`);

    // Listener para capturar reações
    const reactionHandler = async (reaction) => {
        try {
            // Verificar se a reação é para a mensagem do sorteio
            if (reaction.msgId._serialized !== sorteioMessage.id._serialized) {
                return;
            }

            // Verificar se o sorteio ainda está ativo
            if (!activeSorteios2.has(sorteioData.groupId)) {
                return;
            }

            const currentSorteio = activeSorteios2.get(sorteioData.groupId);
            
            // Verificar se ainda está dentro do tempo
            if (Date.now() > currentSorteio.endTime) {
                return;
            }

            // Pegar informações do usuário que reagiu
            const contact = await reaction.senderId ? client.getContactById(reaction.senderId) : null;
            const userId = reaction.senderId;
            const userNumber = contact ? contact.number : 'Número não disponível';
            const userName = contact ? (contact.pushname || contact.name || contact.number) : 'Nome não disponível';

            // Verificar se o usuário já participou
            if (currentSorteio.participantes.has(userId)) {
                console.log(`🔄 Usuário já participando - ${userName} (${userNumber}) - Reação: ${reaction.emoji}`);
                return;
            }

            // Adicionar participante
            currentSorteio.participantes.set(userId, {
                number: userNumber,
                name: userName,
                timestamp: Date.now(),
                emoji: reaction.emoji
            });

            // Log detalhado no terminal
            console.log(`🎉 NOVA PARTICIPAÇÃO NO SORTEIO2!`);
            console.log(`   👤 Nome: ${userName}`);
            console.log(`   📱 Número: ${userNumber}`);
            console.log(`   😀 Emoji: ${reaction.emoji}`);
            console.log(`   🕐 Horário: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
            console.log(`   👥 Total participantes: ${currentSorteio.participantes.size}`);
            console.log(`   🎲 Sorteio: ${currentSorteio.premio}`);
            console.log(`   ─────────────────────────────────────────────────`);

            // Atualizar sorteio ativo
            activeSorteios2.set(sorteioData.groupId, currentSorteio);

        } catch (error) {
            console.error('Erro ao processar reação do sorteio2:', error);
        }
    };

    // Registrar o listener
    client.on('message_reaction', reactionHandler);

    // Armazenar referência do handler para poder remover depois
    sorteioData.reactionHandler = reactionHandler;
};

/**
 * Finaliza o sorteio e sorteia o ganhador
 * @param {Client} client - Cliente WhatsApp
 * @param {string} groupId - ID do grupo
 */
const finalizarSorteio2 = async (client, groupId) => {
    try {
        if (!activeSorteios2.has(groupId)) {
            return;
        }

        const sorteio = activeSorteios2.get(groupId);
        const participantes = Array.from(sorteio.participantes.values());

        console.log(`🏁 Finalizando sorteio2 - Grupo: ${groupId} - Prêmio: ${sorteio.premio}`);
        console.log(`👥 Total de participantes: ${participantes.length}`);

        // Remover listener de reações
        if (sorteio.reactionHandler) {
            client.off('message_reaction', sorteio.reactionHandler);
            console.log(`🔧 Listener de reações removido`);
        }

        let resultMessage;

        if (participantes.length === 0) {
            resultMessage = 
                `😔 SORTEIO FINALIZADO SEM PARTICIPANTES 😔\n\n` +
                `🏆 Prêmio: ${sorteio.premio}\n` +
                `👥 Participantes: 0\n\n` +
                `📝 Ninguém reagiu à mensagem do sorteio.\n` +
                `🔄 Tente criar um novo sorteio!`;
        } else {
            // Sortear ganhador aleatório
            const ganhadorIndex = Math.floor(Math.random() * participantes.length);
            const ganhador = participantes[ganhadorIndex];

            // Log do resultado
            console.log(`🏆 GANHADOR DO SORTEIO2:`);
            console.log(`   👤 Nome: ${ganhador.name}`);
            console.log(`   📱 Número: ${ganhador.number}`);
            console.log(`   😀 Emoji usado: ${ganhador.emoji}`);
            console.log(`   🎲 Prêmio: ${sorteio.premio}`);
            console.log(`   👥 Concorrendo com: ${participantes.length} pessoas`);
            console.log(`   ═════════════════════════════════════════════════`);

            // Listar todos os participantes no log
            console.log(`📋 LISTA COMPLETA DE PARTICIPANTES:`);
            participantes.forEach((p, index) => {
                const status = index === ganhadorIndex ? '🏆 GANHADOR' : '📝 Participou';
                console.log(`   ${index + 1}. ${p.name} (${p.number}) ${p.emoji} - ${status}`);
            });
            console.log(`   ═════════════════════════════════════════════════`);

            resultMessage = 
                `🎉 SORTEIO FINALIZADO! 🎊\n\n` +
                `🏆 PRÊMIO: ${sorteio.premio}\n` +
                `👑 GANHADOR: @${ganhador.number}\n` +
                `🎯 Nome: ${ganhador.name}\n` +
                `😀 Reagiu com: ${ganhador.emoji}\n\n` +
                `👥 Total de participantes: ${participantes.length}\n` +
                `📊 Chance de vitória: ${(100/participantes.length).toFixed(2)}%\n\n` +
                `🎈 PARABÉNS AO GANHADOR! 🎈\n` +
                `🍀 Obrigado a todos que participaram!`;
        }

        await client.sendMessage(groupId, resultMessage);
        
        // Remover sorteio ativo
        activeSorteios2.delete(groupId);
        
        console.log(`✅ Sorteio2 finalizado e removido - Grupo: ${groupId}`);

    } catch (error) {
        console.error('Erro ao finalizar sorteio2:', error);
        
        // Remover sorteio mesmo com erro
        if (activeSorteios2.has(groupId)) {
            const sorteio = activeSorteios2.get(groupId);
            if (sorteio.reactionHandler) {
                client.off('message_reaction', sorteio.reactionHandler);
            }
            activeSorteios2.delete(groupId);
        }
        
        try {
            await client.sendMessage(groupId, '❌ Erro ao finalizar sorteio. O sorteio foi cancelado.');
        } catch (sendError) {
            console.error('Erro ao enviar mensagem de erro:', sendError);
        }
    }
};

/**
 * Verifica se há sorteio ativo no grupo
 * @param {string} groupId - ID do grupo
 * @returns {boolean} Se há sorteio ativo
 */
const hasSorteio2Ativo = (groupId) => {
    return activeSorteios2.has(groupId);
};

/**
 * Obtém informações do sorteio ativo
 * @param {string} groupId - ID do grupo
 * @returns {Object|null} Dados do sorteio ou null
 */
const getSorteio2Info = (groupId) => {
    return activeSorteios2.get(groupId) || null;
};

/**
 * Força a finalização de um sorteio (comando admin)
 * @param {string} groupId - ID do grupo
 * @returns {boolean} Se conseguiu finalizar
 */
const forceFinalizarSorteio2 = (groupId) => {
    if (activeSorteios2.has(groupId)) {
        const sorteio = activeSorteios2.get(groupId);
        if (sorteio.reactionHandler) {
            // Não podemos remover o listener aqui sem acesso ao client
            // O listener será removido na finalização normal
        }
        activeSorteios2.delete(groupId);
        console.log(`🔧 Sorteio2 forçadamente finalizado - Grupo: ${groupId}`);
        return true;
    }
    return false;
};

module.exports = {
    sorteio2Command,
    finalizarSorteio2,
    hasSorteio2Ativo,
    getSorteio2Info,
    forceFinalizarSorteio2,
    activeSorteios2
};