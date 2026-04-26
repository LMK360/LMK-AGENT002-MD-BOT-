module.exports = {
    command: 'owner',
    aliases: ['creator', 'dev', 'contact'],
    category: 'main',
    description: 'Show owner info',
    
    async execute(sock, msg, args, cfg) {
        const text = `*👤 OWNER INFO*\n\n` +
            `*Name:* ${cfg.OWNER_NAME}\n` +
            `*Number:* ${cfg.OWNER_NUMBER}\n` +
            `*Bot:* ${cfg.BOT_NAME}\n\n` +
            `*GitHub:* github.com/LMK360\n` +
            `*Channel:* https://whatsapp.com/channel/0029Vb7LwaM7dmeTaTNO6Y2u\n\n` +
            `© 2026 ${cfg.OWNER_NAME}`;
        
        await sock.sendMessage(msg.from, { text }, { quoted: msg.m });
    }
};
