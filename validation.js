const users = require('./users');
require('dotenv').config();

const COMMONPASSWORDS = process.env.COMMONPASSWORDS.split(' ');

const isEmpty = s => s != null && !s;

async function validateUser({ username, password, email }, patch = false) {
  const validationMessages = [];

  // can't patch username
  if (!patch) {
    const m = 'Username is required, must be at least three letters and no more than 32 characters';
    if (typeof username !== 'string' || username.length < 3 || username.length > 32) {
      validationMessages.push({ field: 'username', message: m });
    }

    const user = await users.findByUsername(username);

    if (user) {
      validationMessages.push({
        field: 'username',
        message: 'Username is already registered',
      });
    }
  }

  if (!patch || password || isEmpty(password)) {
    if (typeof password !== 'string' || password.length < 8) {
      validationMessages.push({
        field: 'password',
        message: 'Password must be at least eight letters',
      });
    }
    else {
      for (let i = 0; i < COMMONPASSWORDS.length; i += 1) {
        if (password === COMMONPASSWORDS[i]) {
          validationMessages.push({
            field: 'password',
            message: 'This password is common and therefore insecure, please pick another.',
          });
          break;
        }
      }
    }
  }

  if (!patch || email || isEmpty(email)) {
    if (typeof email !== 'string' || email.length === 0 || email.length > 64) {
      validationMessages.push({
        field: 'email',
        message: 'Email is required, must not be empty or longer than 64 characters',
      });
    }
  }

  return validationMessages;
}

module.exports = {
  validateUser,
};
