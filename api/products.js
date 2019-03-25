const xss = require('xss');
const { query, paged, conditionalUpdate } = require('../db');
const { validateProduct, validateCategory } = require('../validation');


async function productsRoute(req, res) {
  const {
    offset = 0, limit = 10, category, search,
  } = req.query;
  let filter = '';
  const values = [];

  if (category != null && search == null) {
    filter = 'WHERE category = $1';
    values.push(category);
  } else if (category == null && search != null) {
    filter = 'WHERE name LIKE $1 OR descr LIKE $1';
    values.push(`%${search}%`);
  } else if (category != null && search != null) {
    filter = 'WHERE category = $1 AND (name LIKE $2 OR descr LIKE $2)';
    values.push(category);
    values.push(`%${search}%`);
  }

  const q = `SELECT * FROM Products ${filter} ORDER BY created desc`;
  const products = await paged(q, { offset, limit, values });
  return res.status(200).json(products.items);
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

  return res.status(200).json(product.rows[0]);
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

  return res.json(result);
}

async function categoryRoute(req, res) {
  const result = await query('SELECT * from categories');
  console.info(result);

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Categories not found' });
  }

  return res.json(result.rows);
}

async function createCategoryRoute(req, res) {
  const {
    name,
  } = req.body;

  const validationMessage = await validateCategory({
    name,
  });

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const q = `
    INSERT INTO
      categories (name)
    VALUES
      ($1)
    RETURNING *`;

  const result = await query(q, [name]);
  console.info(result);

  return res.status(201).json(result.rows);
}

async function categoryPatchRoute(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const category = await query('SELECT * FROM categories WHERE id = $1', [id]);

  if (category.rowCount === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const validationMessage = await validateProduct(req.body, id, true);

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const isset = f => typeof f === 'string' || typeof f === 'number';

  const fields = [
    isset(req.body.name) ? 'name' : null,
  ];

  const values = [
    isset(req.body.name) ? xss(req.body.name) : null,
  ];

  // Ath. hvort nafn sé nú þegar í gagnagrunn
  const nameChecker = await query('SELECT 1 FROM categories WHERE name = $1', values);
  if (nameChecker.rowCount === 1) {
    return res.status(400).json({ error: 'Category name already exists' });
  }

  const result = await conditionalUpdate('categories', id, fields, values);

  if (!result) {
    return res.status(400).json({ error: 'Nothing to patch' });
  }

  return res.status(201).json(result.rows[0]);
}

async function categoryDeleteRoute(req, res) {
  const { id } = req.params;
  console.info(id);
  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const category = await query('SELECT * FROM categories WHERE id = $1', [id]);

  if (category.rowCount === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }

  query('DELETE FROM categories WHERE id = $1', [id]);

  return res.status(200).json('Category deleted');
}

module.exports = {
  productsRoute,
  productRoute,
  productPatchRoute,
  productDeleteRoute,
  createProductRoute,
  categoryRoute,
  createCategoryRoute,
  categoryPatchRoute,
  categoryDeleteRoute,
};
