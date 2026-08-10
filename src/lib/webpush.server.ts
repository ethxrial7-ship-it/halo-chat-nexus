/** Minimal Web Push (VAPID + aes128gcm) implementation using WebCrypto only. */

const enc = new TextEncoder();

function b64urlToBytes(input: string): Uint8Array {
  const pad = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = pad + "=".repeat((4 - (pad.length % 4)) % 4);
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data as BufferSource));
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

async function vapidHeader(audience: string): Promise<{ authorization: string }> {
  const jwk = JSON.parse(process.env["VAPID_PRIVATE_JWK"]!) as JsonWebKey;
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:notifications@example.com";
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);

  const header = bytesToB64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bytesToB64url(
    enc.encode(
      JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: subject }),
    ),
  );
  const signingInput = `${header}.${payload}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput)),
  );
  const jwt = `${signingInput}.${bytesToB64url(sig)}`;

  const publicKey = bytesToB64url(
    concat(new Uint8Array([4]), b64urlToBytes(jwk.x as string), b64urlToBytes(jwk.y as string)),
  );
  return { authorization: `vapid t=${jwt}, k=${publicKey}` };
}

async function encryptPayload(payload: string, p256dh: string, authSecret: string): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(p256dh);
  const authKey = b64urlToBytes(authSecret);

  const asKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic as BufferSource,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asKeys.privateKey, 256),
  );

  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authKey, shared, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, ["encrypt"]);
  const plaintext = concat(enc.encode(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, aesKey, plaintext as BufferSource),
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

/** Returns endpoints that are gone (404/410) and should be deleted. */
export async function sendWebPush(targets: PushTarget[], payload: unknown): Promise<string[]> {
  if (!process.env["VAPID_PRIVATE_JWK"]) return [];
  const body = JSON.stringify(payload);
  const dead: string[] = [];

  await Promise.all(
    targets.map(async (target) => {
      try {
        const audience = new URL(target.endpoint).origin;
        const { authorization } = await vapidHeader(audience);
        const encrypted = await encryptPayload(body, target.p256dh, target.auth);
        const response = await fetch(target.endpoint, {
          method: "POST",
          headers: {
            Authorization: authorization,
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: "60",
            Urgency: "high",
          },
          body: encrypted as BodyInit,
        });
        if (response.status === 404 || response.status === 410) dead.push(target.endpoint);
        else if (!response.ok) {
          console.error(`Push failed [${response.status}]: ${await response.text()}`);
        }
      } catch (error) {
        console.error("Push error", error);
      }
    }),
  );

  return dead;
}
