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

module.exports = { unwrapMessage };