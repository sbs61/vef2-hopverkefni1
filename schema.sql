CREATE TABLE Categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) UNIQUE NOT NULL
);

CREATE TABLE Products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) UNIQUE NOT NULL,
  price INT NOT NULL,
  descr TEXT NOT NULL,
  img VARCHAR(128),
  created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  category TEXT,
  FOREIGN KEY (category) REFERENCES Categories(name) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE Users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(128) UNIQUE NOT NULL,
  password VARCHAR(128) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE Orders (
  id SERIAL PRIMARY KEY,
  is_order BOOLEAN DEFAULT FALSE,
  name TEXT,
  address TEXT,
  created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  order_userId INT,
  FOREIGN KEY (order_userId) REFERENCES Users (id)
);

CREATE TABLE Order_items (
  id SERIAL PRIMARY KEY,
  product_no INT,
  order_id INT,
  quantity INT,
  created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_no) REFERENCES Products (id),
  FOREIGN KEY (order_id) REFERENCES Orders (id)
);