const os = require('os');
const { formatUptime } = require('../lib/utils');

module.exports = {
    command: 'alive',
    aliases: ['status', 'up', 'online'],
    category: 'main',
    description: 'Check bot status',
    
    async execute(sock, msg, args, cfg) {
        const uptime = formatUptime(process.uptime());
        const ram = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        
        const text = `*🤖 ${cfg.BOT_NAME} STATUS*\n\n` +
            `✅ *Online*\n` +
            `⏱️ *Uptime:* ${uptime}\n` +
            `💾 *RAM:* ${ram} MB\n` +
            `📱 *Platform:* ${os.platform()}\n` +
            `🔋 *Node:* ${process.version}\n\n` +
            `_Powered by ${cfg.OWNER_NAME}_`;
        
        await sock.sendMessage(msg.from, { text }, { quoted: msg.m });
    }
};
