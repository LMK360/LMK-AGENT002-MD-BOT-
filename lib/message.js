function parseMessage(m) {
    if (!m.message) return null;

    const from = m.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const fromMe = m.key.fromMe || false;

    // Fix: for fromMe messages in DMs, sender is the bot's own JID (which = owner)
    // For groups, participant is always set
    // For DMs from others, use remoteJid
    let sender;
    if (isGroup) {
        sender = m.key.participant || from;
    } else if (fromMe) {
        // Message sent by the bot owner (you) — use remoteJid won't work
        // We get the actual number from the sock user later, but here
        // we use a special marker so index.js can fill it from sock.user.id
        sender = 'OWNER_SELF';
    } else {
        sender = from;
    }

    const senderNum = sender === 'OWNER_SELF' ? 'OWNER_SELF' : sender.split('@')[0];

    let text = '';
    let type = 'unknown';

    const msg = m.message;

    if (msg.conversation) {
        text = msg.conversation;
        type = 'text';
    } else if (msg.extendedTextMessage && msg.extendedTextMessage.text) {
        text = msg.extendedTextMessage.text;
        type = 'extended';
    } else if (msg.imageMessage && msg.imageMessage.caption) {
        text = msg.imageMessage.caption;
        type = 'image';
    } else if (msg.videoMessage && msg.videoMessage.caption) {
        text = msg.videoMessage.caption;
        type = 'video';
    } else if (msg.documentMessage && msg.documentMessage.caption) {
        text = msg.documentMessage.caption;
        type = 'document';
    } else if (msg.buttonsResponseMessage && msg.buttonsResponseMessage.selectedButtonId) {
        text = msg.buttonsResponseMessage.selectedButtonId;
        type = 'button';
    } else if (msg.listResponseMessage && msg.listResponseMessage.title) {
        text = msg.listResponseMessage.title;
        type = 'list';
    }

    if (!text) return null;

    let quoted = null;
    if (msg.extendedTextMessage && msg.extendedTextMessage.contextInfo) {
        quoted = msg.extendedTextMessage.contextInfo.quotedMessage || null;
    }

    return {
        from: from,
        sender: sender,
        senderNum: senderNum,
        isGroup: isGroup,
        fromMe: fromMe,
        text: text,
        type: type,
        m: m,
        quoted: quoted
    };
}

module.exports = { parseMessage };
