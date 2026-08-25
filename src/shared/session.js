const userSession = new Map();

const ATTENDANT_PAUSE_MS = Number(process.env.ATTENDANT_PAUSE_MS) || 2 * 60 * 1000;

function getSession(userJid) {
    if (!userSession.has(userJid)) {
        userSession.set(userJid, {
            state: 'main_menu',
            data: {},
            step: 0,
            perguntas: [],
            greeted: false,
            fluxo_atual: null,
            manutencao_tipo: null,
            orcamento_tipo: null,
            aguardando_botao_horario: false,
            pausadoAte: 0,
            aguardandoEscolhaAtendimento: false
        });
    }
    return userSession.get(userJid);
}

function pausarParaAtendimento(session) {
    session.pausadoAte = Date.now() + ATTENDANT_PAUSE_MS;
    session.aguardandoEscolhaAtendimento = false;
}

function atendimentoPausado(session) {
    return session.pausadoAte > Date.now();
}

function limparPausa(session) {
    session.pausadoAte = 0;
    session.aguardandoEscolhaAtendimento = false;
}

module.exports = {
    userSession,
    getSession,
    ATTENDANT_PAUSE_MS,
    pausarParaAtendimento,
    atendimentoPausado,
    limparPausa
};