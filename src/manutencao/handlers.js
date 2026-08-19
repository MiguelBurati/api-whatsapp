const { handleColetaResposta: handleGenericColetaResposta } = require('../shared/coletaHandler');
const { finalizarColetaManutencao } = require('./coleta');

async function handleColetaResposta(args) {
    return handleGenericColetaResposta({ ...args, finalizarColeta: finalizarColetaManutencao });
}

async function handleButtonClick({ sock, jid, button, session }) {
    const { id } = button;
    if (id !== 'horario_manha' && id !== 'horario_tarde') return false;
    const valor = id === 'horario_manha' ? 'manhã' : 'tarde';
    const pergunta = session.perguntas[session.step];
    if (pergunta && session.step < session.perguntas.length) {
        session.data[pergunta.campo] = valor;
    }
    session.step++;
    session.aguardando_botao_horario = false;
    if (session.step >= session.perguntas.length) {
        await finalizarColetaManutencao(sock, jid, session);
    } else {
        await sock.sendMessage(jid, { text: session.perguntas[session.step].pergunta });
    }
    return true;
}

module.exports = { handleButtonClick, handleColetaResposta };