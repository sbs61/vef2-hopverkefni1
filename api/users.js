const { findById, updateUser } = require('../users');
const { query, paged } = require('../db');
const { validateUser } = require('../validation');

// leyfum abstraction sem users.js gefur okkur að leka aðeins hérna
async function usersRoute(req, res) {
  const { offset = 0 } = req.query;
  const users = await paged('SELECT * FROM users', { offset });

  users.items.map((i) => {
    delete i.password; // eslint-disable-line
    return i;
  });

  return res.json(users);
}

module.exports = {
  usersRoute,
};
