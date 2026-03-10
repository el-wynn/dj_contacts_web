import * as crypto from 'crypto';

const algorithm = 'aes-256-cbc'; // Use AES 256-bit encryption
 
export function encrypt(data : string, key : string) { // Function to encrypt data
    const iv = crypto.randomBytes(16); // Generate a random 16-byte IV
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    const encrypted = cipher.update(data);
    const encryptedFinal = Buffer.concat([encrypted, cipher.final()]);
    return {
        encryptIv: iv.toString('hex'),
        encryptedData: encryptedFinal.toString('hex')
    };
}
 
export function decrypt(dataString : string, key : string) { // Function to decrypt data
    const data = JSON.parse(dataString);
    const encryptIv = Buffer.from(data.encryptIv, 'hex');
    const encryptedText = Buffer.from(data.encryptedData, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), encryptIv);
    const decrypted = decipher.update(encryptedText);
    const decryptedFinal = Buffer.concat([decrypted, decipher.final()]);
    return decryptedFinal.toString();
}