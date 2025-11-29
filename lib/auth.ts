import crypto from "crypto";
import { headers } from "next/headers";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type AuthTokenPayload = {
  userId: number;
  exp: number;
};

function getSecret() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("JWT secret is not configured. Set JWT_SECRET in your environment.");
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, new Uint8Array(salt), 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [saltHex, hashHex] = hash.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, new Uint8Array(salt), 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
  return crypto.timingSafeEqual(new Uint8Array(Buffer.from(hashHex, "hex")), new Uint8Array(derived));
}

export function createAuthToken(payload: Omit<AuthTokenPayload, "exp">) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const fullPayload: AuthTokenPayload = { ...payload, exp };
  const json = JSON.stringify(fullPayload);
  const base = Buffer.from(json).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(base)
    .digest("base64url");
  return `${base}.${signature}`;
}

export function verifyAuthToken(token: string | null): AuthTokenPayload | null {
  if (!token) return null;
  const [base, signature] = token.split(".");
  if (!base || !signature) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(base).digest("base64url");
  if (!crypto.timingSafeEqual(new Uint8Array(Buffer.from(expected)), new Uint8Array(Buffer.from(signature)))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(base, "base64url").toString("utf-8")) as AuthTokenPayload;
    if (payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

export function getTokenFromHeaders() {
  const headerList = headers();
  const auth = headerList.get("authorization") || headerList.get("Authorization");
  if (!auth) return null;
  const parts = auth.split(" ");
  if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
    return parts[1];
  }
  return null;
}
