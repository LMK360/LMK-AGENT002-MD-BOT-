const fs = require('fs-extra');
const { File } = require('megajs');
const path = require('path');

const SESSION_DIR = path.join(__dirname, '..', 'sessions');

async function downloadSession(sessionId) {
  if (!sessionId.startsWith('LMK-MD~')) {
    throw new Error('Invalid session format. Must start with LMK-MD~');
  }
  
  const credsPath = path.join(SESSION_DIR, 'creds.json');
  
  // ✅ CHECK LOCAL FIRST — never hit MEGA if we already have it
  if (await fs.pathExists(credsPath)) {
    console.log('✅ Using local session (no MEGA login needed)');
    return credsPath;
  }
  
  // Only download from MEGA if local file is missing
  const fileId = sessionId.replace('LMK-MD~', '');
  
  console.log('🔐 First time setup: downloading from MEGA...');
  
  await fs.ensureDir(SESSION_DIR);
  
  const file = File.fromURL(`https://mega.nz/file/${fileId}`);
  
  return new Promise((resolve, reject) => {
    file.download((err, data) => {
      if (err) {
        reject(new Error(`MEGA download failed: ${err.message}`));
        return;
      }
      
      fs.writeFileSync(credsPath, data);
      console.log('✅ Session saved locally. MEGA will not be used again.');
      resolve(credsPath);
    });
  });
}

module.exports = { downloadSession };
