import pg from "pg"
import "dotenv/config"

const pool = new pg.Pool({
   host: process.env.host,
   port: process.env.port,
   database: process.env.database,
   password: process.env.password,
   user: process.env.user
})

export const query = (text, params, callback) => {
   return pool.query(text, params, callback)
}
