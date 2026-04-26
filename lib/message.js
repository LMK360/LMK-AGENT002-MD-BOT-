function parseMessage(m) {
  if (!m.message || m.key.fromMe) return null;
  
  const from = m.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const sender = m.key.participant || from;
  const senderNum = sender.split('@')[0];
  
  let text = '';
  let type = 'text';
  
  if (m.message.conversation) {
    text = m.message.conversation;
  } else if (m.message.extendedTextMessage?.text) {
    text = m.message.extendedTextMessage.text;
  } else if (m.message.imageMessage?.caption) {
    text = m.message.imageMessage.caption;
    type = 'image';
  } else if (m.message.videoMessage?.caption) {
    text = m.message.videoMessage.caption;
    type = 'video';
  } else if (m.message.documentMessage) {
    type = 'document';
  } else if (m.message.audioMessage) {
    type = 'audio';
  } else if (m.message.stickerMessage) {
    type = 'sticker';
  }
  
  return {
    from,
    sender,
    senderNum,
    isGroup,
    text,
    type,
    m, // raw message object
    quoted: m.message.extendedTextMessage?.contextInfo?.quotedMessage
  };
}

module.exports = { parseMessage };
