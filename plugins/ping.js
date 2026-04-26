module.exports = {
  command: 'ping',
  aliases: ['speed', 'p'],
  category: 'main',
  description: 'Check bot response speed',
  
  async execute(sock, msg, args, config) {
    const start = Date.now();
    await sock.sendMessage(msg.from, { text: '🏓 *Pong!*' }, { quoted: msg.m });
    const end = Date.now();
    
    await sock.sendMessage(msg.from, {
      text: `🏓 *Pong!*\n\n⚡ Speed: ${end - start}ms\n📡 Latency: ${end - start}ms`
    }, { quoted: msg.m });
  }
};
