const { parseInterval, formatInterval, randomItem, sleep } = require('../utils/helpers');

// Armazenar sorteios ativos
const activeSorteios = new Map();

/**
 * Comando !sorteio - Cria sorteio com enquete
 * Sintaxe: !sorteio prêmio|tempo
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const sorteioCommand = async (client, message, args) => {
    try {
        const groupId = message.from;
        const input = args.join(' ');
        
        if (!input.includes('|')) {
            await message.reply(
                '❌ Formato incorreto!\n\n' +
                '📝 Use: !sorteio prêmio|tempo\n\n' +
                '📋 Exemplos:\n' +
                '• !sorteio R$ 100|10m\n' +
                '• !sorteio iPhone 15|1h\n' +
                '• !sorteio Vale-presente|30m'
            );
            return;
        }

        const [premio, tempoStr] = input.split('|').map(str => str.trim());
        
        if (!premio || !tempoStr) {
            await message.reply(
                '❌ Prêmio e tempo são obrigatórios!\n\n' +
                '📋 Exemplo: !sorteio PlayStation 5|45m'
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

        // Verificar se já existe sorteio ativo no grupo
        if (activeSorteios.has(groupId)) {
            await message.reply(
                '⚠️ Já existe um sorteio ativo neste grupo!\n\n' +
                '🎁 Aguarde o sorteio atual terminar para criar outro.'
            );
            return;
        }

        // Criar enquete
        const pollMessage = await client.sendMessage(groupId, 
            `🎁 SORTEIO CRIADO! 🥳\n\n` +
            `🏆 PRÊMIO: ${premio}\n` +
            `⏰ TEMPO: ${formatInterval(tempoStr)}\n` +
            `🗳️ VOTE ABAIXO PARA PARTICIPAR!\n\n` +
            `📊 Participe da enquete para concorrer!`,
            {
                poll: {
                    name: `🎁 Sorteio: ${premio}`,
                    options: [
                        { name: "✅ Participar" },
                        { name: "❌ Não Participar" }
                    ],
                    selectableCount: 1
                }
            }
        );

        // Armazenar informações do sorteio
        const sorteioInfo = {
            groupId,
            premio,
            tempoMs,
            tempoStr,
            pollMessageId: pollMessage.id._serialized,
            startTime: Date.now(),
            participants: new Set() // Para backup caso a API da enquete falhe
        };

        activeSorteios.set(groupId, sorteioInfo);

        // Confirmar criação
        await message.reply(
            `✅ Sorteio iniciado com sucesso!\n\n` +
            `🎁 Prêmio: ${premio}\n` +
            `⏰ Tempo: ${formatInterval(tempoStr)}\n` +
            `🗳️ Os participantes devem votar na enquete acima\n\n` +
            `⏳ Resultado em: ${formatInterval(tempoStr)}`
        );

        // Agendar finalização do sorteio
        setTimeout(async () => {
            await finalizarSorteio(client, groupId);
        }, tempoMs);

        console.log(`🎁 Sorteio criado - Grupo: ${groupId} - Prêmio: ${premio} - Tempo: ${tempoStr}`);
        
    } catch (error) {
        console.error('Erro no comando !sorteio:', error);
        await message.reply('❌ Erro ao criar sorteio. Tente novamente.');
    }
};

/**
 * Finaliza o sorteio e sorteia o ganhador
 * @param {Client} client - Cliente WhatsApp
 * @param {string} groupId - ID do grupo
 */
const finalizarSorteio = async (client, groupId) => {
    try {
        const sorteioInfo = activeSorteios.get(groupId);
        if (!sorteioInfo) {
            console.warn(`Sorteio não encontrado para grupo ${groupId}`);
            return;
        }

        // Enviar mensagem de finalização
        await client.sendMessage(groupId, 
            `⏰ TEMPO ESGOTADO! 📊\n\n` +
            `🎁 Sorteio: ${sorteioInfo.premio}\n` +
            `🔄 Processando resultados da enquete...\n\n` +
            `⏳ Aguarde o resultado!`
        );

        // Pequeno delay para suspense
        await sleep(3000);

        try {
            // Tentar obter resultados da enquete
            const pollMessage = await client.getMessageById(sorteioInfo.pollMessageId);
            const participantes = [];

            if (pollMessage && pollMessage.poll && pollMessage.poll.results) {
                // Processar votos da opção "Participar" (índice 0)
                const participarOption = pollMessage.poll.results[0];
                
                if (participarOption && participarOption.voters) {
                    for (const voter of participarOption.voters) {
                        participantes.push(voter);
                    }
                }
            }

            // Verificar se há participantes
            if (participantes.length === 0) {
                await client.sendMessage(groupId, 
                    `😢 SORTEIO ENCERRADO SEM PARTICIPANTES\n\n` +
                    `🎁 Prêmio: ${sorteioInfo.premio}\n` +
                    `📊 Participantes: 0\n\n` +
                    `💡 Ninguém votou para participar do sorteio!`
                );
            } else {
                // Sortear ganhador
                const ganhador = randomItem(participantes);
                const contact = await client.getContactById(ganhador);
                
                await client.sendMessage(groupId, 
                    `🥳 TEMOS UM GANHADOR! 🎉\n\n` +
                    `🏆 PARABÉNS @${contact.id.user}! 🎊\n\n` +
                    `🎁 Prêmio: ${sorteioInfo.premio}\n` +
                    `📊 Total de participantes: ${participantes.length}\n` +
                    `🍀 Você foi sortead${contact.id.user.endsWith('a') ? 'a' : 'o'}!\n\n` +
                    `👏 Parabéns pela sorte! 🎯`,
                    {
                        mentions: [ganhador]
                    }
                );

                console.log(`🏆 Ganhador sorteado - Grupo: ${groupId} - Ganhador: ${contact.id.user}`);
            }

        } catch (pollError) {
            console.error('Erro ao processar enquete:', pollError);
            
            // Fallback caso não consiga acessar os resultados da enquete
            await client.sendMessage(groupId, 
                `❌ ERRO NO PROCESSAMENTO\n\n` +
                `🎁 Sorteio: ${sorteioInfo.premio}\n` +
                `⚠️ Não foi possível acessar os resultados da enquete\n\n` +
                `💡 Tente criar um novo sorteio`
            );
        }

        // Remover sorteio da lista ativa
        activeSorteios.delete(groupId);
        
    } catch (error) {
        console.error('Erro ao finalizar sorteio:', error);
        
        // Tentar enviar mensagem de erro
        try {
            await client.sendMessage(groupId, 
                `❌ Erro ao finalizar sorteio. Entre em contato com o administrador.`
            );
            activeSorteios.delete(groupId);
        } catch (sendError) {
            console.error('Erro ao enviar mensagem de erro:', sendError);
        }
    }
};

/**
 * Verifica se há sorteio ativo no grupo
 * @param {string} groupId - ID do grupo
 * @returns {boolean} True se há sorteio ativo
 */
const hasSorteioAtivo = (groupId) => {
    return activeSorteios.has(groupId);
};

/**
 * Obtém informações do sorteio ativo
 * @param {string} groupId - ID do grupo
 * @returns {Object|null} Informações do sorteio ou null
 */
const getSorteioInfo = (groupId) => {
    return activeSorteios.get(groupId) || null;
};

/**
 * Força finalização de um sorteio (para casos emergenciais)
 * @param {string} groupId - ID do grupo
 */
const forceFinalizarSorteio = (groupId) => {
    if (activeSorteios.has(groupId)) {
        activeSorteios.delete(groupId);
        return true;
    }
    return false;
};

module.exports = sorteioCommand;

// Exportar funções auxiliares também
module.exports.finalizarSorteio = finalizarSorteio;
module.exports.hasSorteioAtivo = hasSorteioAtivo;
module.exports.getSorteioInfo = getSorteioInfo;
module.exports.forceFinalizarSorteio = forceFinalizarSorteio;
module.exports.activeSorteios = activeSorteios;