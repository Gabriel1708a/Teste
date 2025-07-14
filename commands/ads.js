const { loadAds, saveAds, addAd, removeAd } = require('../config/database');
const { parseInterval, formatInterval, truncateString } = require('../utils/helpers');

// Armazenar intervalos ativos para cada anúncio
const activeIntervals = new Map();

/**
 * Comando !addads - Adiciona anúncio automático
 * Sintaxe: !addads mensagem|intervalo
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const addAds = async (client, message, args) => {
    try {
        const groupId = message.from;
        const input = args.join(' ');
        
        if (!input.includes('|')) {
            await message.reply('❌ Formato incorreto!\n\n📝 Use: !addads mensagem|intervalo\n\n📋 Exemplo: !addads Bem-vindos ao grupo!|30m');
            return;
        }

        const [adMessage, intervalStr] = input.split('|').map(str => str.trim());
        
        if (!adMessage || !intervalStr) {
            await message.reply('❌ Mensagem e intervalo são obrigatórios!\n\n📋 Exemplo: !addads Promoção especial!|1h');
            return;
        }

        // Validar intervalo
        const intervalMs = parseInterval(intervalStr);
        if (intervalMs === 0) {
            await message.reply('❌ Intervalo inválido!\n\n✅ Formatos aceitos:\n• 30m (30 minutos)\n• 1h (1 hora)\n• 2h30m (2 horas e 30 minutos)');
            return;
        }

        // Adicionar anúncio
        const adId = await addAd(groupId, adMessage, intervalStr);
        
        if (!adId) {
            await message.reply('❌ Erro ao criar anúncio. Tente novamente.');
            return;
        }

        // Iniciar o intervalo automático
        await startAdInterval(client, groupId, adId, adMessage, intervalMs);

        const formattedInterval = formatInterval(intervalStr);
        const truncatedMessage = truncateString(adMessage, 50);

        await message.reply(
            `Anúncio criado com sucesso!\n\n` +
            `ID: ${adId}\n` +
            `Mensagem: ${truncatedMessage}\n` +
            `Intervalo: ${formattedInterval}\n\n` +
            `O anúncio será enviado automaticamente!`
        );

        console.log(`📌 Anúncio criado - Grupo: ${groupId} - ID: ${adId}`);
        
    } catch (error) {
        console.error('Erro no comando !addads:', error);
        await message.reply('❌ Erro ao criar anúncio. Tente novamente.');
    }
};

/**
 * Comando !listads - Lista todos os anúncios ativos
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const listAds = async (client, message, args) => {
    try {
        const groupId = message.from;
        const ads = await loadAds();
        const groupAds = ads[groupId] || [];

        if (groupAds.length === 0) {
            await message.reply('📋 Nenhum anúncio ativo neste grupo.\n\n💡 Use !addads para criar um anúncio automático.');
            return;
        }

        let response = `🗞️ ANÚNCIOS ATIVOS 📌\n\n`;
        
        groupAds.forEach((ad, index) => {
            const truncatedMessage = truncateString(ad.message, 60);
            const formattedInterval = formatInterval(ad.interval);
            const status = activeIntervals.has(`${groupId}_${ad.id}`) ? '🔁 Ativo' : '⏸️ Pausado';
            
            response += `${index + 1}. 🆔 ID: ${ad.id}\n`;
            response += `   📝 ${truncatedMessage}\n`;
            response += `   ⏱️ Intervalo: ${formattedInterval}\n`;
            response += `   📊 Status: ${status}\n`;
            response += `   📅 Criado: ${new Date(ad.createdAt).toLocaleDateString('pt-BR')}\n\n`;
        });

        response += `📊 Total: ${groupAds.length} anúncio(s)\n`;
        response += `🗑️ Para remover: !rmads ID`;

        await message.reply(response);
        
    } catch (error) {
        console.error('Erro no comando !listads:', error);
        await message.reply('❌ Erro ao listar anúncios. Tente novamente.');
    }
};

/**
 * Comando !rmads - Remove anúncio por ID
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const removeAds = async (client, message, args) => {
    try {
        const groupId = message.from;
        const adId = args[0];

        if (!adId) {
            await message.reply('❌ ID do anúncio não informado!\n\n📋 Use: !rmads ID\n\n💡 Veja os IDs com !listads');
            return;
        }

        // Parar o intervalo se estiver ativo
        const intervalKey = `${groupId}_${adId}`;
        if (activeIntervals.has(intervalKey)) {
            clearInterval(activeIntervals.get(intervalKey));
            activeIntervals.delete(intervalKey);
        }

        // Remover do banco de dados
        const removed = await removeAd(groupId, adId);

        if (!removed) {
            await message.reply('❌ Anúncio não encontrado!\n\n💡 Verifique o ID com !listads');
            return;
        }

        await message.reply(
            `🗑️ Anúncio removido com sucesso!\n\n` +
            `🆔 ID: ${adId}\n` +
            `✅ O envio automático foi interrompido.`
        );

        console.log(`🗑️ Anúncio removido - Grupo: ${groupId} - ID: ${adId}`);
        
    } catch (error) {
        console.error('Erro no comando !rmads:', error);
        await message.reply('❌ Erro ao remover anúncio. Tente novamente.');
    }
};

/**
 * Inicia intervalo automático para um anúncio
 * @param {Client} client - Cliente WhatsApp
 * @param {string} groupId - ID do grupo
 * @param {string} adId - ID do anúncio
 * @param {string} message - Mensagem do anúncio
 * @param {number} intervalMs - Intervalo em milissegundos
 */
const startAdInterval = async (client, groupId, adId, message, intervalMs) => {
    const intervalKey = `${groupId}_${adId}`;
    
    // Parar intervalo existente se houver
    if (activeIntervals.has(intervalKey)) {
        clearInterval(activeIntervals.get(intervalKey));
    }

    // Criar novo intervalo
    const interval = setInterval(async () => {
        try {
            await client.sendMessage(groupId, message);
            
            // Atualizar último envio no banco
            const ads = await loadAds();
            if (ads[groupId]) {
                const adIndex = ads[groupId].findIndex(ad => ad.id === adId);
                if (adIndex !== -1) {
                    ads[groupId][adIndex].lastSent = new Date().toISOString();
                    await saveAds(ads);
                }
            }
            
            console.log(`📢 Anúncio enviado - Grupo: ${groupId} - ID: ${adId}`);
        } catch (error) {
            console.error(`Erro ao enviar anúncio ${adId}:`, error);
        }
    }, intervalMs);

    activeIntervals.set(intervalKey, interval);
};

/**
 * Inicializa todos os anúncios ativos na inicialização do bot
 * @param {Client} client - Cliente WhatsApp
 */
const initializeAds = async (client) => {
    try {
        const ads = await loadAds();
        let totalAds = 0;

        for (const [groupId, groupAds] of Object.entries(ads)) {
            for (const ad of groupAds) {
                const intervalMs = parseInterval(ad.interval);
                if (intervalMs > 0) {
                    await startAdInterval(client, groupId, ad.id, ad.message, intervalMs);
                    totalAds++;
                }
            }
        }

        if (totalAds > 0) {
            console.log(`🔁 ${totalAds} anúncio(s) automático(s) inicializado(s)`);
        }
        
    } catch (error) {
        console.error('Erro ao inicializar anúncios:', error);
    }
};

module.exports = {
    addAds,
    listAds,
    removeAds,
    initializeAds,
    activeIntervals
};