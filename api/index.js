const express = require('express');

const router = express.Router();
const { requireAuth } = require('../auth');

const {
  usersRoute,
  userRoute,
  userPatchRoute,
  meRoute,
  mePatchRoute,
} = require('./users');

const {
  productsRoute,
  createProductRoute,
} = require('./products');

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
router.patch('/users/:id', requireAuth, catchErrors(userPatchRoute));
router.patch('/users/me', requireAuth, catchErrors(mePatchRoute));
router.get('/products', requireAuth, catchErrors(productsRoute));
router.post('/products', requireAuth, catchErrors(createProductRoute));

module.exports = router;
