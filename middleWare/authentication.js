export const ensureAuthenticated = (req, res, next) => {
   if (req.isAuthenticated()) {
      // isAuthenticated is provided by passport
      return next()
   } else {
      // Redirect unauthenticated requests to login page
      res.redirect("/login")
   }
}
