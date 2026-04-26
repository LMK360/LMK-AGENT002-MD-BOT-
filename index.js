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

// Load plugins
const plugins = new Map();
const pluginsDir = path.join(__dirname, 'plugins');

async function loadPlugins() {
  await fs.ensureDir(pluginsDir);
  const files = await fs.readdir(pluginsDir);
  
  for (const file of files.filter(f => f.endsWith('.js'))) {
    try {
      delete require.cache[require.resolve(path.join(pluginsDir, file))];
      const plugin = require(path.join(pluginsDir, file));
      
      if (plugin.command) {
        plugins.set(plugin.command, plugin);
        if (plugin.aliases) {
          plugin.aliases.forEach(alias => plugins.set(alias, plugin));
        }
      }
    } catch (err) {
      console.error(`❌ Failed to load ${file}:`, err.message);
    }
  }
  
  console.log(`✅ Loaded ${plugins.size} commands`);
}

// Start bot
async function startBot() {
  try {
    // Download session if needed
    if (!config.SESSION_ID) {
      console.log('❌ SESSION_ID not set');
      process.exit(1);
    }
    
    await downloadSession(config.SESSION_ID);
    
    // Create socket
    const sock = await createSocket('./sessions');
    
    // Connection handler
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      
      if (connection === 'open') {
        console.log('✅ Bot connected:', sock.user?.id);
        
        // Send alive to owner
        await sock.sendMessage(config.OWNER_NUMBER + '@s.whatsapp.net', {
          text: config.ALIVE_MSG
        });
      }
      
      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log('❌ Connection closed:', reason);
        
        if (reason !== DisconnectReason.loggedOut) {
          console.log('🔄 Reconnecting...');
          setTimeout(startBot, 5000);
        }
      }
    });
    
    // Message handler
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      
      const msg = parseMessage(messages[0]);
      if (!msg) return;
      
      // Check prefix
      const prefix = config.PREFIX;
      if (!msg.text.startsWith(prefix)) return;
      
      const args = msg.text.slice(prefix.length).trim().split(/ +/);
      const cmd = args.shift().toLowerCase();
      
      // Check permissions
      if (!config.PUBLIC_MODE && !isOwner(msg.senderNum)) return;
      
      // Execute command
      const plugin = plugins.get(cmd);
      if (plugin) {
        try {
          await plugin.execute(sock, msg, args, config);
        } catch (err) {
          console.error(`❌ Command error (${cmd}):`, err.message);
          await sock.sendMessage(msg.from, {
            text: `❌ Error: ${err.message}`
          }, { quoted: msg.m });
        }
      } else {
        await sock.sendMessage(msg.from, {
          text: `❌ Unknown command: *${cmd}*\nType *${prefix}menu* for help.`
        }, { quoted: msg.m });
      }
    });
    
    // Group events
    sock.ev.on('group-participants.update', async (update) => {
      const { id, participants, action } = update;
      
      if (action === 'add' && config.WELCOME_MSG) {
        for (const user of participants) {
          const text = config.WELCOME_MSG.replace('@user', `@${user.split('@')[0]}`);
          await sock.sendMessage(id, { text, mentions: [user] });
        }
      }
      
      if (action === 'remove' && config.GOODBYE_MSG) {
        for (const user of participants) {
          const text = config.GOODBYE_MSG.replace('@user', `@${user.split('@')[0]}`);
          await sock.sendMessage(id, { text, mentions: [user] });
        }
      }
    });
    
  } catch (err) {
    console.error('❌ Bot error:', err.message);
    setTimeout(startBot, 10000);
  }
}

// Express server (for Render)
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    bot: config.BOT_NAME,
    owner: config.OWNER_NAME,
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
    console.log(`🌐 Server on port ${PORT}`);
  });
  startBot();
})();
