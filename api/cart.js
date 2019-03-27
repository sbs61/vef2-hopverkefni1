/* eslint-disable no-await-in-loop */
const { query, paged } = require('../db');
const { validateCart, validateOrder } = require('../validation');

async function cartRoute(req, res) {
  const { id } = req.user;

  let totalPrice = 0;
  const order = await query('SELECT * from Orders WHERE order_userId = $1 AND is_order = false', [id]);
  if (order.rows.length === 0) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const userOrderId = order.rows[0].id;

  const result = await query('SELECT * FROM Order_items WHERE order_id = $1 order by created desc', [userOrderId]);

  order.rows[0].lines = [];
  for (let i = 0; i < result.rows.length; i += 1) {
    const productId = result.rows[i].product_no;
    const product = await query('SELECT * FROM Products WHERE id = $1', [productId]);
    const productPrice = product.rows[0].price;
    const productQuantity = result.rows[i].quantity;

    totalPrice += productPrice * productQuantity;

    order.rows[0].lines.push(product.rows[0]);
    order.rows[0].lines[i].quantity = productQuantity;
    order.rows[0].lines[i].total = productPrice * productQuantity;
  }

  order.rows[0].total = totalPrice;

  delete order.rows[0].name;
  delete order.rows[0].address;


  return res.status(200).json(order.rows[0]);
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

  await query('UPDATE Orders SET updated = CURRENT_TIMESTAMP WHERE id = $1', [orderId]);

  const result = await query(q2, [productId, orderId, quantity]);

  return res.status(200).json(result.rows[0]);
}

async function cartLineRoute(req, res) {
  const { id } = req.user;
  const lineNr = req.params.id - 1;

  if (!Number.isInteger(Number(lineNr))) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  const userOrderId = await query('SELECT id from Orders WHERE order_userId = $1', [id]);

  if (userOrderId.rows.length === 0) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  const result = await query('SELECT * FROM Order_items WHERE order_id = $1 ORDER BY created desc', [userOrderId.rows[0].id]);
  if (result.rows[lineNr] === undefined) {
    return res.status(404).json({ error: 'Cart line not found' });
  }

  const productId = result.rows[lineNr].product_no;
  const product = await query('SELECT * FROM Products WHERE id = $1', [productId]);
  const productPrice = product.rows[0].price;
  const productQuantity = result.rows[lineNr].quantity;

  product.rows[0].quantity = productQuantity;
  product.rows[0].total = productPrice * productQuantity;

  return res.status(200).json(product.rows[0]);
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
          FROM Order_items ORDER BY created desc
          LIMIT 1 OFFSET $2
      )
    RETURNING *`;

  await query('UPDATE Orders SET updated = CURRENT_TIMESTAMP WHERE id = $1', [userOrderId]);

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
            FROM Order_items ORDER BY created desc
            LIMIT 1 OFFSET $1
        )
      RETURNING *`;

  await query(q, [lineNr]);

  return res.status(200).json('Cart line deleted');
}

async function orderPostRoute(req, res) {
  const { id } = req.user;
  const { name, address } = req.body;

  const orderId = await query('SELECT id FROM Orders WHERE order_userId = $1 AND is_order = false', [id]);
  if (orderId.rows.length === 0) {
    return res.status(404).json({ error: 'Cart not found' });
  }

  const validationMessage = await validateOrder({
    name, address,
  });

  if (validationMessage.length > 0) {
    return res.status(400).json({ errors: validationMessage });
  }

  const q = `
        UPDATE Orders
          SET is_order = TRUE, name = $1, address = $2
        WHERE order_userId = $3
        RETURNING *`;

  const result = await query(q, [name, address, id]);

  return res.status(200).json(result.rows[0]);
}

async function ordersRoute(req, res) {
  const { offset = 0, limit = 10 } = req.query;
  const { id, admin } = req.user;
  const values = id;
  let orders = [];
  if (admin) {
    orders = await paged('SELECT * FROM Orders WHERE is_order = TRUE ORDER BY created desc', { offset, limit });
  } else {
    orders = await paged('SELECT * FROM Orders WHERE is_order = TRUE AND order_userId = $1 ORDER BY created desc', { offset, limit, values });
  }

  if (orders.items.length === 0) {
    return res.status(404).json({ error: 'Orders not found' });
  }

  return res.status(200).json(orders);
}

async function orderRoute(req, res) {
  const { id, admin } = req.user;
  const orderId = req.params.id;

  if (!Number.isInteger(Number(orderId))) {
    return res.status(404).json({ error: 'Order not found' });
  }

  let order = [];

  if (admin) {
    order = await query('SELECT * FROM Orders WHERE id = $1', [orderId]);
  } else {
    const q = `
    SELECT *
    FROM Orders
    WHERE id = $1 AND
    id IN (
        SELECT id FROM Orders
        WHERE order_userId = $2
    )`;
    order = await query(q, [orderId, id]);
  }

  if (order.rows.length === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const orderItems = await query('SELECT * FROM Order_items WHERE order_id = $1', [orderId]);

  let totalPrice = 0;

  order.rows[0].lines = [];
  for (let i = 0; i < orderItems.rows.length; i += 1) {
    const productId = orderItems.rows[i].product_no;
    const product = await query('SELECT * FROM Products WHERE id = $1', [productId]);
    const productPrice = product.rows[0].price;
    const productQuantity = orderItems.rows[i].quantity;

    totalPrice += productPrice * productQuantity;

    product.rows[0].quantity = productQuantity;
    product.rows[0].total = productPrice * productQuantity;

    order.rows[0].lines.push(product.rows[0]);
  }

  order.rows[0].total = totalPrice;

  return res.status(200).json(order.rows[0]);
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
