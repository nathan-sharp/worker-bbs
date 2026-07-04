export async function generatePosterHash(ip: string, boardId: string, salt: string = 'worker_bbs_secret'): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const raw = `${ip}_${dateStr}_${boardId}_${salt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64Hash = btoa(String.fromCharCode(...hashArray))
    .replace(/[+/=]/g, '')
    .slice(0, 7);

  return `ID:${base64Hash}`;
}

export async function generateBanHash(ip: string, salt: string = 'worker_bbs_ban_salt'): Promise<string> {
  const raw = `${ip}_${salt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hexHash.slice(0, 32);
}
