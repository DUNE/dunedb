const router = require('express').Router();


/// View the home page
router.get('/', async function (req, res, next) {
  // If the user is not logged in, go to the next function below
  if (!req.user) return next();

  // If the user is logged in and they have a specified start page, redirect there
  if (req.user.user_metadata && req.user.user_metadata.start_page) {
    return res.redirect(req.user.user_metadata.start_page);
  }

  // Otherwise (i.e. if the user is logged in but has no specified start page), render the home page  
  res.render('home.pug');
},

  // For users who are not logged in, render the splash page
  function (req, res, next) {
    res.render('splash.pug');
  });


module.exports = router;
