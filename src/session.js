// src/session.js
const userSession = new Map();

function getSession(userJid) {
    if (!userSession.has(userJid)) {
        userSession.set(userJid, {
            state: 'main_menu',
            data: {},
            step: 0,
            perguntas: [],
            greeted: false,
            manutencao_tipo: null,
            aguardando_botao_horario: false
        });
    }
    return userSession.get(userJid);
}

module.exports = { getSession };