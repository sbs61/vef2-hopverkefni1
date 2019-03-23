const bcrypt = require('bcrypt');
const xss = require('xss');
const { query, conditionalUpdate } = require('./db');

async function comparePasswords(password, hash) {
  const result = await bcrypt.compare(password, hash);

  return result;
}

async function findByUsername(username) {
  const q = 'SELECT * FROM users WHERE username = $1';

  const result = await query(q, [username]);

  if (result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

async function findByEmail(email) {
  const q = 'SELECT * FROM users WHERE email = $1';

  const result = await query(q, [email]);

  if (result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

async function findById(id) {
  if (!Number.isInteger(Number(id))) {
    return null;
  }

  const q = 'SELECT * FROM users WHERE id = $1';

  const result = await query(q, [id]);

  if (result.rowCount === 1) {
    return result.rows[0];
  }

  return null;
}

async function createUser(username, password, email) {
  const hashedPassword = await bcrypt.hash(password, 11);

  const q = `
    INSERT INTO
      users (username, password, email)
    VALUES
      ($1, $2, $3)
    RETURNING *`;

  const result = await query(q, [xss(username), hashedPassword, xss(email)]);

  return result.rows[0];
}

async function updateUser(id, username, password, email, admin) {
  if (!Number.isInteger(Number(id))) {
    return null;
  }

  const isset = f => typeof f === 'string' || typeof f === 'number' || typeof f === 'boolean';

  const fields = [
    isset(username) ? 'username' : null,
    isset(password) ? 'password' : null,
    isset(email) ? 'email' : null,
    isset(admin) ? 'admin' : null,
  ];

  let hashedPassword = null;

  if (password) {
    hashedPassword = await bcrypt.hash(password, 11);
  }

  const values = [
    isset(username) ? xss(username) : null,
    hashedPassword,
    isset(email) ? xss(email) : null,
    isset(admin) ? xss(admin) : null,
  ];

  if (values[3] === '') {
    values[3] = 'false';
  }

  const result = await conditionalUpdate('users', id, fields, values);

  if (!result) {
    return null;
  }

  return result.rows[0];
}

module.exports = {
  comparePasswords,
  findByUsername,
  findByEmail,
  findById,
  createUser,
  updateUser,
};
