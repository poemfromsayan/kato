import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import { createUser, findUserByEmail, findUserById, updateUser } from './repository.js';

const SALT_ROUNDS = 12;
const TOKEN_TTL = '2h';

function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, { expiresIn: TOKEN_TTL });
}

export async function register(req, res, next) {
  try {
    const { email, password, displayName } = req.body;

    const existing = await findUserByEmail(email);
    if (existing) {
      // Nota: revelar que el email ya existe es un trade-off de usabilidad
      // conocido (permite enumerar cuentas). Aceptable para un registro,
      // pero en login usamos siempre un mensaje genérico (ver abajo).
      throw new ApiError(409, 'Ya existe una cuenta con ese correo');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({ email, passwordHash, displayName });
    const token = issueToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    // Mensaje genérico a propósito: no distinguimos "no existe" de
    // "contraseña incorrecta" para no facilitar enumeración de cuentas.
    const invalidCredentials = () => new ApiError(401, 'Correo o contraseña incorrectos');

    if (!user) throw invalidCredentials();

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw invalidCredentials();

    const token = issueToken(user);
    const { password_hash, ...publicUser } = user;

    res.json({ user: publicUser, token });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) throw new ApiError(404, 'Usuario no encontrado');
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const { displayName, priceQualityPreference } = req.body;
    const user = await updateUser(req.user.id, { displayName, priceQualityPreference });
    if (!user) throw new ApiError(404, 'Usuario no encontrado');
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
