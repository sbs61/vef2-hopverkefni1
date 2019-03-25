/* eslint-disable no-await-in-loop */
const { query } = require('../db');
const { validateCart } = require('../validation');

async function cartRoute(req, res) {
  const { id } = req.user;
  const message = [];

  let totalPrice = 0;
  let userOrderId = await query('SELECT id from Orders WHERE order_userId = $1 AND is_order = false', [id]);
  if (userOrderId.rows.length === 0) {
    return res.status(404).json({ error: 'Cart not found' });
  }
  userOrderId = userOrderId.rows[0].id;

  const result = await query('SELECT * FROM Order_items WHERE order_id = $1', [userOrderId]);

  for (let i = 0; i < result.rows.length; i += 1) {
    const productId = result.rows[i].product_no;
    const product = await query('SELECT * FROM Products WHERE id = $1', [productId]);
    const productPrice = product.rows[0].price;
    const productName = product.rows[0].name;
    const productQuantity = result.rows[i].quantity;

    totalPrice += productPrice * productQuantity;

    message.push({
      'Product Name': productName,
      Quantity: productQuantity,
      Price: productPrice,
    });
  }

  message.push({
    'Total Price': totalPrice,
  });

  return res.status(200).json(message);
}

async function cartPostRoute(req, res) {
  const { productId, quantity } = req.body;
  const { id } = req.user;

  const validationMessage = await validateCart({
    productId, quantity,
  });

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  let orderId = await query('SELECT id FROM Orders WHERE order_userId = $1 AND is_order = false', [id]);
  if (orderId.rows.length === 0) {
    console.info('Karfa ekki til');

    const q = `
      INSERT INTO
        Orders (order_userId)
      VALUES
        ($1)`;

    await query(q, [id]);

    console.info('Karfa búin til');
  }

  const q2 = `
      INSERT INTO
        Order_items (product_no, order_id, quantity)
      VALUES
        ($1, $2, $3)
      RETURNING *`;

  orderId = await query('SELECT id FROM Orders WHERE order_userId = $1 AND is_order = false', [id]);
  orderId = orderId.rows[0].id;
  const result = await query(q2, [productId, orderId, quantity]);

  return res.status(200).json(result.rows[0]);
}

async function cartLineRoute(req, res) {
  const { id } = req.user;
  const lineNr = req.params.id - 1;
  const message = [];

  if (!Number.isInteger(Number(lineNr))) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  const userOrderId = await query('SELECT id from Orders WHERE order_userId = $1', [id]);

  if (userOrderId.rows.length === 0) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  const result = await query('SELECT * FROM Order_items WHERE order_id = $1', [userOrderId.rows[0].id]);
  if (result.rows[lineNr] === undefined) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  const productId = result.rows[lineNr].product_no;
  const product = await query('SELECT * FROM Products WHERE id = $1', [productId]);
  const productPrice = product.rows[0].price;
  const productName = product.rows[0].name;
  const productQuantity = result.rows[lineNr].quantity;

  message.push({
    'Product Name': productName,
    Quantity: productQuantity,
    Price: productPrice,
  });

  return res.status(200).json(message[0]);
}

async function cartLinePatchRoute(req, res) {
  const { id } = req.user;
  const { quantity } = req.body;
  const lineNr = req.params.id - 1;

  if (!Number.isInteger(Number(quantity))) {
    return res.status(404).json({ error: 'Quantity must be an integer' });
  }

  if (!Number.isInteger(Number(lineNr))) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  let userOrderId = await query('SELECT id from Orders WHERE order_userId = $1', [id]);
  userOrderId = userOrderId.rows[0].id;

  const check = await query('SELECT * FROM Order_items WHERE order_id = $1', [userOrderId]);
  if (check.rows[lineNr] === undefined) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  const q = `
    UPDATE Order_items
      SET quantity = $1
    WHERE 
      id IN (
          SELECT id
          FROM Order_items
          LIMIT 1 OFFSET $2
      )
    RETURNING *`;

  const result = await query(q, [quantity, lineNr]);

  return res.status(200).json(result.rows[0]);
}

async function cartLineDeleteRoute(req, res) {
  const { id } = req.user;
  const lineNr = req.params.id - 1;

  if (!Number.isInteger(Number(lineNr))) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  let userOrderId = await query('SELECT id from Orders WHERE order_userId = $1', [id]);
  userOrderId = userOrderId.rows[0].id;

  const check = await query('SELECT * FROM Order_items WHERE order_id = $1', [userOrderId]);
  if (check.rows[lineNr] === undefined) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  const q = `
      DELETE FROM Order_items
      WHERE 
        id IN (
            SELECT id
            FROM Order_items
            LIMIT 1 OFFSET $1
        )
      RETURNING *`;

  await query(q, [lineNr]);

  return res.status(200).json('Cart line deleted');
}

async function orderPostRoute(req, res) {
  const { id } = req.user;

  const orderId = await query('SELECT id FROM Orders WHERE order_userId = $1 AND is_order = false', [id]);
  if (orderId.rows.length === 0) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const q = `
        UPDATE Orders
          SET is_order = TRUE
        WHERE order_userId = $1
        RETURNING *`;

  const result = await query(q, [id]);

  return res.status(200).json(result.rows[0]);
}

async function ordersRoute(req, res) {
  const { id, admin } = req.user;
  let orders = [];
  if (admin) {
    orders = await query('SELECT * FROM Orders WHERE is_order = TRUE ORDER BY created desc');
  } else {
    orders = await query('SELECT * FROM Orders WHERE is_order = TRUE AND order_userId = $1 ORDER BY created desc', [id]);
  }

  if (orders.rows.length === 0) {
    return res.status(404).json({ error: 'Orders not found' });
  }

  return res.status(200).json(orders.rows);
}

async function orderRoute(req, res) {
  const { id, admin } = req.user;
  const orderId = req.params.id;

  if (!Number.isInteger(Number(orderId))) {
    return res.status(404).json({ error: 'Order not found' });
  }

  let order = [];

  if (admin) {
    order = await query('SELECT * FROM Order_items WHERE order_id = $1', [orderId]);
  } else {
    const q = `
    SELECT *
    FROM Order_items
    WHERE order_id = $1 AND
    order_id IN (
        SELECT id FROM Orders
        WHERE order_userId = $2
    )`;
    order = await query(q, [orderId, id]);
  }

  if (order.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const message = [];

  let totalPrice = 0;

  for (let i = 0; i < order.rows.length; i += 1) {
    const productId = order.rows[i].product_no;
    const product = await query('SELECT * FROM Products WHERE id = $1', [productId]);
    const productPrice = product.rows[0].price;
    const productName = product.rows[0].name;
    const productQuantity = order.rows[i].quantity;

    totalPrice += productPrice * productQuantity;

    message.push({
      'Product Name': productName,
      Quantity: productQuantity,
      Price: productPrice,
    });
  }

  message.push({
    'Total Price': totalPrice,
  });

  return res.status(200).json(message);
}


module.exports = {
  cartRoute,
  cartPostRoute,
  cartLineRoute,
  cartLinePatchRoute,
  cartLineDeleteRoute,
  orderPostRoute,
  ordersRoute,
  orderRoute,
};
