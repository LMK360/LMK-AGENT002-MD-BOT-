function parseMessage(m) {
  if (!m.message || m.key.fromMe) return null;
  
  const from = m.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const sender = m.key.participant || from;
  const senderNum = sender.split('@')[0];
  
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
  } else if (msg.templateButtonReplyMessage && msg.templateButtonReplyMessage.selectedId) {
    text = msg.templateButtonReplyMessage.selectedId;
    type = 'template';
  }
  
  if (!text) return null;
  
  // Old-style quoted message check (no ?.)
  let quoted = null;
  if (msg.extendedTextMessage && msg.extendedTextMessage.contextInfo) {
    quoted = msg.extendedTextMessage.contextInfo.quotedMessage || null;
  }
  
  return {
    from: from,
    sender: sender,
    senderNum: senderNum,
    isGroup: isGroup,
    text: text,
    type: type,
    m: m,
    quoted: quoted
  };
}

module.exports = { parseMessage };
