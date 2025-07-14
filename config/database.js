const fs = require('fs-extra');
const path = require('path');

// Caminhos dos arquivos JSON
const DATA_DIR = path.join(__dirname, '..', 'data');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const ADS_FILE = path.join(DATA_DIR, 'ads.json');
const HORARIOS_FILE = path.join(DATA_DIR, 'horarios.json');
const IMAGES_FILE = path.join(DATA_DIR, 'images.json');

// Garantir que o diretório data existe
fs.ensureDirSync(DATA_DIR);

// Inicializar arquivos JSON se não existirem
const initializeFiles = () => {
    const defaultFiles = {
        [GROUPS_FILE]: {},
        [ADS_FILE]: {},
        [HORARIOS_FILE]: {
            "horarios": [
                "08:30", "09:15", "10:45", "11:30", "13:20", 
                "14:15", "15:45", "16:30", "18:20", "19:15", 
                "20:45", "21:30", "22:20", "23:15"
            ],
            "messages": [
                "🍀 HORÁRIOS PAGANTES 💰\n\n🕐 Próximo horário: {horario}\n\n💸 Aposte com responsabilidade!\n🎰 Boa sorte a todos!",
                "💰 DICA QUENTE! 🔥\n\n⏰ Horário: {horario}\n\n🍀 Este pode ser o seu momento da sorte!\n🎯 Não perca essa oportunidade!"
            ]
        },
        [IMAGES_FILE]: {
            "horarios": []
        }
    };

    Object.entries(defaultFiles).forEach(([filePath, defaultContent]) => {
        if (!fs.existsSync(filePath)) {
            fs.writeJsonSync(filePath, defaultContent, { spaces: 2 });
        }
    });
};

// Configuração padrão para novos grupos
const defaultGroupConfig = {
    welcomeEnabled: false,
    welcomeMessage: "🎉 Bem-vindo(a) ao grupo @user! 👋\n\n🙌 Esperamos que se sinta em casa no @group!",
    adsEnabled: true,
    ads: [],
    schedules: {
        open: null,
        close: null
    },
    antilink: {
        enabled: false,
        banExtremo: false,
        banLinkGp: false,
        antiLinkGp: false
    },
    horariosEnabled: false,
    horariosInterval: "1h",
    lastUpdate: new Date().toISOString(),
    planActive: true // Para integração futura com Laravel
};

/**
 * Carrega configuração de um grupo específico
 * @param {string} groupId - ID do grupo (formato: 123456789-123456@g.us)
 * @returns {Object} Configuração do grupo
 */
const loadConfig = async (groupId) => {
    try {
        initializeFiles();
        const groups = await fs.readJson(GROUPS_FILE);
        
        if (!groups[groupId]) {
            groups[groupId] = { ...defaultGroupConfig };
            await fs.writeJson(GROUPS_FILE, groups, { spaces: 2 });
        }
        
        return groups[groupId];
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        return { ...defaultGroupConfig };
    }
};

/**
 * Salva configuração de um grupo específico
 * @param {string} groupId - ID do grupo
 * @param {string} key - Chave da configuração
 * @param {*} value - Valor da configuração
 */
const saveConfig = async (groupId, key, value) => {
    try {
        initializeFiles();
        const groups = await fs.readJson(GROUPS_FILE);
        
        if (!groups[groupId]) {
            groups[groupId] = { ...defaultGroupConfig };
        }
        
        // Se a chave contém ponto, é um objeto aninhado
        if (key.includes('.')) {
            const keys = key.split('.');
            let current = groups[groupId];
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
        } else {
            groups[groupId][key] = value;
        }
        
        groups[groupId].lastUpdate = new Date().toISOString();
        await fs.writeJson(GROUPS_FILE, groups, { spaces: 2 });
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        return false;
    }
};

/**
 * Carrega todos os anúncios ativos
 * @returns {Object} Anúncios organizados por grupo
 */
const loadAds = async () => {
    try {
        initializeFiles();
        return await fs.readJson(ADS_FILE);
    } catch (error) {
        console.error('Erro ao carregar anúncios:', error);
        return {};
    }
};

/**
 * Salva anúncios
 * @param {Object} ads - Objeto com anúncios
 */
const saveAds = async (ads) => {
    try {
        await fs.writeJson(ADS_FILE, ads, { spaces: 2 });
        return true;
    } catch (error) {
        console.error('Erro ao salvar anúncios:', error);
        return false;
    }
};

/**
 * Carrega horários pagantes
 * @returns {Object} Configuração de horários
 */
const loadHorarios = async () => {
    try {
        initializeFiles();
        return await fs.readJson(HORARIOS_FILE);
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        return { horarios: [], messages: [] };
    }
};

/**
 * Carrega imagens configuradas
 * @returns {Object} Configuração de imagens
 */
const loadImages = async () => {
    try {
        initializeFiles();
        return await fs.readJson(IMAGES_FILE);
    } catch (error) {
        console.error('Erro ao carregar imagens:', error);
        return { horarios: [] };
    }
};

/**
 * Verifica se um grupo tem plano ativo (preparado para integração Laravel)
 * @param {string} groupId - ID do grupo
 * @returns {boolean} Status do plano
 */
const checkGroupPlan = async (groupId) => {
    try {
        // Futura integração com Laravel API
        // const response = await axios.get(`https://bottechwpp.com/api/groups/${groupId}/status`);
        // return response.data.active;
        
        // Por enquanto, usar configuração local
        const config = await loadConfig(groupId);
        return config.planActive;
    } catch (error) {
        console.error('Erro ao verificar plano do grupo:', error);
        return false;
    }
};

/**
 * Adiciona um anúncio para um grupo
 * @param {string} groupId - ID do grupo
 * @param {string} message - Mensagem do anúncio
 * @param {string} interval - Intervalo de envio
 * @returns {string} ID do anúncio criado
 */
const addAd = async (groupId, message, interval) => {
    try {
        const ads = await loadAds();
        if (!ads[groupId]) {
            ads[groupId] = [];
        }
        
        const adId = Date.now().toString();
        const newAd = {
            id: adId,
            message,
            interval,
            createdAt: new Date().toISOString(),
            lastSent: null
        };
        
        ads[groupId].push(newAd);
        await saveAds(ads);
        
        return adId;
    } catch (error) {
        console.error('Erro ao adicionar anúncio:', error);
        return null;
    }
};

/**
 * Remove um anúncio específico
 * @param {string} groupId - ID do grupo
 * @param {string} adId - ID do anúncio
 * @returns {boolean} Sucesso da operação
 */
const removeAd = async (groupId, adId) => {
    try {
        const ads = await loadAds();
        if (!ads[groupId]) {
            return false;
        }
        
        const initialLength = ads[groupId].length;
        ads[groupId] = ads[groupId].filter(ad => ad.id !== adId);
        
        if (ads[groupId].length < initialLength) {
            await saveAds(ads);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Erro ao remover anúncio:', error);
        return false;
    }
};

// Inicializar arquivos na importação
initializeFiles();

module.exports = {
    loadConfig,
    saveConfig,
    loadAds,
    saveAds,
    loadHorarios,
    loadImages,
    checkGroupPlan,
    addAd,
    removeAd,
    DATA_DIR,
    GROUPS_FILE,
    ADS_FILE,
    HORARIOS_FILE,
    IMAGES_FILE
};