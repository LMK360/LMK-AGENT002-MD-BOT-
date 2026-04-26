const fs = require('fs-extra');
const { File } = require('megajs');
const path = require('path');

const SESSION_DIR = path.join(__dirname, '..', 'sessions');

async function downloadSession(sessionId) {
  if (!sessionId.startsWith('LMK-MD~')) {
    throw new Error('Invalid session format. Must start with LMK-MD~');
  }
  
  const fileId = sessionId.replace('LMK-MD~', '');
  const credsPath = path.join(SESSION_DIR, 'creds.json');
  
  if (await fs.pathExists(credsPath)) {
    console.log('✅ Session already exists locally');
    return credsPath;
  }
  
  console.log('🔐 Downloading session from MEGA...');
  
  await fs.ensureDir(SESSION_DIR);
  
  const file = File.fromURL(`https://mega.nz/file/${fileId}`);
  
  return new Promise((resolve, reject) => {
    file.download((err, data) => {
      if (err) {
        reject(new Error(`MEGA download failed: ${err.message}`));
        return;
      }
      
      fs.writeFileSync(credsPath, data);
      console.log('✅ Session downloaded successfully');
      resolve(credsPath);
    });
  });
}

module.exports = { downloadSession };
