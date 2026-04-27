const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');
const { downloadSession } = require('./lib/auth');
const { createSocket, DisconnectReason } = require('./lib/connection');
const { parseMessage } = require('./lib/message');
const { isOwner } = require('./lib/utils');

const app = express();
const PORT = process.env.PORT || 9090;

// Global plugin storage for hot reload
global.LMK_PLUGINS = new Map();
const pluginsDir = path.join(__dirname, 'plugins');

async function loadPlugins() {
await fs.ensureDir(pluginsDir);
const files = await fs.readdir(pluginsDir);

console.log('📁 Plugin files found:', files);

global.LMK_PLUGINS.clear();

for (const file of files.filter(f => f.endsWith('.js'))) {
console.log('🔌 Loading:', file);
try {
const filePath = path.join(pluginsDir, file);
delete require.cache[require.resolve(filePath)];
const plugin = require(filePath);

console.log('📦 Plugin loaded:', {  
    command: plugin.command,  
    category: plugin.category,  
    hasExecute: typeof plugin.execute === 'function'  
  });  

  if (plugin.command) {  
    global.LMK_PLUGINS.set(plugin.command, plugin);  
    if (plugin.aliases) {  
      plugin.aliases.forEach(alias => global.LMK_PLUGINS.set(alias, plugin));  
    }  
  } else {  
    console.log('⚠️ No command property in:', file);  
  }  
} catch (err) {  
  console.error(`❌ Failed to load ${file}:`, err.message);  
  console.error(err.stack);  
}

}

const uniquePlugins = new Set([...global.LMK_PLUGINS.values()]);
console.log(✅ Loaded ${uniquePlugins.size} plugins (${global.LMK_PLUGINS.size} commands + aliases));
console.log('📚 All commands:', [...global.LMK_PLUGINS.keys()]);
}

// Hot reload function
global.reloadPlugins = async function() {
console.log('🔄 Reloading plugins...');
await loadPlugins();
return [...global.LMK_PLUGINS.keys()];
};

// Start bot
async function startBot() {
try {
if (!config.SESSION_ID) {
console.log('❌ SESSION_ID not set');
process.exit(1);
}

await downloadSession(config.SESSION_ID);  
const sock = await createSocket('./sessions');  

sock.ev.on('connection.update', async (update) => {  
  const { connection, lastDisconnect } = update;  

  if (connection === 'open') {  
    console.log('✅ Bot connected:', sock.user && sock.user.id);  
    await sock.sendMessage(config.OWNER_NUMBER + '@s.whatsapp.net', {  
      text: config.ALIVE_MSG  
    });  
  }  

  if (connection === 'close') {  
    const reason = lastDisconnect && lastDisconnect.error && lastDisconnect.error.output && lastDisconnect.error.output.statusCode;  
    if (reason !== DisconnectReason.loggedOut) {  
      console.log('🔄 Reconnecting...');  
      setTimeout(startBot, 5000);  
    }  
  }  
});  

// Message handler with FULL DEBUG  
sock.ev.on('messages.upsert', async ({ messages, type }) => {  
  console.log('📨 messages.upsert fired! Type:', type, 'Count:', messages.length);  

  // ✅ FIXED: Accept both 'notify' and 'append'  
  if (type !== 'notify' && type !== 'append') {  
    console.log('❌ Not notify/append type, skipping');  
    return;  
  }  

  const rawMsg = messages[0];  
  console.log('📄 Raw message keys:', Object.keys(rawMsg));  
  console.log('🔑 Key:', rawMsg.key);  
  console.log('💬 Has message?', !!rawMsg.message);  

  const msg = parseMessage(rawMsg);  
  console.log('🔍 Parsed msg:', msg ? {  
    from: msg.from,  
    senderNum: msg.senderNum,  
    text: msg.text.substring(0, 50),  
    isGroup: msg.isGroup  
  } : 'NULL');  

  if (!msg) {  
    console.log('❌ parseMessage returned null');  
    return;  
  }  

  const prefix = config.PREFIX;  
  console.log('⚡ Prefix check:', {  
    prefix: prefix,  
    textStartsWith: msg.text.startsWith(prefix),  
    textPreview: msg.text.substring(0, 20)  
  });  

  if (!msg.text.startsWith(prefix)) {  
    console.log('❌ Text does not start with prefix');  
    return;  
  }  

  const args = msg.text.slice(prefix.length).trim().split(/ +/);  
  const cmd = args.shift().toLowerCase();  
  console.log('🎯 Command:', cmd);  

  console.log('📚 Available plugins:', [...global.LMK_PLUGINS.keys()]);  
  const plugin = global.LMK_PLUGINS.get(cmd);  
  console.log('🔍 Plugin found?', !!plugin);  

  if (!plugin) {  
    console.log('❌ Plugin not found for:', cmd);  
    await sock.sendMessage(msg.from, {  
      text: `❌ Unknown command: *${cmd}*\\nType *${prefix}menu* for help.`  
    }, { quoted: msg.m });  
    return;  
  }  

  // ← ADD THESE 3 LINES HERE (before permission check)  
  console.log('👤 Your number detected:', msg.senderNum);  
  console.log('👤 Owner number in config:', config.OWNER_NUMBER);  
  console.log('👤 isOwner result:', isOwner(msg.senderNum));  

  // Permission check  
  const ownerOnly = plugin.category === 'owner' || plugin.ownerOnly === true;  
  const isUserOwner = isOwner(msg.senderNum);  
  console.log('🔒 Permission check:', { ownerOnly, isUserOwner, publicMode: config.PUBLIC_MODE });  

  if (ownerOnly && !isUserOwner) {  
    await sock.sendMessage(msg.from, {  
      text: '❌ *Owner only command*'  
    }, { quoted: msg.m });  
    return;  
  }  

  if (!config.PUBLIC_MODE && !isUserOwner) {  
    await sock.sendMessage(msg.from, {  
      text: '🔒 *Bot is in private mode. Only owner can use commands.*'  
    }, { quoted: msg.m });  
    return;  
  }  

  // Execute  
  console.log('✅ EXECUTING:', cmd);  
  try {  
    await plugin.execute(sock, msg, args, config);  
    console.log('✅ Command executed successfully');  
  } catch (err) {  
    console.error(`❌ Error in ${cmd}:`, err.message);  
    await sock.sendMessage(msg.from, {  
      text: `❌ Error: ${err.message}`  
    }, { quoted: msg.m });  
  }  
});  

// Group events  
sock.ev.on('group-participants.update', async (update) => {  
  const { id, participants, action } = update;  

  if (action === 'add' && config.WELCOME_MSG) {  
    for (const user of participants) {  
      const text = config.WELCOME_MSG.replace('@user', '@' + user.split('@')[0]);  
      await sock.sendMessage(id, { text, mentions: [user] });  
    }  
  }  

  if (action === 'remove' && config.GOODBYE_MSG) {  
    for (const user of participants) {  
      const text = config.GOODBYE_MSG.replace('@user', '@' + user.split('@')[0]);  
      await sock.sendMessage(id, { text, mentions: [user] });  
    }  
  }  
});

} catch (err) {
console.error('❌ Bot error:', err.message);
setTimeout(startBot, 10000);
}
}

// Express server
app.get('/', (req, res) => {
res.json({
status: 'online',
bot: config.BOT_NAME,
owner: config.OWNER_NAME,
mode: config.PUBLIC_MODE ? 'public' : 'private',
plugins: global.LMK_PLUGINS ? [...new Set([...global.LMK_PLUGINS.values()])].length : 0,
time: new Date().toISOString()
});
});

app.get('/health', (req, res) => {
res.json({ status: 'alive' });
});

// Start everything
(async () => {
await loadPlugins();
app.listen(PORT, () => {
console.log(🌐 Server on port ${PORT});
});
startBot();
})();
