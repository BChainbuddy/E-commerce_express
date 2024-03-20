import express from "express"
import passport from "passport"

const userRouter = express.Router()

userRouter.post(
   "user/login",
   passport.authenticate("local", {
      failureRedirect: "/login",
      successRedirect: "/",
   })
)

userRouter.get("user/logout", (request, response) => {
   request.logout()
   response.redirect("/")
})

userRouter.post("user/register", async (request, response) => {
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

export default userRouter
