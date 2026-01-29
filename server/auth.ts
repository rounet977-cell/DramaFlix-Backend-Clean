import jwt from "jsonwebtoken";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRY = "7d";

export interface AuthPayload {
  userId: string;
  email?: string;
}

export interface TokenData {
  token: string;
  expiresIn: string;
}

/**
 * Hash password with salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  try {
    const hashedBuffer = (await scryptAsync(password, salt, 64)) as Buffer;
    return key === hashedBuffer.toString("hex");
  } catch {
    return false;
  }
}

/**
 * Create JWT token
 */
export function createToken(payload: AuthPayload): TokenData {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  return { token, expiresIn: JWT_EXPIRY };
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}
