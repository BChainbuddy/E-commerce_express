import express from "express"
import { ensureAuthenticated } from "../middleWare/authentication.js"

const cartRouter = express.Router()

cartRouter.use("/cart/:username", ensureAuthenticated, async (request, response, next) => {
   // To create cart Id
   let cartId = await db.query("SELECT id FROM cart WHERE username = $1", [request.params.username])
   if (!cartId) {
      await db.query("INSERT INTO cart(username) VALUES($1)", [username])
      cartId = await db.query("SELECT id FROM cart WHERE username = $1", [request.params.username])
   }
   request.cartId = cartId
   next()
})

cartRouter.get("/cart/:username", ensureAuthenticated, async (request, response) => {
   const cartItems = await db.query(
      "SELECT items.id, items.name, cart_items.quantity, prices.price, (prices.price * ((100 - prices.discount) / 100) * cart_items.quantity) as cart_value from  cart_items join items on cart_items.items_id = items_id join prices on items.id = prices.items_id WHERE cart_items.cart_id = $1",
      [request.cartId]
   )
   response.send(cartItems.rows)
})

cartRouter.post("/cart/:username", ensureAuthenticated, async (request, response) => {
   const { itemId, quantity } = request.body
   if (itemId && quantity) {
      const doesItemExist = await db.query("SELECT id FROM items WHERE id = $1", [itemId])
      if (doesItemExist) {
         // To update or to add
         const isInCart = await db.query(
            "SELECT quantity FROM cart_items WHERE cart_id = $1 AND items_id = $2",
            [request.cartId, itemId]
         )
         if (isInCart) {
            await db.query(
               "UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND items_id = $3",
               [quantity, request.cartId, itemId]
            )
            response.status(201).send()
         } else {
            await db.query(
               "INSERT INTO cart_items(cart_id, items_id, quantity) VALUES($1, $2, $3)",
               [request.cartId, itemId, quantity]
            )
            response.status(201).send()
         }
      } else {
         response.status(404).send()
      }
   } else {
      response.status(404).send()
   }
})

cartRouter.delete("/cart/:username", ensureAuthenticated, async (request, response) => {
   await db.query("DELETE FROM cart_items WHERE cart_id = $1", [request.cartId])
   response.status(204).send()
})

cartRouter.delete("/cart/:username/:itemId", ensureAuthenticated, async (request, response) => {
   await db.query("DELETE FROM cart_items WHERE cart_id = $1 AND items_id = $2", [
      request.cartId,
      request.params.itemId,
   ])
   response.status(204).send()
})

cartRouter.post("/cart/:username/checkout", ensureAuthenticated, async (request, response) => {
   const itemAmount = await db.query(
      "SELECT COUNT(*) FROM cart JOIN cart_items on cart.id = cart_items.cart_id WHERE cart.id = $1",
      [request.cartId]
   )
   const cartItems = await db.query("SELECT items_id FROM cart_items WHERE cart_id = $1", [
      request.cartId,
   ])
   console.log(cartItems)
   if (itemAmount > 0) {
      // Get value of all items
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
      const cartItems = await db.query("SELECT * items_id FROM cart_items WHERE cart_id = $1", [
         req.cartId,
      ])
      Object.values(cartItems.rows).forEach(async (item) => {
         await db.query("INSERT INTO orders_items($1, $2)", [orderId.rows[0].id, item])
      })
      // Second clear cart
      await db.query("DELETE FROM cart_items WHERE cart_id = $1", [request.cartId])
   } else {
      response.status(404).send()
   }
})

export default cartRouter
