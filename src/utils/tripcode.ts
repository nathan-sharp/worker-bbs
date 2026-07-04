export async function generateTripcode(inputName: string): Promise<{ name: string; tripcode: string | null }> {
  if (!inputName || !inputName.includes('#')) {
    return { name: inputName || 'Anonymous', tripcode: null };
  }

  const parts = inputName.split('#');
  const name = parts[0].trim() || 'Anonymous';
  const secret = parts.slice(1).join('#');

  if (!secret) {
    return { name, tripcode: null };
  }

  const isSecure = secret.startsWith('#');
  const actualSecret = isSecure ? secret.slice(1) : secret;

  const encoder = new TextEncoder();
  const data = encoder.encode(actualSecret + (isSecure ? '_secure_salt_worker_bbs' : '_trip_salt'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64Hash = btoa(String.fromCharCode(...hashArray))
    .replace(/[+/=]/g, '')
    .slice(0, 10);

  const tripcode = (isSecure ? '!!' : '!') + base64Hash;
  return { name, tripcode };
}
