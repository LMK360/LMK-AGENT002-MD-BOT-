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
        if (Array.isArray(plugin.aliases)) {
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
  console.log(`✅ Loaded ${uniquePlugins.size} plugins (${global.LMK_PLUGINS.size} commands + aliases)`);
  console.log('📚 All commands:', [...global.LMK_PLUGINS.keys()]);
}

// Hot reload function
global.reloadPlugins = async function () {
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

        const ownerJid = config.OWNER_NUMBER.includes('@')
          ? config.OWNER_NUMBER
          : config.OWNER_NUMBER + '@s.whatsapp.net';

        await sock.sendMessage(ownerJid, {
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

    // Message handler
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (!messages?.length) return;

      console.log('📨 messages.upsert fired! Type:', type, 'Count:', messages.length);

      // ✅ FIX: allow both 'notify' (others' messages) and 'append' (your own messages)
      if (type !== 'notify' && type !== 'append') {
        console.log('❌ Not notify/append type, skipping');
        return;
      }

      const rawMsg = messages[0];
      if (!rawMsg) return;

      // ✅ FIX: Skip messages with no content (status updates, receipts, etc.)
      if (!rawMsg.message) {
        console.log('❌ No message content, skipping');
        return;
      }

      // ✅ FIX: Skip protocol/ephemeral messages that aren't real chat messages
      const msgKeys = Object.keys(rawMsg.message);
      const ignoredTypes = ['protocolMessage', 'senderKeyDistributionMessage', 'reactionMessage'];
      if (msgKeys.some(k => ignoredTypes.includes(k))) {
        console.log('❌ Protocol/reaction message, skipping');
        return;
      }

      console.log('📄 Raw message keys:', msgKeys);
      console.log('🔑 Key:', rawMsg.key);
      console.log('💬 fromMe?', rawMsg.key.fromMe);

      let msg;
      try {
        msg = parseMessage(rawMsg);
      } catch (e) {
        console.log('❌ parseMessage crash:', e.message);
        return;
      }

      if (!msg || !msg.text) {
        console.log('❌ No valid text message');
        return;
      }

      // ✅ FIX: Resolve OWNER_SELF — if this is a fromMe message,
      // the sender IS the owner. Use sock.user.id to get the real number.
      let resolvedSenderNum = msg.senderNum;
      if (msg.senderNum === 'OWNER_SELF') {
        // sock.user.id looks like "27633783183:27@s.whatsapp.net"
        // Extract just the number before the colon
        const botId = sock.user?.id || '';
        resolvedSenderNum = botId.split(':')[0].split('@')[0];
        console.log('👤 fromMe message — resolved sender as:', resolvedSenderNum);
      }

      const prefix = config.PREFIX;

      console.log('⚡ Prefix check:', {
        prefix: prefix,
        textStartsWith: msg.text?.startsWith(prefix),
        textPreview: msg.text?.substring(0, 20) || ''
      });

      if (!msg.text.startsWith(prefix)) {
        console.log('❌ Text does not start with prefix');
        return;
      }

      const body = msg.text.slice(prefix.length).trim();
      if (!body) return;

      const args = body.split(/ +/);
      const cmd = args.shift().toLowerCase();

      console.log('🎯 Command:', cmd);
      console.log('📚 Available plugins:', [...global.LMK_PLUGINS.keys()]);

      const plugin = global.LMK_PLUGINS.get(cmd);
      console.log('🔍 Plugin found?', !!plugin);

      if (!plugin) {
        console.log('❌ Plugin not found for:', cmd);
        await sock.sendMessage(msg.from, {
          text: `❌ Unknown command: *${cmd}*\nType *${prefix}menu* for help.`
        }, { quoted: msg.m });
        return;
      }

      if (typeof plugin.execute !== 'function') {
        console.log('❌ Invalid plugin (no execute):', cmd);
        return;
      }

      console.log('👤 Resolved sender number:', resolvedSenderNum);
      console.log('👤 Owner number in config:', config.OWNER_NUMBER);
      console.log('👤 isOwner result:', isOwner(resolvedSenderNum));

      const ownerOnly = plugin.category === 'owner' || plugin.ownerOnly === true;
      const isUserOwner = isOwner(resolvedSenderNum);

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

      // ✅ Pass resolved sender number into msg so plugins also get it right
      msg.senderNum = resolvedSenderNum;

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
    console.log(`🌐 Server on port ${PORT}`);
  });
  startBot();
})();
