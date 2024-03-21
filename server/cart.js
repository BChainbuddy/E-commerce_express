import express from "express"
import { ensureAuthenticated } from "../middleWare/authentication.js"
import * as db from "./../db/index.js"

const cartRouter = express.Router()

cartRouter.use("/cart/:username", ensureAuthenticated, async (request, response, next) => {
   // To get cart Id
   try {
      let cartId = await db.query("SELECT id FROM cart WHERE username = $1", [
         request.params.username,
      ])
      if (!cartId) {
         await db.query("INSERT INTO cart(username) VALUES($1)", [username])
         cartId = await db.query("SELECT id FROM cart WHERE username = $1", [
            request.params.username,
         ])
      }
      request.cartId = cartId.rows[0].id
      next()
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

cartRouter.get("/cart/:username", ensureAuthenticated, async (request, response) => {
   try {
      const cartItems = await db.query(
         "SELECT items.id, items.name, cart_items.quantity, prices.price, (prices.price * ((100 - prices.discount) / 100) * cart_items.quantity) as cart_value from  cart_items join items on cart_items.items_id = items_id join prices on items.id = prices.items_id WHERE cart_items.cart_id = $1",
         [request.cartId]
      )
      response.send(cartItems.rows)
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

cartRouter.post("/cart/:username", ensureAuthenticated, async (request, response) => {
   const { itemId, quantity } = request.body
   if (typeof itemId === "number" && typeof quantity === "Number" && quantity > 0) {
      const doesItemExist = await db.query("SELECT id FROM items WHERE id = $1", [itemId])
      if (doesItemExist) {
         try {
            const isInCart = await db.query(
               "SELECT quantity FROM cart_items WHERE cart_id = $1 AND items_id = $2",
               [request.cartId, itemId]
            )
            if (!isInCart.rows) {
               await db.query(
                  "INSERT INTO cart_items(cart_id, items_id, quantity) VALUES($1, $2, $3)",
                  [request.cartId, itemId, quantity]
               )
               response.status(201).send("Added new item successfully!")
            } else {
               response.status(404).send("Item already in the cart")
            }
         } catch (error) {
            console.error(error)
            response.status(500).send("An error occurred.")
         }
      } else {
         response.status(404).send("The item with inputed itemId doesn't exists")
      }
   } else {
      response.status(404).send("The body doesn't containt the expected values")
   }
})

cartRouter.put("/cart/:username/:itemId", async (request, response) => {
   const { quantity } = request.body
   if (typeof quantity === "Number" && quantity > 0) {
      const isInCart = await db.query(
         "SELECT quantity FROM cart_items WHERE cart_id = $1 AND items_id = $2",
         [request.cartId, request.params.itemId]
      )
      if (isInCart.rows) {
         try {
            await db.query(
               "UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND items_id = $3",
               [quantity, request.cartId, request.params.itemId]
            )
            response.status(201).send("Updated quantity successfully!")
         } catch (error) {
            console.error(error)
            response.status(500).send("An error occurred.")
         }
      } else {
         response.status(404).send("Item already in the cart")
      }
   } else {
      response.status(404).send("The body doesn't containt the expected values")
   }
})

cartRouter.delete("/cart/:username", ensureAuthenticated, async (request, response) => {
   try {
      await db.query("DELETE FROM cart_items WHERE cart_id = $1", [request.cartId])
      response.status(204).send("Cart cleared successully")
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

cartRouter.delete("/cart/:username/:itemId", ensureAuthenticated, async (request, response) => {
   try {
      await db.query("DELETE FROM cart_items WHERE cart_id = $1 AND items_id = $2", [
         request.cartId,
         request.params.itemId,
      ])
      response.status(204).send("Item deleted successully")
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

cartRouter.post("/cart/:username/checkout", ensureAuthenticated, async (request, response) => {
   const numberOfItems = await db.query(
      "SELECT COUNT(*) FROM cart JOIN cart_items on cart.id = cart_items.cart_id WHERE cart.id = $1",
      [request.cartId]
   )
   const cartItemIds = await db.query("SELECT items_id FROM cart_items WHERE cart_id = $1", [
      request.cartId,
   ])
   console.log(cartItemIds)
   if (numberOfItems > 0) {
      // Get value of all items
      try {
         const orderValue = await db.query(
            "SELECT sum((prices.price * ((100 - prices.discount) / 100) * cart_items.quantity)) as cart_value FROM cart_items JOIN prices ON cart_items.items_id = prices.items_id WHERE cart_items.items_id = $1"
         )
         // Create order
         await db.query(
            "INSERT INTO orders(username, date, value, fulfilled) VALUES($1, CURRENT_DATE, $2, false)",
            [request.params.username, orderValue.rows.cart_value]
         )
         // For every cart item make a query to insert item into table
         const orderId = await db.query(
            "SELECT id FROM orders WHERE username = $1 ORDER BY id DESC LIMIT 1",
            [request.params.username]
         )
         const cartItemIds = await db.query(
            "SELECT * items_id FROM cart_items WHERE cart_id = $1",
            [req.cartId]
         )
         Object.values(cartItemIds.rows).forEach(async (item) => {
            await db.query("INSERT INTO orders_items($1, $2)", [orderId.rows[0].id, item])
         })
         // Clear cart
         await db.query("DELETE FROM cart_items WHERE cart_id = $1", [request.cartId])
      } catch (error) {
         console.error(error)
         response.status(500).send("An error occurred.")
      }
   } else {
      response.status(404).send("Cart is empty")
   }
})

export default cartRouter
