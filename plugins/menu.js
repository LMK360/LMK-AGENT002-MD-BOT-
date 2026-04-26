const config = require('../config');

module.exports = {
    command: 'menu',
    aliases: ['help', 'commands', 'list'],
    category: 'main',
    description: 'Show all commands',
    
    async execute(sock, msg, args, cfg) {
        const prefix = cfg.PREFIX;
        const plugins = global.LMK_PLUGINS;
        
        // Group by category
        const categories = {};
        const seen = new Set();
        
        for (const [name, plugin] of plugins) {
            if (seen.has(plugin.command)) continue;
            seen.add(plugin.command);
            
            const cat = plugin.category || 'other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(`${prefix}${plugin.command}`);
        }
        
        let menu = `╔═══════◇\n`;
        menu += `║ 🤖 *${cfg.BOT_NAME} MENU*\n`;
        menu += `╠═══════◇\n`;
        menu += `║ 👤 Owner: ${cfg.OWNER_NAME}\n`;
        menu += `║ 🌐 Mode: ${cfg.PUBLIC_MODE ? 'Public' : 'Private'}\n`;
        menu += `║ 📊 Plugins: ${seen.size}\n`;
        menu += `╠═══════◇\n\n`;
        
        for (const [cat, cmds] of Object.entries(categories)) {
            menu += `*${cat.toUpperCase()}*\n`;
            menu += cmds.join(' | ') + '\n\n';
        }
        
        menu += `╚═══════◇\n${cfg.MENU_FOOTER}`;
        
        await sock.sendMessage(msg.from, { text: menu }, { quoted: msg.m });
    }
};
