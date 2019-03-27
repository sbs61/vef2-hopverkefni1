const cloudinary = require('cloudinary');
const multer = require('multer');

const xss = require('xss');
const { query, paged, conditionalUpdate } = require('../db');
const { validateProduct, validateCategory } = require('../validation');

const uploads = multer({ dest: './temp' });

const {
  CLOUDINARY_CLOUD,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

if (!CLOUDINARY_CLOUD || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn('Missing cloudinary config, uploading images will not work');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

async function productsRoute(req, res) {
  const {
    offset, limit, category, search,
  } = req.query;
  let filter = '';
  let qString = '';
  const values = [];

  const slug = req.url;
  if (category != null && search == null) {
    filter = 'WHERE category = $1';
    qString = `&category=${category}`;
    values.push(category);
  } else if (category == null && search != null) {
    filter = 'WHERE name LIKE $1 OR descr LIKE $1';
    qString = `&search=${search}`;
    values.push(`%${search}%`);
  } else if (category != null && search != null) {
    filter = 'WHERE category = $1 AND (name LIKE $2 OR descr LIKE $2)';
    qString = `&category=${category}&search=${search}`;
    values.push(category);
    values.push(`%${search}%`);
  }

  const q = `SELECT * FROM Products ${filter} ORDER BY created desc`;
  const products = await paged(q, {
    slug, offset, limit, values, qString,
  });
  return res.status(200).json(products);
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
  const { file: { path } = {} } = req;

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const product = await query('SELECT * FROM Products WHERE id = $1', [id]);

  if (product.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }


  if (path) {
    let upload = null;

    try {
      upload = await cloudinary.v2.uploader.upload(path);
    } catch (error) {
      if (error.http_code && error.http_code === 400) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(400).json({ error: 'Unable to upload file to cloudinary:', path });
    }

    const q = 'UPDATE products SET img = $1 WHERE id = $2 RETURNING *';

    await query(q, [upload.secure_url, id]);

    const result = await query('SELECT * FROM Products WHERE id = $1', [id]);

    return res.status(201).json(result.rows[0]);
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

  await query('UPDATE Products SET updated = CURRENT_TIMESTAMP WHERE id = $1', [id]);

  return res.status(201).json(result.rows[0]);
}

async function picRoute(req, res, next) {
  uploads.single('img')(req, res, (err) => {
    if (err) {
      if (err.message === 'Unexpected field') {
        return res.status(400).json({ error: 'File key must be "img"' });
      }
      return next(err);
    }

    return productPatchRoute(req, res, next);
  });
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

  return res.json(result);
}

async function categoryRoute(req, res) {
  const { offset, limit } = req.query;
  const slug = req.url;
  const result = await paged('SELECT * from categories ORDER BY id', { offset, limit, slug });

  if (result.items.length === 0) {
    return res.status(404).json({ error: 'Categories not found' });
  }

  return res.json(result);
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

  if (!Number.isInteger(Number(id))) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const category = await query('SELECT * FROM categories WHERE id = $1', [id]);

  if (category.rowCount === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }

  await query('DELETE FROM categories WHERE id = $1', [id]);

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
  picRoute,
};
