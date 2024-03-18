import express from "express";
import * as db from "./db/index.js";

const app = express();

const port = "8001";

app.listen(port, () => {
  console.log(`Successfull connection to ${port}...`);
});

// TO GET THE ITEMS
app.get("/items", async (request, response) => {
  const result = await db.query(
    "SELECT items.id, items.name, description, categories.name, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id"
  );
  response.send(result.rows);
});

app.get("/discountedItems", async (request, response) => {
  const result = await db.query(
    "SELECT items.id, items.name, description, categories.name, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id WHERE discount > 0"
  );
  response.send(result.rows);
});

app.get("/items/:id", async (request, response) => {
  const result = await db.query(
    "SELECT items.id, items.name, description, categories.name, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id WHERE items.id = $1",
    [request.params.id]
  );
  response.send(result.rows);
});

app.get("/categories", async (request, response) => {
  const result = await db.query("SELECT * FROM categories");
  response.send(result.rows);
});

app.get("/categories/:id", async (request, response) => {
  const result = await db.query(
    "SELECT items.id, items.name, description, categories.name, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id WHERE categories.id = $1",
    [request.params.id]
  );
  response.send(result.rows);
});

// CART/ACCOUNT
app.put("", (request, response) => {});

app.post("/register", async (request, response) => {
  const { username, password } = request.body;
  const findUser = await db.query("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  if (findUser.rows.length === 0) {
    await db.query("INSERT INTO users(username, password) VALUES($1, $2)", [
      username,
      password,
    ]);
    response.status(201).send();
  } else {
    response.status(400).send();
  }
});

app.delete("", (request, response) => {});
