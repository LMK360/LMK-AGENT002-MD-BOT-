const fs = require('fs');
const path = require('path');
const express = require('express');
const pino = require('pino');
const config = require('./config');

const {
    default: makeWASocket,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    delay,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 9090;

//===================SESSION-AUTH============================
if (!fs.existsSync(__dirname + '/sessions/creds.json')) {
    if (!config.SESSION_ID) {
        console.log('❌ Please add your session to SESSION_ID env !!');
        process.exit(1);
    }
    
    if (!config.SESSION_ID.startsWith('LMK-MD~')) {
        console.log('❌ Invalid session format. Must start with LMK-MD~');
        process.exit(1);
    }
    
    const sessdata = config.SESSION_ID.replace('LMK-MD~', '');
    
    try {
        const { File } = require('megajs');
        const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
        
        filer.download((err, data) => {
            if (err) {
                console.log('❌ MEGA download failed:', err.message);
                process.exit(1);
            }
            fs.mkdirSync(__dirname + '/sessions', { recursive: true });
            fs.writeFileSync(__dirname + '/sessions/creds.json', data);
            console.log('✅ Session downloaded from MEGA');
            startBot();
        });
    } catch (err) {
        console.log('❌ Session auth error:', err.message);
        process.exit(1);
    }
} else {
    startBot();
}

//===================BOT CORE============================
async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser: Browsers.macOS('Chrome'),
        markOnlineOnConnect: config.ALWAYS_ONLINE === 'true'
    });

    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);
    
    // Connection handler
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
            console.log('✅ Bot connected:', sock.user.id);
            
            // Send alive message to owner
            if (config.LIVE_MSG) {
                await delay(2000);
                await sock.sendMessage(config.OWNER_NUMBER + '@s.whatsapp.net', {
                    text: config.LIVE_MSG
                });
            }
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connection closed:', lastDisconnect?.error?.output?.statusCode);
            
            if (shouldReconnect) {
                console.log('🔄 Reconnecting...');
                await delay(5000);
                startBot();
            }
        }
    });

    //===================MESSAGE HANDLER============================
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        
        const from = m.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        const sender = m.key.participant || m.key.remoteJid;
        const senderNum = sender.split('@')[0];
        
        // Get message text
        const body = m.message.conversation 
            || m.message.extendedTextMessage?.text 
            || m.message.imageMessage?.caption 
            || m.message.videoMessage?.caption 
            || '';
        
        // Check prefix
        const prefix = config.PREFIX || '.';
        const isCmd = body.startsWith(prefix);
        if (!isCmd) return;
        
        const args = body.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        // Owner check
        const isOwner = senderNum === config.OWNER_NUMBER || senderNum === config.DEV;
        
        // Public/private mode check
        if (config.PUBLIC_MODE !== 'true' && !isOwner) return;
        
        //===================COMMAND ROUTER============================
        // Load plugins dynamically
        const pluginsDir = path.join(__dirname, 'plugins');
        if (fs.existsSync(pluginsDir)) {
            const pluginFiles = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
            
            for (const file of pluginFiles) {
                try {
                    const plugin = require(path.join(pluginsDir, file));
                    if (plugin.commands) {
                        for (const cmd of plugin.commands) {
                            if (cmd.pattern === command || (cmd.alias && cmd.alias.includes(command))) {
                                // Execute command
                                await cmd.function(sock, m, {
                                    from,
                                    isGroup,
                                    sender,
                                    senderNum,
                                    isOwner,
                                    body,
                                    args,
                                    command,
                                    reply: (text) => sock.sendMessage(from, { text }, { quoted: m })
                                });
                                return;
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Plugin error (${file}):`, err.message);
                }
            }
        }
        
        // If no plugin matched, send unknown command
        await sock.sendMessage(from, {
            text: `❌ Unknown command: *${command}*\n\nType *${prefix}menu* for commands list.`
        }, { quoted: m });
    });

    // Group events (optional)
    sock.ev.on('group-participants.update', async (update) => {
        if (config.WELCOME === 'true') {
            const { id, participants, action } = update;
            if (action === 'add') {
                for (const user of participants) {
                    await sock.sendMessage(id, {
                        text: `👋 Welcome @${user.split('@')[0]} to the group!`,
                        mentions: [user]
                    });
                }
            }
        }
    });
}

//===================EXPRESS SERVER (RENDER)============================
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        bot: 'LMK-MD',
        owner: config.OWNER_NAME,
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'alive' });
});

app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
});
