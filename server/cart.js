import express from "express"
import { ensureAuthenticated } from "../middleWare/authentication.js"
import * as db from "./../db/index.js"
import Stripe from "stripe"

const cartRouter = express.Router()
const stripe = Stripe(
   "sk_test_51P6DO3FctiVEGljEHeBQGTcQebzfaD4CL8uEChv2cg7MhWPlMfYHio7NmRGfdiBHKxAim6XhlL8t8QkvkF06lSon00NanP4I7S"
)

cartRouter.use("/cart", ensureAuthenticated, async (request, response, next) => {
   // To get cart Id
   try {
      let cartId = await db.query("SELECT id FROM cart WHERE username = $1", [request.user])
      if (!cartId.rows[0]) {
         await db.query("INSERT INTO cart(username) VALUES($1)", [request.user])
         cartId = await db.query("SELECT id FROM cart WHERE username = $1", [request.user])
      }
      request.cartId = cartId.rows[0].id
      next()
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

cartRouter.get("/cart", ensureAuthenticated, async (request, response) => {
   try {
      const cartItems = await db.query(
         "SELECT items.id, items.name, items.image_path, cart_items.quantity, prices.price, prices.price*((100-prices.discount) / 100) as newprice, (prices.price * ((100 - prices.discount) / 100) * cart_items.quantity) as cart_value from  cart_items join items on cart_items.items_id = items.id join prices on items.id = prices.items_id WHERE cart_items.cart_id = $1",
         [request.cartId]
      )
      response.send(cartItems.rows)
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

cartRouter.post("/cart", ensureAuthenticated, async (request, response) => {
   const { itemId, quantity } = request.body
   if (typeof itemId === "number" && typeof quantity === "number" && quantity > 0) {
      const doesItemExist = await db.query("SELECT id FROM items WHERE id = $1", [itemId])
      if (doesItemExist) {
         try {
            const isInCart = await db.query(
               "SELECT quantity FROM cart_items WHERE cart_id = $1 AND items_id = $2",
               [request.cartId, itemId]
            )
            if (isInCart.rows.length === 0) {
               await db.query(
                  "INSERT INTO cart_items(cart_id, items_id, quantity) VALUES($1, $2, $3)",
                  [request.cartId, itemId, quantity]
               )
               response.status(201).send("Added new item successfully!")
            } else {
               response.status(201).send("Item already in the cart")
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

cartRouter.delete("/cart", ensureAuthenticated, async (request, response) => {
   try {
      await db.query("DELETE FROM cart_items WHERE cart_id = $1", [request.cartId])
      response.status(204).send("Cart cleared successully")
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

cartRouter.put("/cart/:itemId", async (request, response) => {
   const { quantity } = request.body
   if (typeof quantity === "number" && quantity > 0) {
      const isInCart = await db.query(
         "SELECT * FROM cart_items WHERE cart_id = $1 AND items_id = $2",
         [request.cartId, request.params.itemId]
      )
      if (isInCart.rows.length > 0) {
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

cartRouter.delete("/cart/:itemId", ensureAuthenticated, async (request, response) => {
   try {
      await db.query("DELETE FROM cart_items WHERE cart_id = $1 AND items_id = $2", [
         request.cartId,
         request.params.itemId
      ])
      response.status(204).send("Item deleted successully")
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

cartRouter.post("/cart/checkout", ensureAuthenticated, async (request, response) => {
   const numberOfItems = await db.query(
      "SELECT * FROM cart JOIN cart_items on cart.id = cart_items.cart_id WHERE cart.id = $1",
      [request.cartId]
   )
   if (numberOfItems.rows.length > 0) {
      // Get value of all items
      try {
         const orderValue = await db.query(
            "SELECT sum((prices.price * ((100 - prices.discount) / 100) * cart_items.quantity)) as cart_value FROM cart_items JOIN prices ON cart_items.items_id = prices.items_id WHERE cart_items.cart_id = $1",
            [request.cartId]
         )
         // Create order
         await db.query(
            "INSERT INTO orders(username, date, value, fulfilled) VALUES($1, CURRENT_DATE, $2, false)",
            [request.user, orderValue.rows[0].cart_value]
         )
         // For every cart item make a query to insert item into table
         const orderId = await db.query(
            "SELECT id FROM orders WHERE username = $1 ORDER BY id DESC LIMIT 1",
            [request.user]
         )
         const cartItems = await db.query(
            "SELECT cart_items.items_id, cart_items.quantity, prices.price * ((100-prices.discount)/100) as price FROM cart_items LEFT JOIN prices ON prices.items_id = cart_items.items_id WHERE cart_id = $1",
            [request.cartId]
         )
         cartItems.rows.forEach(async item => {
            await db.query(
               "INSERT INTO orders_items(orders_id, items_id, quantity, price) VALUES($1, $2, $3, $4)",
               [orderId.rows[0].id, item.items_id, item.quantity, item.price]
            )
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

cartRouter.post("/cart/payment-session", async (request, response) => {
   try {
      const paymentIntent = await stripe.paymentIntents.create({
         amount: 1099,
         currency: "usd"
      })
      response.send({
         clientSecret: paymentIntent.client_secret
      })
   } catch (err) {
      response.status(500).send({ error: err.message })
   }
})

export default cartRouter
