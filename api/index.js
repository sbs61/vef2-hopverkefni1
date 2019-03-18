const express = require('express');

/*
const {
  list,
  update,
  getOne,
  createNew,
  deleteProject,
} = require('./todos');
*/

const router = express.Router();

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
    PossibleMethods: [ // accounting is an array in employees.
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
    ], // End "accounting" array.

  }; // End Employees

  return res.status(200).json(list);
}

router.get('/', catchErrors(listRoute));

module.exports = router;
