const { sendMainMenu, sendMenuFinal } = require('../shared/menu');

const perguntasPadraoOrcamento = [
    {
        pergunta: 'Qual é o seu nome?',
        campo: 'nome',
        validacao: (valor) => valor.trim().length > 2
    },
    {
        pergunta: 'Qual é o seu endereço completo? (CEP - Cidade - Rua - nº)',
        campo: 'endereco',
        validacao: (valor) => valor.trim().length > 5
    },
    {
        pergunta: 'Qual o melhor horário para agendarmos a visita técnica?',
        campo: 'horario',
        validacao: (valor) => ['manhã', 'manha', 'tarde'].includes(valor.toLowerCase()),
        botoes: true,
        opcoes: [
            { id: 'horario_manha', text: '🌅 Parte da manhã', valor: 'manhã' },
            { id: 'horario_tarde', text: '🌇 Parte da tarde', valor: 'tarde' }
        ]
    }
];

// Configuração de perguntas por tipo de orçamento
const perguntasPorTipo = {
    motor: [
        {
            pergunta: 'Qual o tipo de motor que deseja orçar?',
            campo: 'tipo_motor',
            validacao: (valor) => ['basculante', 'pivotante', 'deslizante'].includes(valor.toLowerCase()),
            botoes: true,
            opcoes: [
                { id: 'basculante', text: 'Basculante' },
                { id: 'pivotante', text: 'Pivotante' },
                { id: 'deslizante', text: 'Deslizante' }
            ]
        },
        {
            pergunta: 'Quais são as medidas do portão? (Largura x Altura)',
            campo: 'medidas',
            validacao: (valor) => valor.trim().length > 0
        }
    ],
    camera: [
        {
            pergunta: 'Quantas câmeras deseja instalar?',
            campo: 'quantidade_cameras',
            validacao: (valor) => !isNaN(parseInt(valor)) && parseInt(valor) > 0
        }, 
        {
            pergunta: 'Será em ambiente interno ou externo?',
            campo: 'ambiente',
            validacao: (valor) => ['interno', 'externo'].includes(valor.toLowerCase()),
            botoes: true,
            opcoes: [
                { id: 'interno', text: 'Interno' },
                { id: 'externo', text: 'Externo' }
            ]
        },
        {
            pergunta: 'No local da instalação, há alcance de internet?',
            campo: 'alcance_internet',
            validacao: (valor) => ['sim', 'não'].includes(valor.toLowerCase()),
            botoes: true,
            opcoes: [
                { id: 'sim', text: 'Sim' },
                { id: 'nao', text: 'Não', valor: 'não' }
            ]
        }
    ],
    painel_solar: [
        {
            pergunta: 'Envie um demonstrativo de consumo dos últimos 12 meses.',
            campo: 'demonstrativo_consumo',
            validacao: (valor) => valor.trim().length > 0
        }
    ]
};

/**
 * Inicia a coleta de dados para um orçamento.
 * @param {object} sock - Socket do WhatsApp
 * @param {string} jid - ID do usuário
 * @param {object} session - Sessão do usuário
 * @param {string} tipo - Tipo de orçamento (ex: 'motor', 'camera')
 */
async function startOrcamentoColeta(sock, jid, session, tipo) {
    // Define o estado da sessão
    session.state = 'coleta_dados';
    session.fluxo_atual = 'orcamento';
    session.orcamento_tipo = tipo;
    session.data = { tipo_orcamento: tipo };
    session.aguardando_botao_horario = false;

    const tipoConfiguracao = typeof tipo === 'string'
        ? tipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        : tipo;
    const perguntasEspecificas = perguntasPorTipo[tipoConfiguracao] || [];
    session.perguntas = [
        perguntasPadraoOrcamento[0],
        ...perguntasEspecificas,
        ...perguntasPadraoOrcamento.slice(1)
    ];

    session.step = 0;

    // Envia a primeira pergunta
    const primeiraPergunta = session.perguntas[0];
    if (primeiraPergunta.botoes) {
        // Se a primeira pergunta tiver botões, chamamos handleColetaResposta para exibi-los
        // Mas como estamos iniciando, vamos enviar os botões diretamente
        const { sendButtons } = require('../../buttons');
        await sendButtons(sock, jid, {
            title: 'Seleção',
            text: primeiraPergunta.pergunta,
            footer: '💡 Escolha uma opção:',
            buttons: primeiraPergunta.opcoes.map(op => ({
                id: op.id,
                text: op.text
            }))
        });
        session.aguardando_botao_horario = true;
    } else {
        await sock.sendMessage(jid, { text: primeiraPergunta.pergunta });
    }
}

/**
 * Finaliza a coleta e exibe o resumo do orçamento.
 */
async function finalizarColetaOrcamento(sock, jid, session) {
    const data = session.data;
    const tipo = session.orcamento_tipo || 'Não especificado';
    const horarioMap = { manhã: '🌅 Parte da manhã', manha: '🌅 Parte da manhã', tarde: '🌇 Parte da tarde' };
    const horario = horarioMap[(data.horario || '').toLowerCase()] || data.horario || 'Não informado';

    const labelsPorCampo = {
        nome: { emoji: '👤', label: '*Nome*' },
        tipo_motor: { emoji: '🔧', label: '*Tipo de motor*' },
        medidas: { emoji: '📏', label: '*Medidas do portão*' },
        quantidade_cameras: { emoji: '📷', label: '*Quantidade de câmeras*' },
        ambiente: { emoji: '🏢', label: '*Ambiente*' },
        alcance_internet: { emoji: '📶', label: '*Alcance de internet*' },
        demonstrativo_consumo: { emoji: '📄', label: '*Demonstrativo de consumo*' },
        endereco: { emoji: '🏠', label: '*Endereço*' }
    };

    let resumo = '💰 *ORDEM DE SERVIÇO - ORÇAMENTO*\n\n';
    resumo += `📋 *Tipo:* ${tipo}\n`;

    for (const [campo, valor] of Object.entries(data)) {
        if (!valor || campo === 'tipo_orcamento' || campo === 'horario') continue;

        const campoFormatado = labelsPorCampo[campo] || {
            emoji: '📌',
            label: `*${campo.replace(/_/g, ' ').replace(/\b\w/g, (letra) => letra.toUpperCase())}*`
        };

        resumo += `${campoFormatado.emoji} ${campoFormatado.label}: ${valor}\n`;
    }

    resumo += `🕐 *Horário preferencial:* ${horario}\n\n`;
    resumo += '✅ *Em breve entraremos em contato para preparar seu orçamento*';

    await sock.sendMessage(jid, { text: resumo });

    session.state = 'main_menu';
    session.fluxo_atual = null;
    session.data = {};
    session.step = 0;
    session.perguntas = [];
    session.orcamento_tipo = null;
    session.aguardando_botao_horario = false;
    await sendMenuFinal(sock, jid);
}

module.exports = { startOrcamentoColeta, finalizarColetaOrcamento };