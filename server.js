import express from "express"
import passport from "passport"
import session from "express-session"
import cartRoutes from "./server/cart.js"
import itemRoutes from "./server/items.js"
import categoryRoutes from "./server/categories.js"
import orderRoutes from "./server/orders.js"
import userRoutes from "./server/user.js"
import cors from "cors"
import "./config/passportConfig.js"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import MemoryStoreCreator from "memorystore"
dotenv.config()
const app = express()

const MemoryStore = MemoryStoreCreator(session)

const port = "8001"

app.listen(port, () => {
   console.log(`Successfull connection to ${port}...`)
})

app.use(express.json())
app.use(
   cors({
      origin: process.env.CLIENT_URL,
      credentials: true
   })
)

// PASSPORT
// Middleware
app.use(
   session({
      secret: "E-commerce",
      cookie: {
         maxAge: 1000 * 60 * 60 * 24,
         sameSite: "none",
         secure: process.env.HTTPS === "true" ? true : false,
         httpOnly: true
      },
      store: new MemoryStore({
         checkPeriod: 86400000
      }),
      saveUninitialized: false,
      resave: false
   })
)

app.use(passport.initialize())
app.use(passport.session())

const __filename = fileURLToPath(import.meta.url)

const __dirname = path.dirname(__filename)

app.use("/uploads", express.static(path.join(__dirname, "db", "images")))

app.use(userRoutes)
app.use(cartRoutes)
app.use(itemRoutes)
app.use(categoryRoutes)
app.use(orderRoutes)
