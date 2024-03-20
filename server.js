import express, { request, response } from "express"
import * as db from "./db/index.js"
import passport from "passport"
import LocalStrategy from "passport-local"
import bcrypt from "bcrypt"
import session from "express-session"

const app = express()

const port = "8001"

app.listen(port, () => {
   console.log(`Successfull connection to ${port}...`)
})

app.use(express.json())

// PASSPORT
// Middleware
app.use(
   session({
      secret: "E-commerce",
      cookie: {
         maxAge: 1000 * 60 * 24,
         sameSite: "none",
         secure: true,
      },
      saveUninitialized: false,
      resave: false,
   })
)

app.use(passport.initialize())
app.use(passport.session())

// Strategy
passport.use(
   new LocalStrategy(async function (username, password, done) {
      await db.query("SELECT * FROM users WHERE username = $1", [username], async (err, user) => {
         console.log("Comparing password")
         const matchedPassword = await bcrypt.compare(password, user.rows[0].password)
         if (err) return done(err)
         if (!user) return done(null, false)
         if (!matchedPassword) return done(null, false)
         console.log("User found!")
         return done(null, user)
      })
   })
)

passport.serializeUser((user, done) => {
   console.log(`Serialize ${user}`)
   done(null, user)
})

passport.deserializeUser((user, done) => {
   console.log(`Deserialize ${user}`)
   done(null, user)
})

function ensureAuthenticated(req, res, next) {
   if (req.isAuthenticated()) {
      return next()
   } else {
      res.redirect("/login")
   }
}

// USER
app.post(
   "/login",
   passport.authenticate("local", {
      failureRedirect: "/login",
      successRedirect: "/",
   })
)

app.get("/logout", (request, response) => {
   request.logout()
   response.redirect("/")
})

app.post("/register", async (request, response) => {
   const { username, password } = request.body
   const findUser = await db.query("SELECT * FROM users WHERE username = $1", [username])
   if (findUser.rows.length === 0) {
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)
      await db.query("INSERT INTO users(username, password) VALUES($1, $2)", [
         username,
         hashedPassword,
      ])
      response.redirect("login")
   } else {
      response.status(400).send()
   }
})

// TO GET THE ITEMS
app.get("/items", async (request, response) => {
   const result = await db.query(
      "SELECT items.id, items.name, description, categories.name, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id"
   )
   response.send(result.rows)
})

app.get("/discountedItems", async (request, response) => {
   const result = await db.query(
      "SELECT items.id, items.name, description, categories.name, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id WHERE discount > 0"
   )
   response.send(result.rows)
})

app.get("/items/:id", async (request, response) => {
   const result = await db.query(
      "SELECT items.id, items.name, description, categories.name, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id WHERE items.id = $1",
      [request.params.id]
   )
   response.send(result.rows)
})

app.get("/categories", async (request, response) => {
   const result = await db.query("SELECT * FROM categories")
   response.send(result.rows)
})

// Make this better!
app.get("/categories/:id", async (request, response) => {
   const result = await db.query(
      "SELECT items.id, items.name, description, categories.name, price, discount, price*((100-discount) / 100) as newprice FROM items JOIN prices ON prices.items_id = items.id JOIN items_categories ON prices.items_id = items_categories.items_id JOIN categories ON items_categories.categories_id = categories.id WHERE categories.id = $1",
      [request.params.id]
   )
   response.send(result.rows)
})

// CART
app.use("/cart/:username", ensureAuthenticated, async (request, response, next) => {
   // To create cart Id
   let cartId = await db.query("SELECT id FROM cart WHERE username = $1", [request.params.username])
   if (!cartId) {
      await db.query("INSERT INTO cart(username) VALUES($1)", [username])
      cartId = await db.query("SELECT id FROM cart WHERE username = $1", [request.params.username])
   }
   request.cartId = cartId
   next()
})

app.get("/cart/:username", ensureAuthenticated, async (request, response) => {
   const cartItems = await db.query(
      "SELECT items.id, items.name, cart_items.quantity, prices.price, (prices.price * ((100 - prices.discount) / 100) * cart_items.quantity) as cart_value from  cart_items join items on cart_items.items_id = items_id join prices on items.id = prices.items_id WHERE cart_items.cart_id = $1",
      [request.cartId]
   )
   response.send(cartItems.rows)
})

app.post("/cart/:username", ensureAuthenticated, async (request, response) => {
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

app.delete("/cart/:username", ensureAuthenticated, async (request, response) => {
   await db.query("DELETE FROM cart_items WHERE cart_id = $1", [request.cartId])
   response.status(204).send()
})

app.delete("/cart/:username/:itemId", ensureAuthenticated, async (request, response) => {
   await db.query("DELETE FROM cart_items WHERE cart_id = $1 AND items_id = $2", [
      request.cartId,
      request.params.itemId,
   ])
   response.status(204).send()
})

app.post("/cart/:username/checkout", ensureAuthenticated, async (request, response) => {
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

// ORDERS
app.get("/orders/:username", ensureAuthenticated, async (request, response) => {
   const orders = await db.query("SELECT * FROM orders WHERE username = $1", [
      request.params.username,
   ])
   request.send(orders.rows)
})

app.get("/orders/:username/:orderId", ensureAuthenticated, async (request, response) => {
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
