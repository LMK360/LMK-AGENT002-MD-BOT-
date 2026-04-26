function parseMessage(m) {
  if (!m.message || m.key.fromMe) return null;
  
  const from = m.key.remoteJid;
  const isGroup = from.endsWith('@g.us');
  const sender = m.key.participant || from;
  const senderNum = sender.split('@')[0];
  
  // Extract text from ALL possible message types
  let text = '';
  let type = 'unknown';
  
  const msg = m.message;
  
  if (msg.conversation) {
    text = msg.conversation;
    type = 'text';
  } else if (msg.extendedTextMessage?.text) {
    text = msg.extendedTextMessage.text;
    type = 'extended';
  } else if (msg.imageMessage?.caption) {
    text = msg.imageMessage.caption;
    type = 'image';
  } else if (msg.videoMessage?.caption) {
    text = msg.videoMessage.caption;
    type = 'video';
  } else if (msg.documentMessage?.caption) {
    text = msg.documentMessage.caption;
    type = 'document';
  } else if (msg.buttonsResponseMessage?.selectedButtonId) {
    text = msg.buttonsResponseMessage.selectedButtonId;
    type = 'button';
  } else if (msg.listResponseMessage?.title) {
    text = msg.listResponseMessage.title;
    type = 'list';
  } else if (msg.templateButtonReplyMessage?.selectedId) {
    text = msg.templateButtonReplyMessage.selectedId;
    type = 'template';
  }
  
  // If no text found, return null (not a command)
  if (!text) return null;
  
  return {
    from,
    sender,
    senderNum,
    isGroup,
    text,
    type,
    m,
    quoted: msg.extendedTextMessage?.contextInfo?.quotedMessage || null
  };
}

module.exports = { parseMessage };
    m, // raw message object
    quoted: m.message.extendedTextMessage?.contextInfo?.quotedMessage
  };
}

module.exports = { parseMessage };
