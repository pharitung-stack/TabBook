// Authentication structure adapted from fullstackauth/backend/routes/auth.js.
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const cookieName = 'tabbook_session';
const lifetime = 7 * 24 * 60 * 60;
const publicUser = (user) => ({ id: String(user._id), name: user.name, email: user.email });
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

export function createApp({ users, secret, origin = 'http://127.0.0.1:5173', production = false, ready = () => true }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: {
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    // Local production previews use HTTP; enable HTTPS upgrades on a TLS host.
    'upgrade-insecure-requests': production ? [] : null,
  } } }));
  app.use(express.json({ limit: '12kb' }));
  app.use(cookieParser());
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.get('origin') && req.get('origin') !== origin) return res.status(403).json({ error: 'Please use TabBook directly to continue.' });
    if (!req.is('application/json')) return res.status(415).json({ error: 'Please send JSON.' });
    next();
  });
  const cookieOptions = { httpOnly: true, secure: production, sameSite: 'strict', path: '/' };
  app.get('/api/health', (_req, res) => res.status(ready() ? 200 : 503).json({ ready: ready() }));
  app.use('/api/auth', (req, res, next) => {
    if (req.path === '/logout') return next();
    if (!secret || !ready()) return res.status(503).json({ error: 'Your notebook isn’t connected yet. The project owner needs to finish the database setup.' });
    next();
  });
  const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'A few too many attempts. Please try again in 15 minutes.' } });
  app.use(['/api/auth/login', '/api/auth/register'], authLimit);

  function signIn(res, user, status = 200) {
    const token = jwt.sign({}, secret, { subject: String(user._id), expiresIn: lifetime, issuer: 'tabbook', audience: 'tabbook-web', algorithm: 'HS256' });
    res.cookie(cookieName, token, { ...cookieOptions, maxAge: lifetime * 1000 });
    return res.status(status).json({ user: publicUser(user) });
  }
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) return res.status(400).json({ error: 'Please enter a name between 2 and 80 characters.' });
    if (typeof email !== 'string' || !validEmail(email.trim())) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({ error: 'Use at least 8 characters and no more than 72 bytes for your password.' });
    const normalizedEmail = email.trim().toLowerCase();
    if (await users.findByEmail(normalizedEmail)) return res.status(409).json({ error: 'An account with that email already exists. Try logging in.' });
    try {
      const user = await users.create({ name: name.trim(), email: normalizedEmail, password });
      return signIn(res, user, 201);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: 'An account with that email already exists. Try logging in.' });
      throw err;
    }
  });
  // Equal-cost comparison also for unknown accounts.
  const dummyHash = bcrypt.hashSync('unused-dummy-comparison-value', 12);
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !validEmail(email.trim()) || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({ error: 'Please enter a valid email and password.' });
    const user = await users.findByEmail(email.trim().toLowerCase());
    const matches = await bcrypt.compare(password, user?.password || dummyHash);
    if (!user || !matches) return res.status(401).json({ error: 'That email and password don’t match. Please try again.' });
    return signIn(res, user);
  });
  app.get('/api/auth/me', async (req, res) => {
    let payload;
    try { payload = jwt.verify(req.cookies[cookieName], secret, { algorithms: ['HS256'], issuer: 'tabbook', audience: 'tabbook-web' }); }
    catch { return res.status(401).json({ error: 'Please log in to open your notebook.' }); }
    const user = await users.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Please log in to open your notebook.' });
    res.json({ user: publicUser(user) });
  });
  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(cookieName, cookieOptions);
    res.json({ message: 'Signed out.' });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'This page could not be found.' }));
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  app.use(express.static(dist));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request could not be read.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That request is too large.' });
    // Never return database details, connection strings, or stack traces to clients.
    res.status(500).json({ error: 'We couldn’t open your notebook. Please try again in a moment.' });
  });
  return app;
}
