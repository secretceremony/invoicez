// src/routes/auth.routes.js
import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db.js';

const r = Router();

// PBKDF2 params (built-in crypto, no extra deps)
const ITERATIONS = 120_000;
const KEYLEN = 64;
const DIGEST = 'sha256';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';
const TOKEN_TTL = 60 * 60; // 1 hour

const hashPassword = (password, salt) =>
  crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString('hex');

const signToken = (payload, expiresInSec = TOKEN_TTL) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const data = `${encode(header)}.${encode(body)}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
};

const normalizeUser = (row = {}) => ({
  id: row.UserID ?? row.id ?? row.ID ?? null,
  email: row.Email ?? row.email ?? null,
  name: row.FullName ?? row.Name ?? row.fullName ?? null,
});

// Expected table (create manually in DB):
// CREATE TABLE Users (
//   UserID BIGINT AUTO_INCREMENT PRIMARY KEY,
//   Email VARCHAR(255) NOT NULL UNIQUE,
//   FullName VARCHAR(255),
//   PasswordHash VARCHAR(255) NOT NULL,
//   PasswordSalt VARCHAR(255) NOT NULL,
//   CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

r.post('/register', async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';
    const name = req.body?.name || null;

    if (!email || !password) {
      return res.status(400).json({ error: 'email dan password wajib' });
    }

    const [exists] = await pool.query(
      'SELECT UserID FROM Users WHERE Email = ? LIMIT 1',
      [email],
    );
    if (exists.length) {
      return res.status(409).json({ error: 'Email sudah terdaftar' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);

    const [result] = await pool.query(
      'INSERT INTO Users (Email, FullName, PasswordHash, PasswordSalt) VALUES (?,?,?,?)',
      [email, name, hash, salt],
    );

    const user = { id: result.insertId, email, name };
    const token = signToken({ sub: user.id, email, name });
    res.status(201).json({ user, token, expiresIn: TOKEN_TTL });
  } catch (e) {
    const msg = e?.message || '';
    if (msg.includes('ER_NO_SUCH_TABLE')) {
      return res.status(500).json({ error: 'Table Users belum ada. Buat tabel Users terlebih dahulu.' });
    }
    res.status(500).json({ error: msg });
  }
});

r.post('/login', async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';
    if (!email || !password) {
      return res.status(400).json({ error: 'email dan password wajib' });
    }

    const [rows] = await pool.query(
      'SELECT UserID, Email, FullName, PasswordHash, PasswordSalt FROM Users WHERE Email = ? LIMIT 1',
      [email],
    );
    const row = rows[0];
    if (!row) return res.status(401).json({ error: 'Email atau password salah' });

    const computed = hashPassword(password, row.PasswordSalt);
    if (computed !== row.PasswordHash) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = normalizeUser(row);
    const token = signToken({ sub: user.id, email: user.email, name: user.name });
    res.json({ user, token, expiresIn: TOKEN_TTL });
  } catch (e) {
    const msg = e?.message || '';
    res.status(500).json({ error: msg });
  }
});

export default r;
