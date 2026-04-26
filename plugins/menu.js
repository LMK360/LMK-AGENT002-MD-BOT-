const config = require('../config');

module.exports = {
  command: 'menu',
  aliases: ['help', 'commands'],
  category: 'main',
  description: 'Show all commands',
  
  async execute(sock, msg, args, cfg) {
    const prefix = cfg.PREFIX;
    
    const menu = `
╔═══════◇
║ 🤖 *${cfg.BOT_NAME} MENU*
╠═══════◇
║
║ *${prefix}menu* — Show this
║ *${prefix}alive* — Check status
║ *${prefix}ping* — Bot speed
║ *${prefix}owner* — Contact owner
║
╠═══════◇
║ *DOWNLOADS*
╠═══════◇
║ *${prefix}yt* — YouTube video
║ *${prefix}tiktok* — TikTok video
║ *${prefix}ig* — Instagram post
║
╠═══════◇
║ *GROUP*
╠═══════◇
║ *${prefix}kick* — Remove user
║ *${prefix}add* — Add user
║ *${prefix}promote* — Make admin
║ *${prefix}demote* — Remove admin
║
╠═══════◇
║ *FUN*
╠═══════◇
║ *${prefix}joke* — Random joke
║ *${prefix}quote* — Inspiration
║
╚═══════◇
${cfg.MENU_FOOTER}`;
    
    await sock.sendMessage(msg.from, { text: menu }, { quoted: msg.m });
  }
};
