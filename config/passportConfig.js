import LocalStrategy from "passport-local"
import GoogleStrategy from "passport-google-oauth20"
import bcrypt from "bcrypt"
import * as db from "./../db/index.js"
import passport from "passport"
import dotenv from "dotenv"
dotenv.config()

passport.use(
   new LocalStrategy(async function(username, password, done) {
      await db.query("SELECT * FROM users WHERE username = $1", [username], async (err, user) => {
         const authType = "local"
         if (err) {
            return done(err)
         }
         if (!user.rows[0]) {
            return done(null, false)
         }
         if (user.rows[0].authtype !== authType) {
            return done(null, false)
         }
         const matchedPassword = await bcrypt.compare(password, user.rows[0].password)
         if (!matchedPassword) {
            return done(null, false)
         }
         return done(null, user.rows[0])
      })
   })
)

passport.use(
   new GoogleStrategy.Strategy(
      {
         clientID: process.env.GOOGLE_CLIENT_ID,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
         callbackURL: "/auth/google/callback"
      },
      async (accessToken, refreshToken, profile, cb) => {
         const { email } = profile._json
         await db.query("SELECT * FROM users WHERE username = $1", [email], async (err, user) => {
            const authType = "google"
            if (err) {
               return cb(err)
            }
            if (!user.rows[0]) {
               await db.query("INSERT INTO users(username,password,authtype) VALUES($1, $2, $3)", [
                  email,
                  null,
                  authType
               ])
               const user = await db.query("SELECT * FROM users WHERE username = $1", [email])
               console.log("User found!")
               return cb(null, user.rows[0])
            } else {
               console.log("User found!")
               return cb(null, user.rows[0])
            }
         })
      }
   )
)

passport.serializeUser((user, done) => {
   console.log(`Serialize ${user.username}`)
   done(null, user.username)
})

passport.deserializeUser(async (username, done) => {
   console.log("Retrieving username ", username)
   done(null, username)
})
