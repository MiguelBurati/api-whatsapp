function unwrapMessage(msg) {
    let current = msg;
    while (
        current?.ephemeralMessage?.message ||
        current?.viewOnceMessage?.message ||
        current?.viewOnceMessageV2?.message
    ) {
        current =
            current.ephemeralMessage?.message ||
            current.viewOnceMessage?.message ||
            current.viewOnceMessageV2?.message;
    }
    return current || msg;
}

function getMessageText(message) {
    if (!message) return '';

    const text =
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        message.videoMessage?.caption ||
        message.documentMessage?.caption ||
        message.audioMessage?.caption ||
        message.stickerMessage?.caption ||
        message.pttMessage?.caption ||
        '';

    return String(text || '').trim();
}

function hasMediaTrigger(message) {
    if (!message) return false;

    const mediaTypes = [
        'imageMessage',
        'videoMessage',
        'audioMessage',
        'documentMessage',
        'stickerMessage',
        'pttMessage',
        'voiceMessage'
    ];

    return mediaTypes.some((type) => Boolean(message[type]));
}

module.exports = { unwrapMessage, getMessageText, hasMediaTrigger };