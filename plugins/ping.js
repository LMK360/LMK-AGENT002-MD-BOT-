module.exports = {
    command: 'ping',
    aliases: ['speed', 'p'],
    category: 'main',
    description: 'Check bot response speed',
    
    async execute(sock, msg, args, config) {
        const start = Date.now();
        const reply = await sock.sendMessage(msg.from, { text: '🏓 *Pong!*' }, { quoted: msg.m });
        const end = Date.now();
        
        const latency = end - start;
        
        await sock.sendMessage(msg.from, {
            text: `🏓 *Pong!*\n\n` +
                `⚡ Response: ${latency}ms\n` +
                `📡 Bot is active`
        }, { quoted: msg.m });
    }
};
