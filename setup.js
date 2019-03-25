/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
require('dotenv').config();

const fs = require('fs');
const util = require('util');
const faker = require('faker');

const { query } = require('./db');

const connectionString = process.env.DATABASE_URL;

const readFileAsync = util.promisify(fs.readFile);

async function main() {
  console.info(`Set upp gagnagrunn á ${connectionString}`);
  // droppa töflum ef til
  await query('DROP TABLE IF EXISTS Order_items');
  await query('DROP TABLE IF EXISTS Orders');
  await query('DROP TABLE IF EXISTS Products');
  await query('DROP TABLE IF EXISTS Users');
  await query('DROP TABLE IF EXISTS Categories');
  console.info('Töflum eytt');

  // búa til töflur út frá skema
  try {
    const createTable = await readFileAsync('./schema.sql');
    await query(createTable.toString('utf8'));
    console.info('Töflur búnar til');
  } catch (e) {
    console.error('Villa við að búa til töflur:', e.message);
    return;
  }

  const categories = [];
  while (categories.length < 12) {
    const value = faker.commerce.department();
    if (categories.indexOf(value) === -1) {
      categories.push(value);
    }
  }

  for (const category of categories) {
    try {
      await query('INSERT INTO Categories (name) VALUES ($1)', [category]);
      console.info(`Bætt við flokk: ${category}`);
    } catch (e) {
      console.error('Villa við að bæta gögnum við:', e.message);
    }
  }

  const products = [];
  const prodNames = [];
  while (products.length < 200) {
    const prodName = faker.commerce.productName();
    const prodPrice = parseInt(faker.commerce.price(), 10);
    const prodDesc = faker.lorem.paragraphs();
    const prodImg = `img/img${Math.floor(Math.random() * 20)}.jpg`;
    const prodCat = categories[Math.floor(Math.random() * categories.length)];
    if (prodNames.indexOf(prodName) === -1) {
      prodNames.push(prodName);
      products.push([prodName, prodPrice, prodDesc, prodImg, prodCat]);
    }
  }

  for (const product of products) {
    try {
      await query('INSERT INTO Products (name, price, descr, img, category) VALUES ($1, $2, $3, $4, $5)', product);
    } catch (e) {
      console.error('Villa við að bæta gögnum við:', e.message);
    }
  }

  // bæta færslum við töflur
  try {
    const insert = await readFileAsync('./insert.sql');
    await query(insert.toString('utf8'));
    console.info('Gögnum bætt við');
  } catch (e) {
    console.error('Villa við að bæta gögnum við:', e.message);
  }
}


main().catch((err) => {
  console.error(err);
});
