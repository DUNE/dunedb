const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');




// route middleware to make sure a user is logged in


function hasFormEditPrivs(req)
{
		return true;
}

function hasDataEditPrivs(req)
{
	return true;
}

function hasDataEntryPrivs(req)
{
	return true;
}

function hasDataViewPrivs(req)
{
	return true;
}



function middlewareCheckFormEditPrivs(req,res,next) 
{
	if(hasFormEditPrivs(req)) return next();
	else return res.status(300).send("User does not have Form Edit priviledges");
}

function middlewareCheckDataEditPrivs(req,res,next) 
{
	if(hasDataEditPrivs(req)) return next();
	else return res.status(300).send("User does not have Data Edit priviledges");
}

function middlewareCheckDataEntryPrivs(req,res,next) 
{
	if(hasDataEntryPrivs(req)) return next();
	else return res.status(300).send("User does not have Data Entry priviledges");
}

function middlewareCheckDataViewPrivs(req,res,next) 
{
	if(hasDataViewPrivs(req)) return next();
	else return res.status(300).send("User does not have Data View priviledges");
}


// machine-to-machine authorization:
const checkJwt = jwt({
  // Dynamically provide a signing key
  // based on the kid in the header and 
  // the signing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://dev-pserbfiw.auth0.com/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  // audience: 'https://dev-pserbfiw.auth0.com/api/v2/',
  // issuer: `https://dev-pserbfiw.auth0.com/`,
  // algorithms: ['RS256']
    audience: 'https://sietch.xyz/api',
    issuer: 'https://dev-pserbfiw.auth0.com/',
    algorithms: ['RS256']

});

module.exports = 
{
	hasFormEditPrivs,
	hasDataEditPrivs,
	hasDataEntryPrivs,
	hasDataViewPrivs,
	middlewareCheckFormEditPrivs,
	middlewareCheckDataEditPrivs,
	middlewareCheckDataEntryPrivs,
	middlewareCheckDataViewPrivs,
	checkJwt
}
