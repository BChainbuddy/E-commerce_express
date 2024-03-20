import express from "express"

const itemsRouter = express.Router()

itemsRouter.get("/items", async (request, response) => {
   const result = await db.query(
      "SELECT items.id, items.name, description, categories.name, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id"
   )
   response.send(result.rows)
})

itemsRouter.get("/items/discounted", async (request, response) => {
   const result = await db.query(
      "SELECT items.id, items.name, description, categories.name, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id WHERE discount > 0"
   )
   response.send(result.rows)
})

itemsRouter.get("/items/:id", async (request, response) => {
   const result = await db.query(
      "SELECT items.id, items.name, description, categories.name, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id WHERE items.id = $1",
      [request.params.id]
   )
   response.send(result.rows)
})

export default itemsRouter
