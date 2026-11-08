const OWNER_ID = process.env.OWNER_ID;

function isOwner(msg) {
    if (!OWNER_ID) return false;
    return msg.from.id.toString() === OWNER_ID.toString();
}

function extractUsername(input) {
    if (!input) return null;
    let clean = input.trim().toLowerCase();
    
    // Agar input complete HTTP ya Telegram link hai (e.g., https://t.me)
    if (clean.includes('t.me/')) {
        let parts = clean.split('t.me/');
        if (parts[1]) {
            let subParts = parts[1].split('/');
            clean = subParts[0]; // Sirf core username nikalenge, post ID ko chodd kar
        }
    }
    
    // Baki extra symbols clear karein
    clean = clean.replace('https://', '').replace('http://', '').replace('@', '');
    
    return '@' + clean;
}

module.exports = { isOwner, extractUsername };
