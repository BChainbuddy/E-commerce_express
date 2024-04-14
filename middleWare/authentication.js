export const ensureAuthenticated = (req, res, next) => {
   if (req.isAuthenticated()) {
      return next()
   } else {
      res.status(400).send("User isn't logged in!")
   }
}
