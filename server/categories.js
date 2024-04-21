import express from "express"
import * as db from "./../db/index.js"

const categoriesRouter = express.Router()

categoriesRouter.get("/categories", async (request, response) => {
   try {
      const result = await db.query("SELECT * FROM categories")
      response.send(result.rows)
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

categoriesRouter.get("/categories/:id", async (request, response) => {
   try {
      const result = await db.query(
         "SELECT items.id, items.name, description, image_path, categories.name as category, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id WHERE categories.id = $1",
         [request.params.id]
      )
      response.send(result.rows)
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

export default categoriesRouter
