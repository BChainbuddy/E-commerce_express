import express from "express"
import { ensureAuthenticated } from "../middleWare/authentication.js"

const ordersRouter = express.Router()

ordersRouter.get("/orders/:username", ensureAuthenticated, async (request, response) => {
   const orders = await db.query("SELECT * FROM orders WHERE username = $1", [
      request.params.username,
   ])
   request.send(orders.rows)
})

ordersRouter.get("/orders/:username/:orderId", ensureAuthenticated, async (request, response) => {
   const orderItems = await db.query(
      "SELECT items.id, items.name, orders_items.price, orders_items.quantity FROM orders_items JOIN items on items.id = orders_items.items_id WHERE orders_items.orders_id = $1",
      [request.params.orderId]
   )
   const orderData = await db.query(
      "SELECT orders.id, orders.date, orders.value, orders.fulfilled FROM orders WHERE orders.id = $1",
      [request.params.orderId]
   )
   request.send({
      orderData: orderData.rows,
      orderItems: orderItems.rows,
   })
})

export default ordersRouter
