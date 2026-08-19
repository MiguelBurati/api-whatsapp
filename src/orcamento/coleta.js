const { sendMainMenu } = require('../shared/menu');

async function startOrcamentoColeta(sock, jid, session, tipo) {
    session.state = 'coleta_dados';
    session.fluxo_atual = 'orcamento';
    session.orcamento_tipo = tipo;
    session.data = { tipo_orcamento: tipo };
    session.aguardando_botao_horario = false;
    session.perguntas = [
        { pergunta: 'Qual é o seu nome?', campo: 'nome', validacao: (valor) => valor.trim().length > 2 },
        { pergunta: 'Descreva o serviço que deseja orçar:', campo: 'descricao', validacao: (valor) => valor.trim().length > 5 },
        { pergunta: 'Qual é o seu endereço completo?', campo: 'endereco', validacao: (valor) => valor.trim().length > 5 },
        { pergunta: 'Qual o melhor horário para entrarmos em contato?', campo: 'horario', validacao: (valor) => valor.trim().length > 0 }
    ];
    session.step = 0;
    await sock.sendMessage(jid, { text: session.perguntas[0].pergunta });
}

async function finalizarColetaOrcamento(sock, jid, session) {
    const data = session.data;
    let resumo = '💰 *ORDEM DE SERVIÇO - ORÇAMENTO*\n\n';
    resumo += `📋 *Tipo:* ${session.orcamento_tipo || 'Não especificado'}\n`;
    resumo += `👤 *Cliente:* ${data.nome || 'Não informado'}\n`;
    resumo += `📝 *Descrição:* ${data.descricao || 'Não informado'}\n`;
    resumo += `🏠 *Endereço:* ${data.endereco || 'Não informado'}\n`;
    resumo += `🕐 *Horário para contato:* ${data.horario || 'Não informado'}\n\n`;
    resumo += '✅ *Em breve entraremos em contato para preparar seu orçamento*';

    await sock.sendMessage(jid, { text: resumo });
    session.state = 'main_menu';
    session.fluxo_atual = null;
    session.data = {};
    session.step = 0;
    session.perguntas = [];
    session.orcamento_tipo = null;
    await sendMainMenu(sock, jid);
}

module.exports = { startOrcamentoColeta, finalizarColetaOrcamento };