const moment = require('moment-timezone');

/**
 * Verifica se um usuário é administrador do grupo
 * @param {Client} client - Cliente WhatsApp
 * @param {string} groupId - ID do grupo
 * @param {string} userId - ID do usuário
 * @returns {boolean} True se for administrador
 */
const isAdmin = async (client, groupId, userId) => {
    try {
        const chat = await client.getChatById(groupId);
        const participant = chat.participants.find(p => p.id._serialized === userId);
        
        return participant && participant.isAdmin;
    } catch (error) {
        console.error('Erro ao verificar admin:', error);
        return false;
    }
};

/**
 * Formata tempo no fuso horário de São Paulo
 * @param {string} format - Formato do momento
 * @returns {string} Tempo formatado
 */
const formatTime = (format = 'HH:mm:ss') => {
    return moment().tz('America/Sao_Paulo').format(format);
};

/**
 * Converte string de intervalo para milissegundos
 * @param {string} interval - Intervalo (ex: "30m", "1h", "2h30m")
 * @returns {number} Milissegundos
 */
const parseInterval = (interval) => {
    const regex = /(\d+)([hm])/g;
    let totalMs = 0;
    let match;

    while ((match = regex.exec(interval)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 'h':
                totalMs += value * 60 * 60 * 1000;
                break;
            case 'm':
                totalMs += value * 60 * 1000;
                break;
        }
    }

    return totalMs || 0;
};

/**
 * Formata intervalo em texto legível
 * @param {string} interval - Intervalo (ex: "30m", "1h")
 * @returns {string} Texto formatado
 */
const formatInterval = (interval) => {
    const regex = /(\d+)([hm])/g;
    const parts = [];
    let match;

    while ((match = regex.exec(interval)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 'h':
                parts.push(value === 1 ? '1 hora' : `${value} horas`);
                break;
            case 'm':
                parts.push(value === 1 ? '1 minuto' : `${value} minutos`);
                break;
        }
    }

    return parts.join(' e ');
};

/**
 * Valida formato de horário (HH:MM)
 * @param {string} time - Horário no formato HH:MM
 * @returns {boolean} True se válido
 */
const isValidTime = (time) => {
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(time);
};

/**
 * Converte horário string para objeto Date de hoje em São Paulo
 * @param {string} timeString - Horário no formato HH:MM
 * @returns {Date} Objeto Date
 */
const timeToDate = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = moment.tz('America/Sao_Paulo');
    date.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
    
    // Se o horário já passou hoje, agendar para amanhã
    if (date.isBefore(moment().tz('America/Sao_Paulo'))) {
        date.add(1, 'day');
    }
    
    return date.toDate();
};

/**
 * Gera ID único baseado em timestamp
 * @returns {string} ID único
 */
const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 5);
};

/**
 * Detecta tipos de links em uma mensagem
 * @param {string} message - Mensagem para analisar
 * @returns {Object} Objeto com tipos de links encontrados
 */
const detectLinks = (message) => {
    const result = {
        hasAnyLink: false,
        hasWhatsAppGroupLink: false,
        hasHttpLink: false,
        hasWwwLink: false,
        links: []
    };

    // Regex para links do WhatsApp
    const whatsappRegex = /(https?:\/\/)?(chat\.whatsapp\.com\/[a-zA-Z0-9]+)/gi;
    const httpRegex = /(https?:\/\/[^\s]+)/gi;
    const wwwRegex = /(www\.[^\s]+)/gi;
    const generalLinkRegex = /([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?/gi;

    // Verificar links do WhatsApp
    let match;
    while ((match = whatsappRegex.exec(message)) !== null) {
        result.hasWhatsAppGroupLink = true;
        result.hasAnyLink = true;
        result.links.push({ type: 'whatsapp', url: match[0] });
    }

    // Verificar links HTTP/HTTPS
    while ((match = httpRegex.exec(message)) !== null) {
        result.hasHttpLink = true;
        result.hasAnyLink = true;
        result.links.push({ type: 'http', url: match[0] });
    }

    // Verificar links WWW
    while ((match = wwwRegex.exec(message)) !== null) {
        result.hasWwwLink = true;
        result.hasAnyLink = true;
        result.links.push({ type: 'www', url: match[0] });
    }

    // Verificar outros tipos de links
    while ((match = generalLinkRegex.exec(message)) !== null) {
        // Evitar duplicatas
        const url = match[0];
        const exists = result.links.some(link => link.url.includes(url));
        
        if (!exists && !url.match(/^\d+$/)) { // Não considerar apenas números
            result.hasAnyLink = true;
            result.links.push({ type: 'general', url });
        }
    }

    return result;
};

/**
 * Menciona todos os membros de um grupo silenciosamente
 * @param {Client} client - Cliente WhatsApp
 * @param {string} groupId - ID do grupo
 * @returns {Object} Lista de membros e texto de menção
 */
const getAllMembers = async (client, groupId) => {
    try {
        const chat = await client.getChatById(groupId);
        const mentions = [];
        const mentionText = [];

        for (const participant of chat.participants) {
            if (!participant.id._serialized.includes(client.info.wid.user)) {
                mentions.push(participant.id._serialized);
                mentionText.push(`@${participant.id.user}`);
            }
        }

        return {
            mentions,
            text: mentionText.join(' '),
            count: mentions.length
        };
    } catch (error) {
        console.error('Erro ao obter membros:', error);
        return { mentions: [], text: '', count: 0 };
    }
};

/**
 * Agenda uma função para executar em um horário específico
 * @param {Date} targetTime - Horário alvo
 * @param {Function} callback - Função a ser executada
 * @returns {NodeJS.Timeout} Timer ID
 */
const scheduleFunction = (targetTime, callback) => {
    const now = new Date();
    const delay = targetTime.getTime() - now.getTime();
    
    if (delay > 0) {
        return setTimeout(callback, delay);
    } else {
        console.warn('Horário alvo já passou');
        return null;
    }
};

/**
 * Sorteia um item aleatório de uma array
 * @param {Array} array - Array para sortear
 * @returns {*} Item sorteado
 */
const randomItem = (array) => {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
};

/**
 * Limita o tamanho de uma string
 * @param {string} str - String original
 * @param {number} maxLength - Tamanho máximo
 * @returns {string} String limitada
 */
const truncateString = (str, maxLength = 100) => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
};

/**
 * Verifica se uma string é um número válido
 * @param {string} str - String para verificar
 * @returns {boolean} True se for número
 */
const isNumeric = (str) => {
    return !isNaN(str) && !isNaN(parseFloat(str));
};

/**
 * Sleep/delay assíncrono
 * @param {number} ms - Milissegundos para aguardar
 * @returns {Promise} Promise que resolve após o delay
 */
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Formata número de telefone para WhatsApp ID
 * @param {string} phone - Número de telefone
 * @returns {string} ID formatado para WhatsApp
 */
const formatPhoneToWhatsAppId = (phone) => {
    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Adiciona código do país se não tiver
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
        return '55' + cleaned.substring(1) + '@c.us';
    } else if (cleaned.length === 11) {
        return '55' + cleaned + '@c.us';
    } else if (cleaned.length === 13 && cleaned.startsWith('55')) {
        return cleaned + '@c.us';
    }
    
    return cleaned + '@c.us';
};

module.exports = {
    isAdmin,
    formatTime,
    parseInterval,
    formatInterval,
    isValidTime,
    timeToDate,
    generateId,
    detectLinks,
    getAllMembers,
    scheduleFunction,
    randomItem,
    truncateString,
    isNumeric,
    sleep,
    formatPhoneToWhatsAppId
};