import LocalStrategy from "passport-local"
import bcrypt from "bcrypt"
import * as db from "./../db/index.js"
import passport from "passport"

passport.use(
   new LocalStrategy(async function(username, password, done) {
      await db.query("SELECT * FROM users WHERE username = $1", [username], async (err, user) => {
         console.log("Comparing password")
         const matchedPassword = await bcrypt.compare(password, user.rows[0].password)
         if (err) {
            console.log(1)
            return done(err)
         }
         if (!user.rows[0]) {
            console.log(2)
            return done(null, false)
         }
         if (!matchedPassword) {
            console.log(3)
            return done(null, false)
         }
         console.log("User found!")
         return done(null, user.rows[0])
      })
   })
)

passport.serializeUser((user, done) => {
   console.log(`Serialize ${user.username}`)
   done(null, user.username)
})

passport.deserializeUser(async (username, done) => {
   console.log("Retrieving username ", username)
   done(null, username)
})
