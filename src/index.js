const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const P = require('pino');
const fs = require('fs').promises;
const { unwrapMessage } = require('./shared/utils');
const { getSession } = require('./shared/session');
const { sendMainMenu } = require('./shared/menu');
const { handleColetaResposta: handleGenericColetaResposta } = require('./shared/coletaHandler');
const manutencaoHandlers = require('./manutencao/handlers');
const { sendOrcamentoMenu } = require('./orcamento/menu');
const { startOrcamentoColeta, finalizarColetaOrcamento } = require('./orcamento/coleta');
const { sendManutencaoMenu } = require('./manutencao/menu');
const { startManutencaoColeta, finalizarColetaManutencao } = require('./manutencao/coleta');
const { sendAdministracaoMenu } = require('./administracao/menu');
const { sendImpressoesMenu } = require('./impressoes3d/menu');
const { sendOutrosMenu } = require('./outros/menu');

const ORCAMENTO_TYPES = {
    orc_motor: 'Motor', orc_camera: 'Câmera', orc_alarme: 'Alarme',
    orc_interfonia: 'Interfonia', orc_cerca_eletrica: 'Cerca Elétrica', orc_paineis_solares: 'Painéis Solares'
};
const MANUTENCAO_TYPES = {
    manut_motor: ['Motor', '🔧 *Manutenção de Motor*'], manut_camera: ['Câmeras', '📷 *Manutenção de Câmeras*'],
    manut_alarme: ['Alarme', '🚨 *Manutenção de Alarme*'], manut_interfonia: ['Interfonia', '📞 *Manutenção de Interfonia*'],
    manut_cerca: ['Cerca Elétrica', '⚡ *Manutenção de Cerca Elétrica*'], manut_solar: ['Painéis Solares', '☀️ *Manutenção de Painéis Solares*']
};

async function handleTextCommand({ sock, jid, text }) {
    const session = getSession(jid);
    if (session.state === 'coleta_dados') {
        const finalizarColeta = session.fluxo_atual === 'orcamento' ? finalizarColetaOrcamento : finalizarColetaManutencao;
        const handler = session.fluxo_atual === 'orcamento' ? handleGenericColetaResposta : manutencaoHandlers.handleColetaResposta;
        await handler({ sock, jid, text, session, finalizarColeta });
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
        session.fluxo_atual = null;
        session.data = {};
        session.step = 0;
        session.perguntas = [];
    } else {
        await sock.sendMessage(jid, { text: '❓ Não entendi. Digite "ajuda" para ver as opções ou "menu" para voltar.' });
    }
}

async function handleButtonClick({ sock, jid, button }) {
    const session = getSession(jid);
    const { id, label } = button;
    console.log(`Botão clicado: ${id} (${label})`);
    if (session.fluxo_atual === 'manutencao' && await manutencaoHandlers.handleButtonClick({ sock, jid, button, session })) return;
    if (session.fluxo_atual === 'orcamento' && session.state === 'coleta_dados' && session.aguardando_botao_horario) {
        await handleGenericColetaResposta({
            sock,
            jid,
            text: id || label,
            session,
            finalizarColeta: finalizarColetaOrcamento
        });
        return;
    }
    if (ORCAMENTO_TYPES[id]) {
        await sock.sendMessage(jid, { text: `💰 *Orçamento de ${ORCAMENTO_TYPES[id]}*\nVamos iniciar a coleta de dados.` });
        await startOrcamentoColeta(sock, jid, session, ORCAMENTO_TYPES[id]);
        return;
    }
    if (MANUTENCAO_TYPES[id]) {
        const [tipo, mensagem] = MANUTENCAO_TYPES[id];
        await sock.sendMessage(jid, { text: `${mensagem}\nVamos iniciar o processo de agendamento.` });
        await startManutencaoColeta(sock, jid, session, tipo);
        return;
    }
    switch (id) {
        case 'menu_orcamento': await sendOrcamentoMenu(sock, jid); break;
        case 'menu_manutencao': await sendManutencaoMenu(sock, jid); break;
        case 'menu_administracao': await sendAdministracaoMenu(sock, jid); break;
        case 'menu_impressoes3d': await sendImpressoesMenu(sock, jid); break;
        case 'menu_outros': await sendOutrosMenu(sock, jid); break;
        case 'menu_principal':
            session.state = 'main_menu';
            session.fluxo_atual = null;
            session.data = {};
            session.step = 0;
            session.perguntas = [];
            session.aguardando_botao_horario = false;
            await sendMainMenu(sock, jid);
            break;
        case 'menu_sair':
            session.state = 'main_menu';
            session.fluxo_atual = null;
            session.data = {};
            session.step = 0;
            session.perguntas = [];
            session.aguardando_botao_horario = false;
            await sock.sendMessage(jid, { text: '✅ Atendimento encerrado. Digite "menu" para iniciar outro atendimento.' });
            break;
        case 'voltar_menu': session.state = 'main_menu'; session.fluxo_atual = null; await sendMainMenu(sock, jid); break;
        default:
            await sock.sendMessage(jid, { text: '❓ Opção não reconhecida. Digite "menu" para recomeçar.' });
            session.state = 'main_menu';
            await sendMainMenu(sock, jid);
    }
}

async function createSocket() {
    const authFolder = 'auth';
    let state;
    let saveCreds;
    try {
        ({ state, saveCreds } = await useMultiFileAuthState(authFolder));
    } catch (err) {
        console.error('❌ Erro ao carregar credenciais:', err.message);
        await fs.rm(authFolder, { recursive: true, force: true });
        return createSocket();
    }
    const sock = makeWASocket({
        auth: state,
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: true,
        emitOwnEvents: false,
        logger: P({ level: 'silent' }),
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr) { console.log('📱 Escaneie este QR Code:'); qrcode.generate(qr, { small: true }); }
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                await fs.rm(authFolder, { recursive: true, force: true });
                console.log('❌ Logout. Reinicie o bot.');
                process.exit(0);
            }
            console.log('🔄 Reconectando em 5s...');
            setTimeout(() => startBot(), 5000);
        } else if (connection === 'open') console.log('✅ WhatsApp conectado!');
    });
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const message = messages[0];
        if (!message?.message || message.key.fromMe || message.key.remoteJid === 'status@broadcast') return;
        const jid = message.key.remoteJid;
        const msg = unwrapMessage(message.message);
        const text = (msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || '').trim();
        if (text) await handleTextCommand({ sock, jid, text });
        const template = msg.templateButtonReplyMessage;
        if (template) {
            await handleButtonClick({ sock, jid, button: { id: template.selectedId, label: template.selectedDisplayText, raw: template } });
            return;
        }
        const legacyButton = msg.buttonsResponseMessage;
        if (legacyButton) {
            await handleButtonClick({ sock, jid, button: { id: legacyButton.selectedButtonId, label: legacyButton.selectedDisplayText, raw: legacyButton } });
            return;
        }
        const nativeFlow = msg.interactiveResponseMessage?.nativeFlowResponseMessage;
        if (nativeFlow?.paramsJson) {
            try {
                const params = JSON.parse(nativeFlow.paramsJson);
                const id = params.id || params.button_id || params.buttonId;
                if (id) await handleButtonClick({ sock, jid, button: { id, label: params.display_text, raw: nativeFlow } });
            } catch (err) {
                console.error('❌ Resposta de botão inválida:', err.message);
            }
        }
    });
    return sock;
}

async function startBot() {
    try { await createSocket(); console.log('🤖 Bot iniciado!'); }
    catch (err) { console.error('❌ Erro fatal:', err); await fs.rm('auth', { recursive: true, force: true }); startBot(); }
}

module.exports = { createSocket, handleTextCommand, handleButtonClick, startBot };