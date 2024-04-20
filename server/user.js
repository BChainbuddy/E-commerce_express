import express from "express"
import passport from "passport"
import * as db from "./../db/index.js"
import bcrypt from "bcrypt"
import "./../config/passportConfig.js"
import { ensureAuthenticated } from "../middleWare/authentication.js"

const userRouter = express.Router()

userRouter.post("/user/login", (request, response, next) => {
   passport.authenticate("local", (err, user, info) => {
      if (err) {
         return response.status(500).json({ error: "Internal server error" })
      }
      if (!user) {
         // Authentication failed
         return response.status(401).json({ error: "Unauthorized" })
      }
      // Successfully authenticated
      request.login(user, loginErr => {
         if (loginErr) {
            return response.status(500).json({ error: "Could not log in user" })
         }
         // Send back a success response or user data as needed
         return response.status(200).json({ message: "Login successful", user: user })
      })
   })(request, response, next)
})

userRouter.get("/user/logout", (request, response) => {
   request.logout(function(err) {
      if (err) {
         return next(err)
      }
      response.send("Logount successful!")
   })
})

userRouter.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }))

userRouter.get("/auth/google/callback", passport.authenticate("google"), (req, res) => {
   res.redirect("http://localhost:3000")
})

userRouter.post("/user/register", async (request, response) => {
   const { username, password } = request.body
   try {
      const findUser = await db.query("SELECT * FROM users WHERE username = $1", [username])
      if (findUser.rows.length === 0) {
         const salt = await bcrypt.genSalt(10)
         const hashedPassword = await bcrypt.hash(password, salt)
         const authType = "local"
         await db.query("INSERT INTO users(username, password, authtype) VALUES($1, $2, $3)", [
            username,
            hashedPassword,
            authType
         ])
         response.status(200).json({ message: "User registered successfully" })
      } else {
         response.status(400).send("Account with username already exists!")
      }
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

userRouter.get("/user", ensureAuthenticated, async (request, response) => {
   response.status(200).json({ user: request.user })
})

userRouter.get("/user/address", ensureAuthenticated, async (request, response) => {
   try {
      const result = await db.query(
         "select user_address.street, user_address.apt_number, user_address.city, user_address.postal_code, user_address.country from user_address JOIN users ON users.username = user_address.users_username WHERE users.username = $1",
         [request.user]
      )
      response.send(result.rows)
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

userRouter.post("/user/address", ensureAuthenticated, async (request, response) => {
   const { street, apt_number, city, postal_code, country } = request.body
   try {
      const result = await db.query(
         "select user_address.street, user_address.apt_number, user_address.city, user_address.postal_code, user_address.country from user_address JOIN users ON users.username = user_address.users_username WHERE users.username = $1",
         [request.user]
      )
      if (!result.rows.length) {
         await db.query(
            "INSERT INTO user_address(users_username, street, apt_number, city, postal_code, country) VALUES($1, $2, $3, $4, $5, $6)",
            [request.user, street, apt_number, city, postal_code, country]
         )
         response.status(201).send("Added new address successfully!")
      } else {
         response.status(201).send("Address already posted!")
      }
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

userRouter.put("/user/address", ensureAuthenticated, async (request, response) => {
   const { street, apt_number, city, postal_code, country } = request.body
   try {
      const result = await db.query(
         "select user_address.street, user_address.apt_number, user_address.city, user_address.postal_code, user_address.country from user_address JOIN users ON users.username = user_address.users_username WHERE users.username = $1",
         [request.user]
      )
      if (result.rows.length) {
         await db.query(
            "UPDATE user_address SET street = $1, apt_number = $2, city = $3, postal_code = $4, country = $5 WHERE users_username = $6",
            [street, apt_number, city, postal_code, country, request.user]
         )
         response.status(201).send("Address changed successfully!")
      } else {
         response.status(404).send("No address in the database!")
      }
   } catch (error) {
      console.error(error)
      response.status(500).send("An error occurred.")
   }
})

export default userRouter
