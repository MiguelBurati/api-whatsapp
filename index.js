// index.js
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const { sendButtons } = require('./buttons');

// -------------------- UTILITIES --------------------

function unwrapMessage(msg) {
    let cur = msg;
    while (
        cur?.ephemeralMessage?.message ||
        cur?.viewOnceMessage?.message ||
        cur?.viewOnceMessageV2?.message
    ) {
        cur =
            cur.ephemeralMessage?.message ||
            cur.viewOnceMessage?.message ||
            cur.viewOnceMessageV2?.message;
    }
    return cur || msg;
}

// -------------------- SESSÃO DO USUÁRIO --------------------
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

// -------------------- FUNÇÕES DE ENVIO DE MENUS --------------------

async function sendMainMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '👋 Olá! Seja bem‑vindo(a) à nossa central de atendimento!',
        text: 'Selecione a opção desejada para continuar:',
        footer: '💡 Estamos aqui para ajudar 24h por dia!',
        buttons: [
            { id: 'menu_orcamento', text: '1️⃣ Orçamento' },
            { id: 'menu_manutencao', text: '2️⃣ Manutenção' },
            { id: 'menu_administracao', text: '3️⃣ Administração/Financeiro' },
            { id: 'menu_impressoes3d', text: '4️⃣ Impressões 3D' },
            { id: 'menu_outros', text: '5️⃣ Outros' },
        ],
    });
}

async function sendmenu_orcamento(sock, jid) {
    await sendButtons(sock, jid, {
        title: '💰 Orçamento',
        text: 'Selecione o tipo de orçamento que deseja:',
        footer: '💡 Estamos aqui para ajudar 24h por dia!',
        buttons: [
            { id: 'orc_motor', text: '🔧 Motor' },
            { id: 'orc_camera', text: '📷 Câmera' },
            { id: 'orc_alarme', text: '🚨 Alarme' },
            { id: 'orc_interfonia', text: '📞 Interfonia' },
            { id: 'orc_cerca_eletrica', text: '⚡ Cerca Elétrica/Concertina' },
            { id: 'orc_paineis_solares', text: '☀️ Painéis Solares' },
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' },
        ],
    });
}

async function sendmenu_manutencao(sock, jid) {
    await sendButtons(sock, jid, {
        title: '🔧 Manutenção',
        text: 'Selecione o tipo de manutenção:',
        footer: '💡 Estamos aqui para ajudar 24h por dia!',
        buttons: [
            { id: 'manut_motor', text: '🔧 Motor' },
            { id: 'manut_camera', text: '📷 Câmeras' },
            { id: 'manut_alarme', text: '🚨 Alarme' },
            { id: 'manut_interfonia', text: '📞 Interfonia' },
            { id: 'manut_cerca', text: '⚡ Cerca Elétrica' },
            { id: 'manut_solar', text: '☀️ Painéis Solares' },
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' },
        ],
    });
}

// ========== FUNÇÕES DE MANUTENÇÃO ==========

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

// -------------------- OUTRAS FUNÇÕES DE MENU --------------------

async function sendImpressoesMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '🖨️ Impressões 3D',
        text: 'Selecione uma ação:',
        footer: '💡 Atendimento 24h',
        buttons: [
            { id: 'imp_catalogo', text: '🖼️ Ver catálogo' },
            { id: 'imp_orcamento', text: '💰 Solicitar orçamento' },
            { id: 'imp_consulta', text: '🔍 Consultar pedido' },
            { id: 'imp_alterar', text: '✏️ Alterar pedido' },
            { id: 'voltar_menu', text: '🔙 Voltar' },
        ],
    });
}

async function sendAdministracaoMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '📊 Administração/Financeiro',
        text: 'Selecione uma opção:',
        footer: '💡 Estamos aqui para ajudar 24h por dia!',
        buttons: [
            { id: 'admin_fatura', text: '📄 Fatura/Nota Fiscal' },
            { id: 'admin_pagamento', text: '💳 Formas de Pagamento' },
            { id: 'admin_suporte', text: '👨‍💼 Falar com Financeiro' },
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' },
        ],
    });
}

async function sendOutrosMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '📋 Outros Serviços',
        text: 'Selecione uma opção ou nos conte o que precisa:',
        footer: '💡 Estamos aqui para ajudar 24h por dia!',
        buttons: [
            { id: 'outros_duvidas', text: '❓ Dúvidas Gerais' },
            { id: 'outros_parceria', text: '🤝 Parcerias' },
            { id: 'outros_falar_atendente', text: '💬 Falar com Atendente' },
            { id: 'voltar_menu', text: '🔙 Voltar ao menu principal' },
        ],
    });
}

// -------------------- HANDLERS DE TEXTO E BOTÕES --------------------

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

    // Botões de horário
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

        case 'admin_fatura':
            await sock.sendMessage(jid, { text: '📄 Para solicitar uma segunda via de fatura ou NF, informe seu CPF/CNPJ.' });
            break;
        case 'admin_pagamento':
            await sock.sendMessage(jid, { text: '💳 Aceitamos cartão de crédito/débito, PIX, boleto bancário e transferência.' });
            break;
        case 'admin_suporte':
            await sock.sendMessage(jid, { text: '👨‍💼 Em breve um especialista do financeiro entrará em contato.' });
            break;

        case 'imp_catalogo':
            await sock.sendMessage(jid, { text: '🖼️ Catálogo de produtos: https://exemplo.com/catalogo' });
            break;
        case 'imp_orcamento':
            await sock.sendMessage(jid, { text: '💰 Para solicitar um orçamento, envie o arquivo 3D (STL/OBJ).' });
            break;
        case 'imp_consulta':
            await sock.sendMessage(jid, { text: '🔍 Para consultar seu pedido, informe o número do pedido.' });
            break;
        case 'imp_alterar':
            await sock.sendMessage(jid, { text: '✏️ Para alterar um pedido, informe o número do pedido.' });
            break;

        case 'outros_duvidas':
            await sock.sendMessage(jid, { text: '❓ Envie sua dúvida e responderemos o mais breve possível.' });
            break;
        case 'outros_parceria':
            await sock.sendMessage(jid, { text: '🤝 Para parcerias, envie um e-mail para parcerias@empresa.com' });
            break;
        case 'outros_falar_atendente':
            await sock.sendMessage(jid, { text: '💬 Em breve um atendente estará disponível para conversar.' });
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

// -------------------- SETUP DO SOCKET --------------------

async function createSocket() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');

    const sock = makeWASocket({
        auth: state,
        emitOwnEvents: false,
        printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('📱 Escaneie este QR Code com o WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect?.error)?.output?.statusCode !==
                DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log('🔄 Conexão fechada, reconectando…');
                startBot();
            } else {
                console.log('❌ Conexão fechada. Você foi desconectado.');
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp conectado com sucesso!');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const m = messages[0];
        if (!m || !m.message) return;

        const jid = m.key.remoteJid;
        if (m.key.fromMe || jid === 'status@broadcast') return;

        const msg = unwrapMessage(m.message);

        const rawText =
            msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption ||
            msg.videoMessage?.caption ||
            '';
        const text = rawText.trim();

        if (text) {
            await handleTextCommand({ sock, jid, text });
        }

        const tpl = msg.templateButtonReplyMessage;
        if (tpl) {
            const button = {
                id: tpl.selectedId,
                label: tpl.selectedDisplayText,
                raw: tpl,
            };
            await handleButtonClick({ sock, jid, button });
        }
    });

    return sock;
}

// -------------------- ENTRY POINT --------------------

async function startBot() {
    const sock = await createSocket();
    console.log('🤖 Bot iniciado! Aguardando mensagens...');
}

startBot().catch(console.error);