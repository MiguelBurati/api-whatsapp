// src/handlers.js
const { getSession } = require('./session');
const { sendMainMenu, sendmenu_orcamento, sendmenu_manutencao, sendImpressoesMenu, sendAdministracaoMenu, sendOutrosMenu } = require('./menus');
const { startManutencaoColeta, finalizarColetaManutencao } = require('./coleta');
const { sendButtons } = require('../buttons');

// handleColetaResposta é usada internamente por handleTextCommand
async function handleColetaResposta({ sock, jid, text, session }) {
    const perguntas = session.perguntas;
    const step = session.step;

    if (session.aguardando_botao_horario) {
        const perguntaAtual = perguntas[step];
        const campo = perguntaAtual.campo;
        const validacao = perguntaAtual.validacao;

        if (validacao && !validacao(text)) {
            await sock.sendMessage(jid, { text: '❌ Resposta inválida. Por favor, responda novamente.' });
            await sock.sendMessage(jid, { text: perguntaAtual.pergunta });
            return;
        }

        session.data[campo] = text.trim();
        session.step++;
        session.aguardando_botao_horario = false;

        if (session.step >= perguntas.length) {
            await finalizarColetaManutencao(sock, jid, session);
        } else {
            const proximaPergunta = perguntas[session.step];
            await sock.sendMessage(jid, { text: proximaPergunta.pergunta });
        }
        return;
    }

    if (step >= perguntas.length) {
        await finalizarColetaManutencao(sock, jid, session);
        return;
    }

    const perguntaAtual = perguntas[step];
    const campo = perguntaAtual.campo;
    const validacao = perguntaAtual.validacao;

    if (perguntaAtual.botoes) {
        await sendButtons(sock, jid, {
            title: '🕐 Agendamento',
            text: perguntaAtual.pergunta,
            footer: '💡 Selecione uma opção:',
            buttons: perguntaAtual.opcoes.map(op => ({
                id: op.id,
                text: op.text
            }))
        });
        session.aguardando_botao_horario = true;
        return;
    }

    if (validacao && !validacao(text)) {
        await sock.sendMessage(jid, { text: '❌ Resposta inválida. Por favor, responda novamente.' });
        await sock.sendMessage(jid, { text: perguntaAtual.pergunta });
        return;
    }

    session.data[campo] = text.trim();
    session.step++;

    if (session.step >= perguntas.length) {
        await finalizarColetaManutencao(sock, jid, session);
    } else {
        const proximaPergunta = perguntas[session.step];
        if (proximaPergunta.botoes) {
            await handleColetaResposta({ sock, jid, text: '', session });
        } else {
            await sock.sendMessage(jid, { text: proximaPergunta.pergunta });
        }
    }
}

async function handleTextCommand({ sock, jid, text }) {
    const session = getSession(jid);

    if (session.state === 'coleta_dados') {
        await handleColetaResposta({ sock, jid, text, session });
        return;
    }

    if (!session.greeted) {
        session.greeted = true;
        session.state = 'main_menu';
        await sendMainMenu(sock, jid);
        return;
    }

    const lower = text.toLowerCase();
    if (lower === 'ajuda' || lower === 'menu') {
        session.state = 'main_menu';
        await sendMainMenu(sock, jid);
    } else if (lower === 'cancelar') {
        await sock.sendMessage(jid, { text: '❌ Operação cancelada. Digite "menu" para recomeçar.' });
        session.state = 'main_menu';
        session.data = {};
        session.step = 0;
        session.perguntas = [];
        session.manutencao_tipo = null;
    } else {
        await sock.sendMessage(jid, { text: '❓ Não entendi. Digite "ajuda" para ver as opções ou "menu" para voltar.' });
    }
}

async function handleButtonClick({ sock, jid, button }) {
    const session = getSession(jid);
    const { id, label } = button;
    console.log(`Botão clicado: ${id} (${label})`);

    // Botões de horário (tratamento especial)
    if (id === 'horario_manha') {
        const perguntas = session.perguntas;
        const step = session.step;
        if (step < perguntas.length) {
            session.data[perguntas[step].campo] = 'manhã';
        }
        session.step++;
        session.aguardando_botao_horario = false;
        
        if (session.step >= perguntas.length) {
            await finalizarColetaManutencao(sock, jid, session);
        } else {
            const proximaPergunta = perguntas[session.step];
            await sock.sendMessage(jid, { text: proximaPergunta.pergunta });
        }
        return;
    }
    
    if (id === 'horario_tarde') {
        const perguntas = session.perguntas;
        const step = session.step;
        if (step < perguntas.length) {
            session.data[perguntas[step].campo] = 'tarde';
        }
        session.step++;
        session.aguardando_botao_horario = false;
        
        if (session.step >= perguntas.length) {
            await finalizarColetaManutencao(sock, jid, session);
        } else {
            const proximaPergunta = perguntas[session.step];
            await sock.sendMessage(jid, { text: proximaPergunta.pergunta });
        }
        return;
    }

    switch (id) {
        case 'menu_orcamento':
            await sendmenu_orcamento(sock, jid);
            break;

        case 'menu_manutencao':
            await sendmenu_manutencao(sock, jid);
            break;

        case 'menu_administracao':
            await sendAdministracaoMenu(sock, jid);
            break;

        case 'menu_impressoes3d':
            await sendImpressoesMenu(sock, jid);
            break;

        case 'menu_outros':
            await sendOutrosMenu(sock, jid);
            break;

        case 'orc_motor':
            await sock.sendMessage(jid, { text: '🔧 Orçamento para Motor - Nossa equipe entrará em contato em breve.' });
            break;
        case 'orc_camera':
            await sock.sendMessage(jid, { text: '📷 Orçamento para Câmeras - Nossa equipe entrará em contato em breve.' });
            break;
        case 'orc_alarme':
            await sock.sendMessage(jid, { text: '🚨 Orçamento para Alarme - Nossa equipe entrará em contato em breve.' });
            break;
        case 'orc_interfonia':
            await sock.sendMessage(jid, { text: '📞 Orçamento para Interfonia - Nossa equipe entrará em contato em breve.' });
            break;
        case 'orc_cerca_eletrica':
            await sock.sendMessage(jid, { text: '⚡ Orçamento para Cerca Elétrica - Nossa equipe entrará em contato em breve.' });
            break;
        case 'orc_paineis_solares':
            await sock.sendMessage(jid, { text: '☀️ Orçamento para Painéis Solares - Nossa equipe entrará em contato em breve.' });
            break;

        case 'manut_motor':
            await sock.sendMessage(jid, { text: '🔧 *Manutenção de Motor*\nVamos iniciar o processo de agendamento.' });
            await startManutencaoColeta(sock, jid, session, 'Motor');
            break;
        case 'manut_camera':
            await sock.sendMessage(jid, { text: '📷 *Manutenção de Câmeras*\nVamos iniciar o processo de agendamento.' });
            await startManutencaoColeta(sock, jid, session, 'Câmeras');
            break;
        case 'manut_alarme':
            await sock.sendMessage(jid, { text: '🚨 *Manutenção de Alarme*\nVamos iniciar o processo de agendamento.' });
            await startManutencaoColeta(sock, jid, session, 'Alarme');
            break;
        case 'manut_interfonia':
            await sock.sendMessage(jid, { text: '📞 *Manutenção de Interfonia*\nVamos iniciar o processo de agendamento.' });
            await startManutencaoColeta(sock, jid, session, 'Interfonia');
            break;
        case 'manut_cerca':
            await sock.sendMessage(jid, { text: '⚡ *Manutenção de Cerca Elétrica*\nVamos iniciar o processo de agendamento.' });
            await startManutencaoColeta(sock, jid, session, 'Cerca Elétrica');
            break;
        case 'manut_solar':
            await sock.sendMessage(jid, { text: '☀️ *Manutenção de Painéis Solares*\nVamos iniciar o processo de agendamento.' });
            await startManutencaoColeta(sock, jid, session, 'Painéis Solares');
            break;

        case 'voltar_menu':
            session.state = 'main_menu';
            await sendMainMenu(sock, jid);
            break;

        default:
            await sock.sendMessage(jid, { text: '❓ Opção não reconhecida. Digite "menu" para recomeçar.' });
            session.state = 'main_menu';
            await sendMainMenu(sock, jid);
            break;
    }
}

module.exports = { handleTextCommand, handleButtonClick, handleColetaResposta };