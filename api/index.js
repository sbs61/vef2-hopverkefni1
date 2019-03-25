const express = require('express');

const router = express.Router();
const { requireAuth, requireAdmin } = require('../auth');

const {
  usersRoute,
  userRoute,
  userPatchRoute,
  meRoute,
  mePatchRoute,
} = require('./users');

const {
  productsRoute,
  productRoute,
  productPatchRoute,
  productDeleteRoute,
  createProductRoute,
  categoryRoute,
  createCategoryRoute,
  categoryPatchRoute,
  categoryDeleteRoute,
} = require('./products');

const {
  cartRoute,
  cartPostRoute,
  cartLineRoute,
  cartLinePatchRoute,
  cartLineDeleteRoute,
  orderPostRoute,
  ordersRoute,
  orderRoute,
} = require('./cart');

function catchErrors(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}


/**
 * Display all projects in database with GET request
 * @param {Object} req Express request object
 * @param {Obhect} res Express response object
 */
async function listRoute(req, res) {
  const list = {
    PossibleMethods: [
      {
        Users: [
          {
            '/users': 'GET',
            '/users/:id': 'GET, PATCH',
            '/users/register': 'POST',
            '/users/login': 'POST',
            '/users/me': 'GET, PATCH',
          },
        ],
        Products: [
          {
            '/products': 'GET, POST',
            '/products?category={category}': 'GET',
            '/products?search={query}': 'GET,',
            '/products/:id': 'GET, PATCH, DELETE',
            '/categories': 'GET, POST',
            '/categories/:id': 'PATCH, DELETE',
          },
        ],
        'Cart/Orders': [
          {
            '/cart': 'GET, POST',
            '/cart/line/:id': 'GET, PATCH, DELETE',
            '/orders': 'GET, POST',
            '/orders/:id': 'GET, PATCH, DELETE',
          },
        ],
      },
    ],

  };

  return res.status(200).json(list);
}

router.get('/', catchErrors(listRoute));
router.get('/users', requireAuth, catchErrors(usersRoute));
router.get('/users/me', requireAuth, catchErrors(meRoute));
router.get('/users/:id', requireAuth, catchErrors(userRoute));
router.patch('/users/:id', requireAdmin, catchErrors(userPatchRoute));
router.patch('/users/me', requireAuth, catchErrors(mePatchRoute));
router.get('/products', requireAuth, catchErrors(productsRoute));
router.get('/products/:id', requireAuth, catchErrors(productRoute));
router.patch('/products/:id', requireAdmin, catchErrors(productPatchRoute));
router.delete('/products/:id', requireAuth, catchErrors(productDeleteRoute));
router.post('/products', requireAdmin, catchErrors(createProductRoute));
router.get('/categories', catchErrors(categoryRoute));
router.post('/categories', requireAdmin, catchErrors(createCategoryRoute));
router.patch('/categories/:id', requireAdmin, catchErrors(categoryPatchRoute));
router.delete('/categories/:id', requireAdmin, catchErrors(categoryDeleteRoute));
router.get('/cart', requireAuth, catchErrors(cartRoute));
router.post('/cart', requireAuth, catchErrors(cartPostRoute));
router.get('/cart/line/:id', requireAuth, catchErrors(cartLineRoute));
router.patch('/cart/line/:id', requireAuth, catchErrors(cartLinePatchRoute));
router.delete('/cart/line/:id', requireAuth, catchErrors(cartLineDeleteRoute));
router.post('/orders', requireAuth, catchErrors(orderPostRoute));
router.get('/orders', requireAuth, catchErrors(ordersRoute));
router.get('/orders/:id', requireAuth, catchErrors(orderRoute));
module.exports = router;
