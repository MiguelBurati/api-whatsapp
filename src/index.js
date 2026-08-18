// src/index.js
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const P = require('pino');
const fs = require('fs').promises;

const { unwrapMessage } = require('./utils');
const { handleTextCommand, handleButtonClick } = require('./handlers');

async function createSocket() {
    const authFolder = 'auth';

    let state, saveCreds;
    try {
        const auth = await useMultiFileAuthState(authFolder);
        state = auth.state;
        saveCreds = auth.saveCreds;
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
        markOnlineOnConnect: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('📱 Escaneie este QR Code:');
            qrcode.generate(qr, { small: true });
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            console.log('Ou acesse:', qrUrl);
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ Logout. Deletando credenciais...');
                await fs.rm(authFolder, { recursive: true, force: true });
                console.log('🔄 Reinicie o bot.');
                process.exit(0);
            } else {
                console.log('🔄 Reconectando em 5s...');
                setTimeout(() => startBot(), 5000);
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp conectado!');
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

async function startBot() {
    try {
        const sock = await createSocket();
        console.log('🤖 Bot iniciado!');
    } catch (err) {
        console.error('❌ Erro fatal:', err);
        await fs.rm('auth', { recursive: true, force: true });
        startBot();
    }
}

module.exports = { startBot };