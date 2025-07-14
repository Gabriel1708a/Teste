const { getAllMembers } = require('../utils/helpers');

/**
 * Comando !all - Marcação silenciosa de todos os membros
 * Apenas administradores podem usar
 * @param {Client} client - Cliente WhatsApp
 * @param {Message} message - Mensagem recebida
 * @param {Array} args - Argumentos do comando
 */
const allCommand = async (client, message, args) => {
    try {
        const groupId = message.from;
        
        // Obter todos os membros do grupo
        const membersInfo = await getAllMembers(client, groupId);
        
        if (membersInfo.count === 0) {
            await message.reply('❌ Não foi possível obter a lista de membros do grupo.');
            return;
        }

        // Mensagem personalizada ou padrão
        const customMessage = args.join(' ');
        const baseMessage = customMessage || '📣 Atenção pessoal! 👥';
        
        // Criar mensagem final com marcações invisíveis
        const finalMessage = `${baseMessage}\n\n` + 
                           `📊 Total de membros marcados: ${membersInfo.count}\n` +
                           `⏰ ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`;

        // Enviar mensagem com menções invisíveis
        await client.sendMessage(groupId, finalMessage, {
            mentions: membersInfo.mentions
        });

        // Log para console
        console.log(`🔔 Comando !all executado no grupo ${groupId} - ${membersInfo.count} membros marcados`);
        
    } catch (error) {
        console.error('Erro no comando !all:', error);
        await message.reply('❌ Erro ao executar comando. Tente novamente.');
    }
};

module.exports = allCommand;