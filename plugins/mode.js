const { isOwner } = require('../lib/utils');

module.exports = {
    command: 'mode',
    aliases: ['public', 'private'],
    category: 'owner',
    description: 'Toggle public/private mode',
    
    async execute(sock, msg, args, config) {
        if (!isOwner(msg.senderNum)) {
            return await sock.sendMessage(msg.from, {
                text: '❌ *Owner only command*'
            }, { quoted: msg.m });
        }
        
        const newMode = args[0] === 'public' ? true : 
                       args[0] === 'private' ? false : 
                       !config.PUBLIC_MODE;
        
        config.PUBLIC_MODE = newMode;
        
        await sock.sendMessage(msg.from, {
            text: `🔒 *Mode changed to: ${newMode ? 'PUBLIC' : 'PRIVATE'}*\n\n` +
                  `${newMode ? '✅ Anyone can use commands' : '🔒 Only owner can use commands'}`
        }, { quoted: msg.m });
    }
};
