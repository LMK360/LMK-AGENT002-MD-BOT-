module.exports = {
    // Session
    SESSION_ID: process.env.SESSION_ID || 'LMK-MD~u3QjlK7D#4OZ_G4T7ZLEag7CUI9o-YYzbQlGCGQ3ddUDPieSdl78',
    
    // Bot Identity
    BOT_NAME: 'LMK-MD',
    OWNER_NAME: 'LMK-AGENT002',
    OWNER_NUMBER: '27633783183',
    PREFIX: '.',
    
    // Mode - true = public (anyone can use), false = private (owner only)
    PUBLIC_MODE: true,
    
    // Messages
    ALIVE_MSG: '*🤖 LMK-MD is Online*\n\n_Powered by LMK-AGENT002_',
    MENU_FOOTER: '© LMK-AGENT002 2026',
    
    // Auto features
    AUTO_READ: false,
    AUTO_TYPING: false,
    AUTO_RECORDING: true,
    ALWAYS_ONLINE: false,
    
    // Group
    WELCOME_MSG: '👋 Welcome @user to the group!',
    GOODBYE_MSG: '👋 @user left the group.',
    
    // API Keys (for plugins)
    OPENAI_KEY: process.env.OPENAI_KEY || '',
    RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || ''
};
