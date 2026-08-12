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

// -------------------- ESTADO DA CONVERSA (em memória) --------------------
// Armazena o estado atual de cada usuário (para controle de fluxo)
// Exemplo: { '5511999999999@s.whatsapp.net': 'main_menu' | 'suporte' | 'instalacao' | 'impressoes' }
const userState = new Map();

// Armazena os JIDs que já receberam a saudação
const greetedUsers = new Set();

// -------------------- CORE BOT SETUP --------------------

async function createSocket() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');

    const sock = makeWASocket({
        auth: state,
        emitOwnEvents: false,
    });

    sock.ev.on('creds.update', saveCreds);

    return sock;
}

function registerConnectionHandlers(sock) {
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
}

function registerMessageHandlers(sock, handlers) {
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const m = messages[0];
        if (!m || !m.message) return;

        const jid = m.key.remoteJid;
        if (m.key.fromMe || jid === 'status@broadcast') return;

        const msg = unwrapMessage(m.message);

        // ---- TEXT MESSAGE ----
        const rawText =
            msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption ||
            msg.videoMessage?.caption ||
            '';
        const text = rawText.trim();

        if (text && handlers.onText) {
            await handlers.onText({ sock, jid, text, msg, full: m });
        }

        // ---- TEMPLATE BUTTON CLICK ----
        const tpl = msg.templateButtonReplyMessage;
        if (tpl && handlers.onTemplateButton) {
            const button = {
                id: tpl.selectedId,
                label: tpl.selectedDisplayText,
                raw: tpl,
            };
            await handlers.onTemplateButton({ sock, jid, button, msg, full: m });
        }
    });
}

// -------------------- FUNÇÕES DE ENVIO DE MENUS --------------------

// Menu principal (saudação)
async function sendMainMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '👋 Olá! Seja bem‑vindo(a)!',
        text: 'Como posso ajudar você hoje? Escolha uma opção:',
        footer: 'Atendimento 24h',
        buttons: [
            { id: 'menu_suporte', text: '🛠️ Suporte' },
            { id: 'menu_instalacao', text: '🔧 Instalação' },
            { id: 'menu_impressoes', text: '🖨️ Impressões 3D' },
            { id: 'menu_cancelar', text: '❌ Cancelar' },
        ],
    });
}

// Sub‑menu: Suporte
async function sendSuporteMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '🛠️ Suporte',
        text: 'Escolha uma das opções abaixo:',
        footer: 'Atendimento 24h',
        buttons: [
            { id: 'sup_atendente', text: 'Falar com atendente' },
            { id: 'sup_faq', text: 'Perguntas frequentes' },
            { id: 'sup_chamado', text: 'Abrir chamado' },
            { id: 'voltar_menu', text: '🔙 Voltar' },
        ],
    });
}

// Sub‑menu: Instalação
async function sendInstalacaoMenu(sock, jid) {
    await sendButtons(sock, jid, {
        title: '🔧 Instalação',
        text: 'O que você precisa?',
        footer: 'Atendimento 24h',
        buttons: [
            { id: 'ins_visita', text: 'Agendar visita' },
            { id: 'ins_manual', text: 'Manuais e tutoriais' },
            { id: 'ins_tecnico', text: 'Suporte técnico' },
            { id: 'voltar_menu', text: '🔙 Voltar' },
        ],
    });
}

// Sub‑menu: Impressões 3D
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

// -------------------- HANDLERS DE TEXTO E BOTÕES --------------------

async function handleTextCommand({ sock, jid, text }) {
    // Se o usuário ainda não foi saudado, envia o menu principal
    if (!greetedUsers.has(jid)) {
        greetedUsers.add(jid);
        // Define o estado inicial
        userState.set(jid, 'main_menu');
        await sendMainMenu(sock, jid);
        return;
    }

    // Se já foi saudado, podemos tratar comandos de texto (opcional)
    // Exemplo: se o usuário digitar "ajuda", reenviar o menu principal
    const lower = text.toLowerCase();
    if (lower === 'ajuda' || lower === 'menu') {
        await sendMainMenu(sock, jid);
        userState.set(jid, 'main_menu');
    } else if (lower === 'cancelar') {
        await sock.sendMessage(jid, { text: 'Operação cancelada. Digite "menu" para recomeçar.' });
        userState.set(jid, 'main_menu');
    } else {
        // Resposta padrão para mensagens não reconhecidas
        await sock.sendMessage(jid, { text: 'Não entendi. Digite "ajuda" para ver as opções.' });
    }
}

async function handleButtonClick({ sock, jid, button }) {
    const { id, label } = button;
    console.log(`Botão clicado: ${id} (${label})`);

    // Mapeamento de ações
    switch (id) {
        // Menu principal
        case 'menu_suporte':
            userState.set(jid, 'suporte');
            await sendSuporteMenu(sock, jid);
            break;

        case 'menu_instalacao':
            userState.set(jid, 'instalacao');
            await sendInstalacaoMenu(sock, jid);
            break;

        case 'menu_impressoes':
            userState.set(jid, 'impressoes');
            await sendImpressoesMenu(sock, jid);
            break;

        case 'menu_cancelar':
            await sock.sendMessage(jid, { text: 'Atendimento encerrado. Digite "menu" quando quiser recomeçar.' });
            userState.set(jid, 'main_menu');
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
        case 'ins_visita':
            await sock.sendMessage(jid, { text: '📅 Para agendar uma visita, por favor informe seu endereço e melhor horário. (Em breve integração com calendário)' });
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
            userState.set(jid, 'main_menu');
            await sendMainMenu(sock, jid);
            break;

        default:
            // Caso algum ID não mapeado (ex: botões antigos)
            await sock.sendMessage(jid, { text: 'Opção não reconhecida. Digite "menu" para recomeçar.' });
            userState.set(jid, 'main_menu');
            break;
    }
}

// -------------------- ENTRY POINT --------------------

async function startBot() {
    const sock = await createSocket();
    registerConnectionHandlers(sock);

    registerMessageHandlers(sock, {
        onText: handleTextCommand,
        onTemplateButton: handleButtonClick,
    });
}

startBot().catch(console.error);