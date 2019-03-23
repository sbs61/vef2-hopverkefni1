const users = require('./users');
const { query } = require('./db');

const invalidField = (s, maxlen) => {
  if (s !== undefined && typeof s !== 'string') {
    return true;
  }

  if (maxlen && s && s.length) {
    return s.length > maxlen;
  }

  return false;
};
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
    if (typeof password !== 'string' || password.length < 6) {
      validationMessages.push({
        field: 'password',
        message: 'Password must be at least six letters',
      });
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

async function validateProduct({
  name,
  price,
  descr,
  category,
} = {}, id = null, patch = false) {
  const messages = [];

  if (!patch || name || isEmpty(name)) {
    if ((typeof name !== 'string' || name.length === 0 || name.length > 255)) {
      messages.push({
        field: 'name',
        message: 'Name is required and must not be empty and no longer than 255 characters',
      });
    }
  }

  if (!patch || name || isEmpty(name)) {
    const product = await query('SELECT * FROM Products WHERE name = $1', [name]);

    // leyfum að uppfæra nafn í sama nafn
    if (product.rows.length > 0 && (Number(product.rows[0].id) !== Number(id))) {
      messages.push({ field: 'name', message: `Product "${name}" already exists` });
    }
  }

  if (!patch || category || isEmpty(category)) {
    const message = category == null
      ? 'Category is required' : `Category with name "${category}" does not exist`;
    const err = { field: 'category', message };

    const catExists = await query('SELECT * FROM Categories WHERE name = $1', [category]);
    if (catExists.rows.length === 0) {
      messages.push(err);
    }
  }

  if (!patch || descr || isEmpty(descr)) {
    if (descr == null) {
      messages.push({
        field: 'description',
        message: 'Description is required',
      });
    } else if (invalidField(descr)) {
      messages.push({ field: 'description', message: 'Description must be a string' });
    }
  }

  if (!patch || price || isEmpty(price)) {
    if (price == null) {
      messages.push({
        field: 'price',
        message: 'Price is required',
      });
    } else if (!(Number.isInteger(Number(price)) && Number(price) > 0)) {
      messages.push({
        field: 'price',
        message: 'Price must be an integer larger than 0',
      });
    }
  }

  return messages;
}

module.exports = {
  validateUser,
  validateProduct,
};
