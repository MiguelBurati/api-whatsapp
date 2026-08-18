// src/coleta.js
const { sendButtons } = require('../buttons');
const { sendMainMenu } = require('./menus');

async function startManutencaoColeta(sock, jid, session, tipo) {
    session.state = 'coleta_dados';
    session.manutencao_tipo = tipo;
    session.data = { tipo_manutencao: tipo };
    session.aguardando_botao_horario = false;
    session.perguntas = [
        {
            pergunta: 'Qual é o seu nome?',
            campo: 'nome',
            validacao: (v) => v.trim().length > 2,
        },
        {
            pergunta: 'Qual a marca do equipamento?',
            campo: 'marca',
            validacao: (v) => v.trim().length > 0,
        },
        {
            pergunta: 'Descreva o problema que está ocorrendo:',
            campo: 'problema',
            validacao: (v) => v.trim().length > 5,
        },
        {
            pergunta: 'Quando o problema começou?',
            campo: 'quando',
            validacao: (v) => v.trim().length > 0,
        },
        {
            pergunta: 'Qual é o seu endereço completo? (CEP - Cidade - Rua - nº)',
            campo: 'endereco',
            validacao: (v) => v.trim().length > 5,
        },
        {
            pergunta: 'Qual o melhor horário para agendarmos a visita técnica?',
            campo: 'horario',
            validacao: (v) => ['manhã', 'tarde'].includes(v.toLowerCase()),
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
    const tipoManutencao = session.manutencao_tipo || 'Não especificado';
    
    let horario = data.horario || 'Não informado';
    const horarioMap = {
        'manhã': '🌅 Parte da manhã',
        'manha': '🌅 Parte da manhã',
        'tarde': '🌇 Parte da tarde'
    };
    horario = horarioMap[horario.toLowerCase()] || horario;

    let resumo = '🔧 *ORDEM DE SERVIÇO - MANUTENÇÃO*\n\n';
    resumo += `📋 *Tipo:* ${tipoManutencao}\n`;
    resumo += `👤 *Cliente:* ${data.nome || 'Não informado'}\n`;
    resumo += `🔢 *Marca Equipamento:* ${data.marca || 'Não informado'}\n`;
    resumo += `⚠️ *Problema:* ${data.problema || 'Não informado'}\n`;
    resumo += `📅 *Início do problema:* ${data.quando || 'Não informado'}\n`;
    resumo += `🏠 *Endereço:* ${data.endereco || 'Não informado'}\n`;
    resumo += `🕐 *Horário preferencial:* ${horario}\n\n`;
    resumo += '✅ *Em breve entraremos em contato para agendar a manutenção*';

    await sock.sendMessage(jid, { text: resumo });

    session.state = 'main_menu';
    session.data = {};
    session.step = 0;
    session.perguntas = [];
    session.manutencao_tipo = null;
    session.aguardando_botao_horario = false;
    await sendMainMenu(sock, jid);
}

module.exports = { startManutencaoColeta, finalizarColetaManutencao };