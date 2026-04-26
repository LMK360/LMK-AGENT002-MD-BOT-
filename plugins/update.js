const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { isOwner } = require('../lib/utils');

const REPO_OWNER = 'LMK360';
const REPO_NAME = 'LMK-AGENT002-MD-BOT-';
const BRANCH = 'main';
const PLUGINS_PATH = 'plugins';
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${PLUGINS_PATH}?ref=${BRANCH}`;

module.exports = {
    command: 'update',
    aliases: ['upgrade', 'sync', 'fetch'],
    category: 'owner',
    description: 'Fetch latest plugins from GitHub',
    
    async execute(sock, msg, args, config) {
        if (!isOwner(msg.senderNum)) {
            return await sock.sendMessage(msg.from, {
                text: '❌ *Owner only command*'
            }, { quoted: msg.m });
        }
        
        await sock.sendMessage(msg.from, {
            text: '🔄 *Checking for updates...*'
        }, { quoted: msg.m });
        
        try {
            const response = await axios.get(API_URL, {
                headers: {
                    'User-Agent': 'LMK-MD-Bot',
                    'Accept': 'application/vnd.github.v3+json'
                },
                timeout: 30000
            });
            
            const remoteFiles = response.data.filter(file => file.name.endsWith('.js'));
            const pluginsDir = path.join(__dirname, '..', 'plugins');
            await fs.ensureDir(pluginsDir);
            
            let updated = 0;
            let added = 0;
            let skipped = 0;
            const changes = [];
            
            for (const file of remoteFiles) {
                const localPath = path.join(pluginsDir, file.name);
                const remoteContent = await axios.get(file.download_url, { timeout: 30000 });
                const newContent = remoteContent.data;
                
                if (await fs.pathExists(localPath)) {
                    const localContent = await fs.readFile(localPath, 'utf8');
                    if (localContent !== newContent) {
                        await fs.writeFile(localPath, newContent);
                        updated++;
                        changes.push('🔄 ' + file.name);
                        delete require.cache[require.resolve(localPath)];
                    } else {
                        skipped++;
                    }
                } else {
                    await fs.writeFile(localPath, newContent);
                    added++;
                    changes.push('✨ ' + file.name);
                }
            }
            
            // Reload all plugins
            const reloaded = await global.reloadPlugins();
            
            let result = `╔═══════◇\n`;
            result += `║ 📦 *UPDATE COMPLETE*\n`;
            result += `╠═══════◇\n`;
            result += `║ ✅ Updated: ${updated}\n`;
            result += `║ ✨ New: ${added}\n`;
            result += `║ ⏭️ Unchanged: ${skipped}\n`;
            result += `║ 📊 Total: ${reloaded.length} commands loaded\n`;
            result += `╚═══════◇\n`;
            
            if (changes.length > 0) {
                result += `\n*Changes:*\n`;
                result += changes.slice(0, 15).join('\n');
                if (changes.length > 15) {
                    result += `\n... and ${changes.length - 15} more`;
                }
            }
            
            await sock.sendMessage(msg.from, { text: result }, { quoted: msg.m });
            
        } catch (err) {
            console.error('Update error:', err.message);
            await sock.sendMessage(msg.from, {
                text: `❌ *Update failed*\n\n${err.message}\n\nMake sure repo is public and has 'plugins' folder.`
            }, { quoted: msg.m });
        }
    }
};
