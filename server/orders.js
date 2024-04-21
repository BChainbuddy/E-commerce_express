import express from "express"
import { ensureAuthenticated } from "../middleWare/authentication.js"
import * as db from "./../db/index.js"

const ordersRouter = express.Router()

ordersRouter.get("/orders", ensureAuthenticated, async (request, response) => {
   try {
      const orders = await db.query("SELECT * FROM orders WHERE username = $1", [request.user])
      response.send(orders.rows)
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

ordersRouter.get("/orders/:orderId", ensureAuthenticated, async (request, response) => {
   try {
      const orderItems = await db.query(
         "SELECT items.id, items.name, orders_items.price, orders_items.quantity FROM orders_items JOIN items on items.id = orders_items.items_id WHERE orders_items.orders_id = $1",
         [request.params.orderId]
      )
      const orderData = await db.query(
         "SELECT orders.id, orders.date, orders.value, orders.fulfilled FROM orders WHERE orders.id = $1",
         [request.params.orderId]
      )
      request.json({
         orderData: orderData.rows,
         orderItems: orderItems.rows
      })
   } catch (error) {
      console.error(error)
      response.status(500).json("An error occurred.")
   }
})

export default ordersRouter
