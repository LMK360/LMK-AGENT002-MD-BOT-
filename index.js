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

  const uniquePlugins = new Set([...plugins.values()]);
  console.log(`✅ Loaded ${uniquePlugins.size} plugins (${plugins.size} commands + aliases)`);
}

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
        console.log('✅ Bot connected:', sock.user?.id);
        await sock.sendMessage(config.OWNER_NUMBER + '@s.whatsapp.net', {
          text: config.ALIVE_MSG
        });
      }

      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        if (reason !== DisconnectReason.loggedOut) {
          console.log('🔄 Reconnecting...');
          setTimeout(startBot, 5000);
        }
      }
    });

    // Message handler with DEBUG
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      const msg = parseMessage(messages[0]);
      
      // DEBUG LOG
      console.log('📩 MSG:', msg?.text?.substring(0, 30), '| From:', msg?.senderNum);
      
      if (!msg) return;

      const prefix = config.PREFIX;
      if (!msg.text.startsWith(prefix)) {
        console.log('❌ No prefix');
        return;
      }

      const args = msg.text.slice(prefix.length).trim().split(/ +/);
      const cmd = args.shift().toLowerCase();

      console.log('🔍 CMD:', cmd, '| Available:', [...plugins.keys()].join(', '));

      // Check permissions
      if (!config.PUBLIC_MODE && !isOwner(msg.senderNum)) {
        console.log('❌ Not owner');
        return;
      }

      const plugin = plugins.get(cmd);
      if (plugin) {
        console.log('✅ EXECUTING:', cmd);
        try {
          await plugin.execute(sock, msg, args, config);
        } catch (err) {
          console.error(`❌ Error in ${cmd}:`, err.message);
          await sock.sendMessage(msg.from, {
            text: `❌ Error: ${err.message}`
          }, { quoted: msg.m });
        }
      } else {
        console.log('❌ UNKNOWN:', cmd);
        await sock.sendMessage(msg.from, {
          text: `❌ Unknown: *${cmd}*\nType *${prefix}menu* for help.`
        }, { quoted: msg.m });
      }
    });

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

app.get('/', (req, res) => {
  res.json({ status: 'online', bot: config.BOT_NAME, owner: config.OWNER_NAME });
});

app.get('/health', (req, res) => {
  res.json({ status: 'alive' });
});

(async () => {
  await loadPlugins();
  app.listen(PORT, () => {
    console.log(`🌐 Server on port ${PORT}`);
  });
  startBot();
})();
