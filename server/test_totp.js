const base32 = require('thirty-two');
const crypto = require('crypto');

// Test TOTP validation
const secret = 'LXBSMDTMSP2I5XFXIYRGFVWSFI';
console.log('Secret:', secret);

const decoded = base32.decode(secret);
console.log('Decoded secret buffer:', decoded);
console.log('Decoded secret hex:', decoded.toString('hex'));

// Generate TOTP manually for current time
function generateTOTP(secret, time, period = 30) {
    const epoch = Math.floor(time / (period * 1000));
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(epoch));
    
    const hmac = crypto.createHmac('sha1', decoded);
    const hash = hmac.update(buffer).digest();
    
    const offset = hash[hash.length - 1] & 0xf;
    const code = (hash[offset] & 0x7f) << 24 |
                 (hash[offset + 1] & 0xff) << 16 |
                 (hash[offset + 2] & 0xff) << 8 |
                 (hash[offset + 3] & 0xff);
    
    return ('000000' + (code % 1000000)).slice(-6);
}

const now = Date.now();
const currentCode = generateTOTP(secret, now);
console.log('Current TOTP code:', currentCode);

// Also test previous and next codes
const prevCode = generateTOTP(secret, now - 30000);
const nextCode = generateTOTP(secret, now + 30000);
console.log('Previous TOTP code:', prevCode);
console.log('Next TOTP code:', nextCode);
