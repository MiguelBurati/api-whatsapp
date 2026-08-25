const { sendButtons } = require('../../buttons');

async function handleColetaResposta({ sock, jid, text, session, finalizarColeta }) {
    const perguntas = session.perguntas;
    const step = session.step;

    if (session.aguardando_botao_horario) {
        const perguntaAtual = perguntas[step];
        const opcaoSelecionada = perguntaAtual.opcoes?.find((opcao) => opcao.id === text);
        const valorResposta = opcaoSelecionada?.valor || text;
        const validacao = perguntaAtual.validacao;
        if (validacao && !validacao(valorResposta)) {
            await sock.sendMessage(jid, { text: '❌ Resposta inválida. Por favor, responda novamente.' });
            await sock.sendMessage(jid, { text: perguntaAtual.pergunta });
            return;
        }
        session.data[perguntaAtual.campo] = valorResposta.trim();
        session.step++;
        const perguntasExtras = perguntaAtual.perguntasExtras?.[valorResposta.trim().toLowerCase()];
        if (perguntasExtras?.length) session.perguntas.splice(session.step, 0, ...perguntasExtras);
        session.aguardando_botao_horario = false;
        if (session.step >= perguntas.length) {
            await finalizarColeta(sock, jid, session);
        } else if (perguntas[session.step].botoes) {
            await handleColetaResposta({ sock, jid, text: '', session, finalizarColeta });
        } else {
            await sock.sendMessage(jid, { text: perguntas[session.step].pergunta });
        }
        return;
    }

    if (step >= perguntas.length) {
        await finalizarColeta(sock, jid, session);
        return;
    }

    const perguntaAtual = perguntas[step];
    if (perguntaAtual.botoes) {
        await sendButtons(sock, jid, {
            title: '🕐 Agendamento',
            text: perguntaAtual.pergunta,
            footer: '💡 Selecione uma opção:',
            buttons: perguntaAtual.opcoes.map((opcao) => ({ id: opcao.id, text: opcao.text }))
        });
        session.aguardando_botao_horario = true;
        return;
    }

    if (perguntaAtual.validacao && !perguntaAtual.validacao(text)) {
        await sock.sendMessage(jid, { text: '❌ Resposta inválida. Por favor, responda novamente.' });
        await sock.sendMessage(jid, { text: perguntaAtual.pergunta });
        return;
    }

    session.data[perguntaAtual.campo] = text.trim();
    session.step++;
    if (session.step >= perguntas.length) {
        await finalizarColeta(sock, jid, session);
    } else if (perguntas[session.step].botoes) {
        await handleColetaResposta({ sock, jid, text: '', session, finalizarColeta });
    } else {
        await sock.sendMessage(jid, { text: perguntas[session.step].pergunta });
    }
}

module.exports = { handleColetaResposta };