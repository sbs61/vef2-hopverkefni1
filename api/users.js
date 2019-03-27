const { findById, updateUser } = require('../users');
const { paged } = require('../db');
const { validateUser } = require('../validation');

async function usersRoute(req, res) {
  const { offset, limit } = req.query;
  const slug = req.url;
  const users = await paged('SELECT * FROM users', { offset, limit, slug });

  users.items.map((i) => {
    delete i.password; // eslint-disable-line
    return i;
  });

  return res.json(users);
}

async function userRoute(req, res) {
  const { id } = req.params;

  const user = await findById(id);

  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  delete user.password;

  return res.json(user);
}

async function userPatchRoute(req, res) {
  const { id } = req.params;

  const user = await findById(id);

  if (user === null) {
    return res.status(404).json({ error: 'User not found' });
  }

  const {
    username, password, email, admin,
  } = req.body;

  const validationMessage = await validateUser({
    username, password, email, admin,
  }, true);

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const result = await updateUser(id, username, password, email, admin);

  if (!result) {
    return res.status(400).json({ error: 'Nothing to patch' });
  }

  delete result.password;
  return res.status(200).json(result);
}

async function meRoute(req, res) {
  const { id } = req.user;

  const user = await findById(id);

  if (user === null) {
    return res.status(404).json({ error: 'You not found' });
  }

  delete user.password;

  return res.json(user);
}

async function mePatchRoute(req, res) {
  const { id } = req.user;

  const user = await findById(id);

  if (user === null) {
    return res.status(404).json({ error: 'You not found' });
  }

  const { password, email } = req.body;

  const validationMessage = await validateUser({ password, email }, true);

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const result = await updateUser(id, password, email);

  if (!result) {
    return res.status(400).json({ error: 'Nothing to patch' });
  }

  delete result.password;
  return res.status(200).json(result);
}


module.exports = {
  usersRoute,
  userRoute,
  userPatchRoute,
  meRoute,
  mePatchRoute,
};
