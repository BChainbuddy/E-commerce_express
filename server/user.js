import express from "express"
import passport from "passport"
import * as db from "./../db/index.js"
import bcrypt from "bcrypt"
import "./../config/passportConfig.js"

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
   request.logout()
   response.redirect("/")
})

userRouter.post("/user/register", async (request, response) => {
   const { username, password } = request.body
   try {
      const findUser = await db.query("SELECT * FROM users WHERE username = $1", [username])
      if (findUser.rows.length === 0) {
         const salt = await bcrypt.genSalt(10)
         const hashedPassword = await bcrypt.hash(password, salt)
         await db.query("INSERT INTO users(username, password) VALUES($1, $2)", [
            username,
            hashedPassword
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

export default userRouter
