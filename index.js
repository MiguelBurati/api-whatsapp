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

// -------------------- SESSÃO DO USUÁRIO (em memória) --------------------
// Usamos o JID do usuário como chave (porque é um único bot)
const userSession = new Map();

function getSession(userJid) {
    if (!userSession.has(userJid)) {
        userSession.set(userJid, {
            state: 'main_menu',      // 'main_menu' | 'coleta_dados'
            data: {},                // respostas coletadas
            step: 0,                 // índice da pergunta atual
            perguntas: [],           // lista de perguntas
            greeted: false
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

async function startManutencaoColeta(sock, jid, session, tipo) {
    session.state = 'coleta_dados';
    session.manutencao_tipo = tipo;
    session.data = { tipo_manutencao: tipo };
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
                { id: 'horario_manha', text: 'Parte da manhã' },
                { id: 'horario_tarde', text: 'Parte da tarde' }
            ]
        }
    ];
    session.step = 0;

    await sock.sendMessage(jid, { text: session.perguntas[0].pergunta });
}

async function finalizarColetaManutencao(sock, jid, session) {
    const data = session.data;
    const tipoManutencao = session.manutencao_tipo || 'Não especificado';
    
    let resumo = '🔧 *ORDEM DE SERVIÇO - MANUTENÇÃO*\n\n';
    resumo += `📋 *Tipo:* ${tipoManutencao}\n`;
    resumo += `👤 *Cliente:* ${data.nome || 'Não informado'}\n`;
    resumo += `🔢 *Marca Equipamento:* ${data.numero_serie || 'Não informado'}\n`;
    resumo += `⚠️ *Problema:* ${data.problema || 'Não informado'}\n`;
    resumo += `📅 *Início do problema:* ${data.quando || 'Não informado'}\n`;
    resumo += `🏠 *Endereço:* ${data.endereco || 'Não informado'}\n`;
    resumo += `🕐 *Horário preferencial:* ${data.horario || 'Não informado'}\n\n`;
    resumo += '✅ *Em breve entraremos em contato para agendar a instalação.*';

    await sock.sendMessage(jid, { text: resumo });

    // Limpa a sessão e volta ao menu principal
    session.state = 'main_menu';
    session.data = {};
    session.step = 0;
    session.perguntas = [];
    session.manutencao_tipo = null;
    await sendMainMenu(sock, jid);
}

async function handleColetaResposta({ sock, jid, text, session }) {
    const perguntas = session.perguntas;
    const step = session.step;

    if (step >= perguntas.length) {
        await finalizarColetaManutencao(sock, jid, session);
        return;
    }

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

    if (session.step >= perguntas.length) {
        await finalizarColetaManutencao(sock, jid, session);
    } else {
        const proximaPergunta = perguntas[session.step];
        await sock.sendMessage(jid, { text: proximaPergunta.pergunta });
    }
}


async function sendImpressoesMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '🖨️ Impressões 3D',
        text: 'Selecione uma ação:',
        footer: 'Atendimento 24h',
        buttons: [
            { id: 'imp_catalogo', text: 'Ver catálogo' },
            { id: 'imp_orcamento', text: 'Solicitar orçamento' },
            { id: 'imp_consulta', text: 'Consultar pedido' },
            { id: 'imp_alterar', text: 'Alterar pedido' },
            { id: 'voltar_menu', text: '🔙 Voltar' },
        ],
    });
}

// -------------------- COLEÇÃO DE DADOS (INSTALAÇÃO DE CÂMERAS) --------------------

async function startCameraInstallation(sock, jid, session) {
    session.state = 'coleta_dados';
    session.data = { tipo: 'Instalação de Câmeras' };
    session.perguntas = [
        {
            pergunta: 'Qual é o seu nome completo?',
            campo: 'nome',
            validacao: (v) => v.trim().length > 2,
        },
        {
            pergunta: 'Quantas câmeras você deseja instalar?',
            campo: 'quantidade',
            validacao: (v) => !isNaN(v) && Number(v) > 0,
        },
        {
            pergunta: 'O local é interno ou externo? (responda "interno" ou "externo")',
            campo: 'local',
            validacao: (v) => ['interno', 'externo'].includes(v.toLowerCase()),
        },
        {
            pergunta: 'Tem acesso a Wi-Fi no local? (responda "sim" ou "não")',
            campo: 'wifi',
            validacao: (v) => ['sim', 'não', 'nao'].includes(v.toLowerCase()),
        },
        {
            pergunta: 'Qual é o seu endereço completo? (CEP - Cidade - Rua - nº)',
            campo: 'endereco',
            validacao: (v) => v.trim().length > 5, // mínimo razoável
        }
    ];
    session.step = 0;

    // Envia a primeira pergunta
    await sock.sendMessage(jid, { text: session.perguntas[0].pergunta });
}

// Processa cada resposta durante a coleta
async function handleColetaResposta({ sock, jid, text, session }) {
    const perguntas = session.perguntas;
    const step = session.step;

    if (step >= perguntas.length) {
        // Segurança: se já terminou, finaliza
        await finalizarColeta(sock, jid, session);
        return;
    }

    const perguntaAtual = perguntas[step];
    const campo = perguntaAtual.campo;
    const validacao = perguntaAtual.validacao;

    // Valida a resposta
    if (validacao && !validacao(text)) {
        await sock.sendMessage(jid, { text: '❌ Resposta inválida. Por favor, responda novamente.' });
        await sock.sendMessage(jid, { text: perguntaAtual.pergunta });
        return;
    }

    // Armazena a resposta
    session.data[campo] = text.trim();

    // Avança para a próxima pergunta
    session.step++;

    if (session.step >= perguntas.length) {
        await finalizarColeta(sock, jid, session);
    } else {
        const proximaPergunta = perguntas[session.step];
        await sock.sendMessage(jid, { text: proximaPergunta.pergunta });
    }
}

// Finaliza e exibe o resumo
async function finalizarColeta(sock, jid, session) {
    const data = session.data;
    let resumo = '📋 *ORDEM DE SERVIÇO - INSTALAÇÃO DE CÂMERAS*\n\n';
    resumo += `👤 *Cliente:* ${data.nome || 'Não informado'}\n`;
    resumo += `📦 *Quantidade:* ${data.quantidade || 'Não informado'}\n`;
    resumo += `📍 *Local:* ${data.local || 'Não informado'}\n`;
    resumo += `📶 *Wi-Fi disponível:* ${data.wifi || 'Não informado'}\n`;
    resumo += `🏠 *Endereço:* ${data.endereco || 'Não informado'}\n\n`;
    resumo += '✅ *Em breve entraremos em contato para agendar a instalação.*';

    await sock.sendMessage(jid, { text: resumo });

    // Limpa a sessão e volta ao menu principal
    session.state = 'main_menu';
    session.data = {};
    session.step = 0;
    session.perguntas = [];
    await sendMainMenu(sock, jid);
}

// -------------------- HANDLERS DE TEXTO E BOTÕES --------------------

async function handleTextCommand({ sock, jid, text }) {
    const session = getSession(jid);

    // Se está em coleta, redireciona
    if (session.state === 'coleta_dados') {
        await handleColetaResposta({ sock, jid, text, session });
        return;
    }

    // Primeira mensagem do usuário
    if (!session.greeted) {
        session.greeted = true;
        session.state = 'main_menu';
        await sendMainMenu(sock, jid);
        return;
    }

    // Comandos manuais
    const lower = text.toLowerCase();
    if (lower === 'ajuda' || lower === 'menu') {
        session.state = 'main_menu';
        await sendMainMenu(sock, jid);
    } else if (lower === 'cancelar') {
        await sock.sendMessage(jid, { text: 'Operação cancelada. Digite "menu" para recomeçar.' });
        session.state = 'main_menu';
        session.data = {};
        session.step = 0;
        session.perguntas = [];
    } else {
        await sock.sendMessage(jid, { text: 'Não entendi. Digite "ajuda" para ver as opções.' });
    }
}

async function handleButtonClick({ sock, jid, button }) {
    const session = getSession(jid);
    const { id, label } = button;
    console.log(`Botão clicado: ${id} (${label})`);

    switch (id) {
        // Menu principal
        case 'menu_suporte':
            session.state = 'suporte';
            await sendSuporteMenu(sock, jid);
            break;

        case 'menu_instalacao':
            session.state = 'instalacao';
            await sendInstalacaoMenu(sock, jid);
            break;

        case 'menu_impressoes':
            session.state = 'impressoes';
            await sendImpressoesMenu(sock, jid);
            break;

        case 'menu_cancelar':
            await sock.sendMessage(jid, { text: 'Atendimento encerrado. Digite "menu" quando quiser recomeçar.' });
            session.state = 'main_menu';
            break;

        // Sub‑menu Suporte
        case 'sup_atendente':
            await sock.sendMessage(jid, { text: '🔜 Em breve você será conectado a um atendente. (Ainda em desenvolvimento)' });
            break;
        case 'sup_faq':
            await sock.sendMessage(jid, { text: '📚 Perguntas frequentes:\n- Como funciona o suporte?\n- Quais são os horários?\n- ... (adicione suas FAQs)' });
            break;
        case 'sup_chamado':
            await sock.sendMessage(jid, { text: '📩 Abra um chamado enviando um e‑mail para suporte@empresa.com ou aguarde, em breve teremos formulário aqui.' });
            break;

        // Sub‑menu Instalação
        case 'ins_motor':
            await sock.sendMessage(jid, { text: 'motor' });
            break;
        case 'ins_manual':
            await sock.sendMessage(jid, { text: '📖 Manuais disponíveis em: https://exemplo.com/manuais' });
            break;
        case 'ins_tecnico':
            await sock.sendMessage(jid, { text: '🔧 Suporte técnico: entre em contato pelo telefone (11) 99999-9999 ou aguarde, em breve chat ao vivo.' });
            break;

        // Sub‑menu Impressões 3D
        case 'imp_catalogo':
            await sock.sendMessage(jid, { text: '🖼️ Catálogo de produtos: https://exemplo.com/catalogo' });
            break;
        case 'imp_orcamento':
            await sock.sendMessage(jid, { text: '💰 Para solicitar um orçamento, envie o arquivo 3D (STL/OBJ) e a quantidade desejada.' });
            break;
        case 'imp_consulta':
            await sock.sendMessage(jid, { text: '🔍 Para consultar seu pedido, informe o número do pedido (ex: #12345).' });
            break;
        case 'imp_alterar':
            await sock.sendMessage(jid, { text: '✏️ Para alterar um pedido, informe o número do pedido e a nova especificação.' });
            break;

        // Voltar ao menu principal
        case 'voltar_menu':
            session.state = 'main_menu';
            await sendMainMenu(sock, jid);
            break;

        default:
            await sock.sendMessage(jid, { text: 'Opção não reconhecida. Digite "menu" para recomeçar.' });
            session.state = 'main_menu';
            break;
    }
}

// -------------------- SETUP DO SOCKET (um único número) --------------------

async function createSocket() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');

    const sock = makeWASocket({
        auth: state,
        emitOwnEvents: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('Scan this QR with WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect =
                (lastDisconnect?.error)?.output?.statusCode !==
                DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log('Connection closed, reconnecting…');
                startBot();
            } else {
                console.log('Connection closed. You are logged out.');
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp connected');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const m = messages[0];
        if (!m || !m.message) return;

        const jid = m.key.remoteJid;
        if (m.key.fromMe || jid === 'status@broadcast') return;

        const msg = unwrapMessage(m.message);

        // Texto
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

        // Template button click
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
    // Não precisa registrar handlers separadamente, já estão no socket
}

startBot().catch(console.error);