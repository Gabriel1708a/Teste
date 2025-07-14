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
 * Configura listener de reações para a mensagem do sorteio - VERSÃO CORRIGIDA
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} sorteioMessage - Mensagem do sorteio
 * @param {Object} sorteioData - Dados do sorteio
 */
const setupReactionListener = (client, sorteioMessage, sorteioData) => {
    console.log(`🔧 Configurando listener de reações para sorteio - MessageID: ${sorteioMessage.id._serialized}`);

    // MÉTODO 1: Listener de reações direto (primary)
    const reactionHandler = async (reaction) => {
        try {
            // Melhor estrutura de debug
            const debugInfo = {
                reactionMsgId: reaction.msgId?._serialized || reaction.msgId || 'undefined',
                expectedMsgId: sorteioMessage.id._serialized,
                senderId: reaction.senderId || 'undefined', 
                emoji: reaction.emoji || 'undefined',
                reactionObj: reaction
            };
            
            console.log(`🔍 Reação detectada (MÉTODO 1):`, debugInfo);

            // Verificações múltiplas de ID da mensagem 
            const reactionMsgId = reaction.msgId?._serialized || reaction.msgId;
            const expectedMsgId = sorteioMessage.id._serialized;
            
            // Comparação flexível de IDs
            const isTargetMessage = (
                reactionMsgId === expectedMsgId ||
                (reaction.msgId && reaction.msgId.toString() === expectedMsgId) ||
                (reaction.message && reaction.message.id._serialized === expectedMsgId)
            );

            if (!isTargetMessage) {
                console.log(`🔍 Reação não é para mensagem do sorteio (${reactionMsgId} !== ${expectedMsgId})`);
                return;
            }

            console.log(`✅ Reação é para a mensagem do sorteio!`);
            await processarParticipacao(client, reaction, sorteioData);

        } catch (error) {
            console.error('❌ Erro no reactionHandler:', error);
        }
    };

    // MÉTODO 2: Listener alternativo message_reaction (fallback)
    const messageReactionHandler = async (reaction) => {
        try {
            console.log(`🔍 Reação detectada (MÉTODO 2 - message_reaction):`, {
                msgId: reaction.msgId,
                senderId: reaction.senderId,
                emoji: reaction.emoji
            });

            await processarParticipacao(client, reaction, sorteioData);
        } catch (error) {
            console.error('❌ Erro no messageReactionHandler:', error);
        }
    };

    // MÉTODO 3: Polling de reações (fallback robusto)
    const pollReactionsInterval = setInterval(async () => {
        try {
            if (!activeSorteios2.has(sorteioData.groupId)) {
                console.log(`🔍 POLLING: Sorteio não ativo, parando polling`);
                clearInterval(pollReactionsInterval);
                return;
            }

            const currentSorteio = activeSorteios2.get(sorteioData.groupId);
            
            if (Date.now() > currentSorteio.endTime) {
                console.log(`🔍 POLLING: Sorteio expirado, parando polling`);
                clearInterval(pollReactionsInterval);
                return;
            }

            // Buscar mensagem e verificar reações via polling
            const chat = await client.getChatById(sorteioData.groupId);
            const messages = await chat.fetchMessages({ limit: 30 });
            
            const sorteioMsg = messages.find(msg => 
                msg.id._serialized === sorteioMessage.id._serialized
            );
            
            if (sorteioMsg && sorteioMsg.hasReaction) {
                console.log(`🔍 POLLING: Mensagem tem reações! Processando...`);
                
                try {
                    const reactions = await sorteioMsg.getReactions();
                    
                    for (const reactionList of reactions) {
                        const emoji = reactionList.id;
                        
                        console.log(`🔍 POLLING: Processando emoji ${emoji} com ${reactionList.senders.length} remetentes`);
                        
                        for (const sender of reactionList.senders) {
                            const userId = sender.id._serialized;
                            
                            if (!currentSorteio.participantes.has(userId)) {
                                console.log(`🔍 POLLING: Novo participante detectado: ${userId}`);
                                
                                // Simular objeto de reação para processamento
                                const simulatedReaction = {
                                    msgId: sorteioMessage.id._serialized,
                                    senderId: userId,
                                    emoji: emoji
                                };
                                
                                await processarParticipacao(client, simulatedReaction, sorteioData, true);
                            }
                        }
                    }
                } catch (reactionsError) {
                    console.log(`⚠️ POLLING: Erro ao obter reações: ${reactionsError.message}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro no polling de reações:', error);
        }
    }, 5000); // Verificar a cada 5 segundos

    // Registrar listeners
    try {
        client.on('message_reaction', reactionHandler);
        client.on('reaction', reactionHandler); // Tentar evento alternativo
        console.log(`🔧 Listeners de reação registrados`);
    } catch (listenerError) {
        console.error('❌ Erro ao registrar listeners:', listenerError);
    }

    // Armazenar referências para limpeza
    sorteioData.reactionHandler = reactionHandler;
    sorteioData.messageReactionHandler = messageReactionHandler;
    sorteioData.pollReactionsInterval = pollReactionsInterval;
};

/**
 * Processa uma participação no sorteio - FUNÇÃO SEPARADA E MELHORADA
 * @param {Client} client - Cliente WhatsApp
 * @param {Object} reaction - Objeto da reação
 * @param {Object} sorteioData - Dados do sorteio
 * @param {boolean} isPolling - Se veio do polling (opcional)
 */
const processarParticipacao = async (client, reaction, sorteioData, isPolling = false) => {
    try {
        // Verificar se o sorteio ainda está ativo
        if (!activeSorteios2.has(sorteioData.groupId)) {
            console.log(`🔍 Sorteio não está mais ativo`);
            return;
        }

        const currentSorteio = activeSorteios2.get(sorteioData.groupId);
        
        // Verificar se ainda está dentro do tempo
        if (Date.now() > currentSorteio.endTime) {
            console.log(`🔍 Sorteio já expirado`);
            return;
        }

        // Extrair informações do usuário
        const userId = reaction.senderId;
        const emoji = reaction.emoji || '❤️'; // Emoji padrão se undefined
        
        if (!userId) {
            console.log(`⚠️ SenderId não encontrado na reação`);
            return;
        }

        // Verificar se o usuário já participou
        if (currentSorteio.participantes.has(userId)) {
            console.log(`🔄 Usuário já participando - ${userId} - Emoji: ${emoji}`);
            return;
        }

        // Obter informações do contato
        let contact = null;
        let userNumber = 'Número não disponível';
        let userName = 'Nome não disponível';

        try {
            contact = await client.getContactById(userId);
            userNumber = contact ? contact.number : userId.replace('@c.us', '');
            userName = contact ? (contact.pushname || contact.name || contact.number) : userNumber;
        } catch (contactError) {
            console.log(`⚠️ Erro ao obter contato: ${contactError.message}`);
            userNumber = userId.replace('@c.us', '');
            userName = userNumber;
        }

        // Adicionar participante
        currentSorteio.participantes.set(userId, {
            number: userNumber,
            name: userName,
            timestamp: Date.now(),
            emoji: emoji
        });

        // Log detalhado de sucesso
        const method = isPolling ? 'POLLING' : 'LISTENER';
        console.log(`🎉 ${method}: NOVA PARTICIPAÇÃO NO SORTEIO2!`);
        console.log(`   👤 Nome: ${userName}`);
        console.log(`   📱 Número: ${userNumber}`);
        console.log(`   😀 Emoji: ${emoji}`);
        console.log(`   🕐 Horário: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
        console.log(`   👥 Total participantes: ${currentSorteio.participantes.size}`);
        console.log(`   🎲 Sorteio: ${currentSorteio.premio}`);
        console.log(`   ─────────────────────────────────────────────────`);

        // Atualizar sorteio ativo
        activeSorteios2.set(sorteioData.groupId, currentSorteio);

        // Feedback opcional no grupo (a cada 5 participantes)
        if (currentSorteio.participantes.size % 5 === 0) {
            try {
                await client.sendMessage(sorteioData.groupId, 
                    `🎲 Sorteio em andamento!\n👥 Participantes: ${currentSorteio.participantes.size}\n🏆 Prêmio: ${currentSorteio.premio}`
                );
            } catch (sendError) {
                console.log(`⚠️ Erro ao enviar update de participantes: ${sendError.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Erro ao processar participação:', error);
    }
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

        // Remover todos os listeners e intervalos
        if (sorteio.reactionHandler) {
            client.off('message_reaction', sorteio.reactionHandler);
            client.off('reaction', sorteio.reactionHandler); // Remover ambos os eventos
            console.log(`🔧 Listeners de reações removidos`);
        }

        if (sorteio.pollReactionsInterval) {
            clearInterval(sorteio.pollReactionsInterval);
            console.log(`🔧 Polling de reações removido`);
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
            if (sorteio.messageReactionHandler) {
                client.off('reaction', sorteio.messageReactionHandler);
            }
            if (sorteio.pollReactionsInterval) {
                clearInterval(sorteio.pollReactionsInterval);
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