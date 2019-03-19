const { findById, updateUser } = require('../users');
const { query } = require('../db');

// leyfum abstraction sem users.js gefur okkur að leka aðeins hérna
async function productsRoute(req, res) {
  const products = await query('SELECT * FROM Products');
  console.info(products);

  return res.json(products.rows);
}

async function createProductRoute(req, res) {
  const {
    name, price, descr, category,
  } = req.body;

  /*
  const validationMessage = await validateProducts({ name, price, descr, category });

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }
  */
  const q = `
    INSERT INTO
      products (name, price, descr, category)
    VALUES
      ($1, $2, $3, $4)
    RETURNING *`;

  const result = await query(q, [name, price, descr, category]);
  console.log(result);

  return res.status(201).json(result);
}


module.exports = {
  productsRoute,
  createProductRoute,
};
