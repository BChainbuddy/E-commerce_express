import LocalStrategy from "passport-local"
import bcrypt from "bcrypt"

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
