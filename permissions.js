

module.exports = 
{
	hasFormEditPrivs,
	hasDataEditPrivs,
	hasDataEntryPrivs,
	hasDataViewPrivs,
	middlewareCheckFormEditPrivs,
	middlewareCheckDataEditPrivs,
	middlewareCheckDataEntryPrivs,
	middlewareCheckDataViewPrivs
}


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
