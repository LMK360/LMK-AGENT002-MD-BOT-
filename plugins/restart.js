const { isOwner } = require('../lib/utils');

module.exports = {
    command: 'restart',
    aliases: ['reboot', 'reload'],
    category: 'owner',
    description: 'Restart the bot',
    
    async execute(sock, msg, args, config) {
        if (!isOwner(msg.senderNum)) {
            return await sock.sendMessage(msg.from, {
                text: '❌ *Owner only command*'
            }, { quoted: msg.m });
        }
        
        await sock.sendMessage(msg.from, {
            text: '🔄 *Restarting bot...*\n\nWill be back in 5 seconds.'
        }, { quoted: msg.m });
        
        setTimeout(() => {
            console.log('🔄 Restart requested by owner');
            process.exit(0);
        }, 3000);
    }
};
