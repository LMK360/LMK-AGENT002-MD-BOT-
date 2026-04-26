const config = require('../config');

function isOwner(number) {
    const cleanNum = String(number).replace(/[^0-9]/g, '');
    const ownerNum = String(config.OWNER_NUMBER).replace(/[^0-9]/g, '');
    return cleanNum === ownerNum;
}

function isAdmin(sock, groupJid, userJid) {
    return new Promise(async (resolve) => {
        try {
            const groupMeta = await sock.groupMetadata(groupJid);
            const participant = groupMeta.participants.find(p => p.id === userJid);
            resolve(participant && (participant.admin === 'admin' || participant.admin === 'superadmin'));
        } catch {
            resolve(false);
        }
    });
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
}

function react(sock, from, m, emoji) {
    return sock.sendMessage(from, {
        react: { text: emoji, key: m.key }
    });
}

module.exports = { isOwner, isAdmin, formatUptime, react };
