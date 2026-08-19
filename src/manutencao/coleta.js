const { sendMainMenu } = require('../shared/menu');

async function startManutencaoColeta(sock, jid, session, tipo) {
    session.state = 'coleta_dados';
    session.fluxo_atual = 'manutencao';
    session.manutencao_tipo = tipo;
    session.data = { tipo_manutencao: tipo };
    session.aguardando_botao_horario = false;
    session.perguntas = [
        { pergunta: 'Qual é o seu nome?', campo: 'nome', validacao: (valor) => valor.trim().length > 2 },
        { pergunta: 'Qual a marca do equipamento?', campo: 'marca', validacao: (valor) => valor.trim().length > 0 },
        { pergunta: 'Descreva o problema que está ocorrendo:', campo: 'problema', validacao: (valor) => valor.trim().length > 5 },
        { pergunta: 'Quando o problema começou?', campo: 'quando', validacao: (valor) => valor.trim().length > 0 },
        { pergunta: 'Qual é o seu endereço completo? (CEP - Cidade - Rua - nº)', campo: 'endereco', validacao: (valor) => valor.trim().length > 5 },
        {
            pergunta: 'Qual o melhor horário para agendarmos a visita técnica?',
            campo: 'horario',
            validacao: (valor) => ['manhã', 'tarde'].includes(valor.toLowerCase()),
            botoes: true,
            opcoes: [
                { id: 'horario_manha', text: '🌅 Parte da manhã' },
                { id: 'horario_tarde', text: '🌇 Parte da tarde' }
            ]
        }
    ];
    session.step = 0;
    await sock.sendMessage(jid, { text: session.perguntas[0].pergunta });
}

async function finalizarColetaManutencao(sock, jid, session) {
    const data = session.data;
    const horarioMap = { manhã: '🌅 Parte da manhã', manha: '🌅 Parte da manhã', tarde: '🌇 Parte da tarde' };
    const horario = horarioMap[(data.horario || '').toLowerCase()] || data.horario || 'Não informado';
    let resumo = '🔧 *ORDEM DE SERVIÇO - MANUTENÇÃO*\n\n';
    resumo += `📋 *Tipo:* ${session.manutencao_tipo || 'Não especificado'}\n`;
    resumo += `👤 *Cliente:* ${data.nome || 'Não informado'}\n`;
    resumo += `🔢 *Marca Equipamento:* ${data.marca || 'Não informado'}\n`;
    resumo += `⚠️ *Problema:* ${data.problema || 'Não informado'}\n`;
    resumo += `📅 *Início do problema:* ${data.quando || 'Não informado'}\n`;
    resumo += `🏠 *Endereço:* ${data.endereco || 'Não informado'}\n`;
    resumo += `🕐 *Horário preferencial:* ${horario}\n\n`;
    resumo += '✅ *Em breve entraremos em contato para agendar a manutenção*';

    await sock.sendMessage(jid, { text: resumo });
    session.state = 'main_menu';
    session.fluxo_atual = null;
    session.data = {};
    session.step = 0;
    session.perguntas = [];
    session.manutencao_tipo = null;
    session.aguardando_botao_horario = false;
    await sendMainMenu(sock, jid);
}

module.exports = { startManutencaoColeta, finalizarColetaManutencao };