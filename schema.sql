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
  category TEXT,
  FOREIGN KEY category REFERENCES Categories (name)
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
  isorder BOOLEAN DEFAULT FALSE,
  created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  order_user VARCHAR(128),
  FOREIGN KEY order_user REFERENCES Users (username)
);

CREATE TABLE Order_items (
  product_no INT,
  order_id INT,
  quantity INT,
  PRIMARY KEY(product_no, order_id),
  FOREIGN KEY (product_no) REFERENCES Products (id),
  FOREIGN KEY (order_id) REFERENCES Orders (id)
);