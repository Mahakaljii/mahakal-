const OWNER_ID = process.env.OWNER_ID;

function isOwner(msg) {
    if (!OWNER_ID) return false;
    return msg.from.id.toString() === OWNER_ID.toString();
}

// Kisi bhi type ke input (link ya username) se standard clean @username nikalne ke liye
function extractUsername(input) {
    if (!input) return null;
    let clean = input.trim().toLowerCase();
    
    // Agar text t.me/ ke sath link format mein hai
    if (clean.includes('t.me/')) {
        let parts = clean.split('t.me/')[1].split('/');
        clean = parts[0]; // Channel ka core username mil jayega
    }
    
    // Agar username format hai to ensure karein ki aage @ laga ho
    clean = clean.replace('https://', '').replace('http://', '');
    if (!clean.startsWith('@')) {
        clean = '@' + clean;
    }
    
    return clean;
}

module.exports = { isOwner, extractUsername };
