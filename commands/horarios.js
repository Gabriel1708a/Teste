const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

class HorariosCommand {
    static async execute(message, client) {
        try {
            const now = moment.tz("America/Sao_Paulo");
            const currentHour = now.hours();

            const plataformas = [
                "🐯 FORTUNE TIGER", "� DRAGON LUCK", "� FORTUNE RABBIT", "🐭 FORTUNE MOUSE",
                "� GANESHA GOLD", "👙 BIKINI", "🥊 MUAY THAI", "🎪 CIRCUS", "🐂 FORTUNE OX",
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

            const mensagemFinal = `Dica: alterne entre os giros entre normal e turbo, se vier um Grande Ganho, PARE e espere a próxima brecha!\n�NÃO INDICADO PARA MENORES🔞\nLembrando a todos!\nHorários de probabilidades aumentam muito sua chance de lucrar, mas lembrando que não anula a chance de perda, por mais que seja baixa jogue com responsabilidade...\n\nSistema By: Aurora\nCreat: Aurora Bot Oficial`;

            horariosText += mensagemFinal;

            await message.reply(horariosText);

        } catch (error) {
            console.error("Erro no comando !horarios:", error);
            await message.reply("❌ Erro ao buscar horários. Tente novamente.");
        }
    }

    // Métodos toggleAutoHorarios, setInterval e startAutoHorarios não são mais relevantes para a nova lógica de geração aleatória
    // e serão removidos ou adaptados se houver necessidade de agendamento automático com essa nova lógica.
    static async toggleAutoHorarios(message, client, args) {
        await message.reply("Este comando foi desativado. A geração de horários agora é aleatória por hora.");
    }

    static async setInterval(message, client, intervalStr) {
        await message.reply("Este comando foi desativado. A geração de horários agora é aleatória por hora.");
    }

    static startAutoHorarios(groupId, client) {
        // Lógica de agendamento automático precisa ser revisada para a nova geração aleatória
        console.log("startAutoHorarios desativado para a nova lógica de horários.");
    }

    static initializeAutoHorarios(client) {
        console.log("initializeAutoHorarios desativado para a nova lógica de horários.");
    }
}

module.exports = HorariosCommand;