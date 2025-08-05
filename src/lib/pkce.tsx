// Functions for PKCE Auth
export function generateCodeVerifier(length: number = 128): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
    const digest = await sha256(codeVerifier);
    const buffer = new Uint8Array(digest);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    return challenge;
}

export async function sha256(plain: string) {
    const utf8 = new TextEncoder().encode(plain);
    const digest = await window.crypto.subtle.digest('SHA-256', utf8);
    return digest;
}