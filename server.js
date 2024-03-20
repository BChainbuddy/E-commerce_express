import express from "express"
import passport from "passport"
import session from "express-session"
import cartRoutes from "./server/cart.js"
import itemRoutes from "./server/items.js"
import categoryRoutes from "./server/categories.js"
import orderRoutes from "./server/orders.js"
import userRoutes from "./server/user.js"

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

app.use(userRoutes)
app.use(cartRoutes)
app.use(itemRoutes)
app.use(categoryRoutes)
app.use(orderRoutes)
