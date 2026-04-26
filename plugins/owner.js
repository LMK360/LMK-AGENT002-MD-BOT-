module.exports = {
  command: 'owner',
  aliases: ['creator', 'dev'],
  category: 'main',
  description: 'Show owner info',
  
  async execute(sock, msg, args, cfg) {
    const text = `
*👤 OWNER INFO*

*Name:* ${cfg.OWNER_NAME}
*Number:* ${cfg.OWNER_NUMBER}
*Bot:* ${cfg.BOT_NAME}

*GitHub:* github.com/LMK360
*Channel:* https://whatsapp.com/channel/0029Vb7LwaM7dmeTaTNO6Y2u

© 2026 REDDRAGON`;
    
    await sock.sendMessage(msg.from, { text }, { quoted: msg.m });
  }
};
