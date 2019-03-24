const xss = require('xss');
const { query, conditionalUpdate } = require('../db');
const { validateProduct } = require('../validation');


async function productsRoute(req, res) {
  const { category, search } = req.query;
  let filter = '';
  const items = [];

  if (category != null && search == null) {
    filter = 'WHERE category = $1';
    items.push(category);
  } else if (category == null && search != null) {
    filter = 'WHERE name LIKE $1 OR descr LIKE $1';
    items.push(`%${search}%`);
  } else if (category != null && search != null) {
    filter = 'WHERE category = $1 AND (name LIKE $2 OR descr LIKE $2)';
    items.push(category);
    items.push(`%${search}%`);
  }

  const q = `SELECT * FROM Products ${filter} ORDER BY created desc`;
  const products = await query(q, items);
  return res.status(200).json(products.rows);
}

async function productRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = await query('SELECT * FROM Products WHERE id = $1', [id]);

  if (product.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  return res.status(200).json(product.rows);
}

async function productPatchRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = await query('SELECT * FROM Products WHERE id = $1', [id]);

  if (product.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const validationMessage = await validateProduct(req.body, id, true);

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const isset = f => typeof f === 'string' || typeof f === 'number';

  const fields = [
    isset(req.body.name) ? 'name' : null,
    isset(req.body.price) ? 'price' : null,
    isset(req.body.descr) ? 'descr' : null,
    isset(req.body.category) ? 'category' : null,
  ];

  const values = [
    isset(req.body.name) ? xss(req.body.name) : null,
    isset(req.body.price) ? xss(req.body.price) : null,
    isset(req.body.descr) ? xss(req.body.descr) : null,
    isset(req.body.category) ? xss(req.body.category) : null,
  ];

  const result = await conditionalUpdate('Products', id, fields, values);

  if (!result) {
    return res.status(400).json({ error: 'Nothing to patch' });
  }

  return res.status(201).json(result.rows[0]);
}

async function productDeleteRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = await query('SELECT * FROM Products WHERE id = $1', [id]);

  if (product.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  query('DELETE FROM Products WHERE id = $1', [id]);

  return res.status(200).json('Product deleted');
}

async function createProductRoute(req, res) {
  const {
    name, price, descr, category,
  } = req.body;

  const validationMessage = await validateProduct({
    name, price, descr, category,
  });

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const q = `
    INSERT INTO
      products (name, price, descr, category)
    VALUES
      ($1, $2, $3, $4)
    RETURNING *`;

  const result = await query(q, [name, price, descr, category]);
  console.info(result);

  return res.status(201).json(result.rows);
}


module.exports = {
  productsRoute,
  productRoute,
  productPatchRoute,
  productDeleteRoute,
  createProductRoute,
};
