module.exports = {
  // Session
  SESSION_ID: process.env.SESSION_ID || 'LMK-MD~n35UxaJT#b3JxxGrL5IRp5mOEbowznXG_RsjvuE-RHo1hZaVspGg',

  // Bot Identity
  BOT_NAME: 'LMK-MD',
  OWNER_NAME: 'LMK-AGENT002',  // ← FIXED: Added closing quote
  OWNER_NUMBER: '27604707015',
  PREFIX: '.',

  // Mode
  PUBLIC_MODE: true,

  // Messages
  ALIVE_MSG: '*🤖 LMK-MD is Online*\n\n_Powered by REDDRAGON_',
  MENU_FOOTER: '© LMK-AGENT002 2026',

  // Auto features
  AUTO_READ: false,
  AUTO_TYPING: false,
  AUTO_RECORDING: false,
  ALWAYS_ONLINE: false,

  // Group
  WELCOME_MSG: '👋 Welcome @user to the group!',
  GOODBYE_MSG: '👋 @user left the group.',

  // API Keys (for plugins)
  OPENAI_KEY: process.env.OPENAI_KEY || '',
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || ''
};
