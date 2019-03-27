
const { Client } = require('pg');

/**
 * Execute an SQL query.
 *
 * @param {string} sqlQuery - SQL query to execute
 * @param {array} [values=[]] - Values for parameterized query
 *
 * @returns {Promise} Promise representing the result of the SQL query
 */
async function query(sqlQuery, values = []) {
  const connectionString = process.env.DATABASE_URL;

  const client = new Client({ connectionString });
  await client.connect();

  let result;

  try {
    result = await client.query(sqlQuery, values);
  } catch (err) {
    console.error('Error executing query', err);
    throw err;
  } finally {
    await client.end();
  }

  return result;
}

// Birtir síður með limit of offset
async function paged(sqlQuery, {
  slug = '', offset = 0, limit = 10, values = [], qString = '',
}) {
  const sqlLimit = values.length + 1;
  const sqlOffset = values.length + 2;
  const pagedQuery = `${sqlQuery} LIMIT $${sqlLimit} OFFSET $${sqlOffset}`;

  const limitAsNumber = Number(limit);
  const offsetAsNumber = Number(offset);

  const cleanLimit = Number.isInteger(limitAsNumber) && limitAsNumber > 0 ? limitAsNumber : 10;
  const cleanOffset = Number.isInteger(offsetAsNumber) && offsetAsNumber > 0 ? offsetAsNumber : 0;

  const combinedValues = values.concat([cleanLimit, cleanOffset]);

  const result = await query(pagedQuery, combinedValues);

  const nextOffset = parseInt(offset, 10) + 10;

  const cleanSlug = ((slug).split('?')[0]);

  let urls;

  // Ef niðurstaða skilar fleiri en 10 línum, gefum hlekk á næstu síðu
  if (result.rows.length >= 10) {
    urls = {
      self: `http://127.0.0.1:3000${cleanSlug}?offset=${offset}&limit=${limit}${qString}`,
      next: `http://127.0.0.1:3000${cleanSlug}?offset=${nextOffset}&limit=${limit}${qString}`,
    };
  } else {
    urls = { self: `http://127.0.0.1:3000${cleanSlug}?offset=${offset}&limit=${limit}${qString}` };
  }
  return {
    limit: cleanLimit,
    offset: cleanOffset,
    items: result.rows,
    _links: urls,
  };
}

async function conditionalUpdate(table, id, fields, values) {
  const filteredFields = fields.filter(i => typeof i === 'string');
  const filteredValues = values.filter(i => typeof i === 'string' || typeof i === 'number');

  if (filteredFields.length === 0) {
    return false;
  }

  if (filteredFields.length !== filteredValues.length) {
    throw new Error('fields and values must be of equal length');
  }

  // id is field = 1
  const updates = filteredFields.map((field, i) => `${field} = $${i + 2}`);

  const q = `
    UPDATE ${table}
      SET ${updates.join(', ')}
    WHERE
      id = $1
    RETURNING *
    `;

  const result = await query(q, [id].concat(filteredValues));

  return result;
}

module.exports = {
  query,
  paged,
  conditionalUpdate,
};
