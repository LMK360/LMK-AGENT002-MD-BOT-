const config = require('../config');

function isOwner(number) {
  return number === config.OWNER_NUMBER;
}

function isAdmin(sock, groupJid, userJid) {
  // Check if user is group admin
  return new Promise(async (resolve) => {
    try {
      const groupMeta = await sock.groupMetadata(groupJid);
      const participant = groupMeta.participants.find(p => p.id === userJid);
      resolve(participant?.admin === 'admin' || participant?.admin === 'superadmin');
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
