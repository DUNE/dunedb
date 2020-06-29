
/*

This file is just here to serve as some notes.

To get object relationships, we can run an (incremental) mapreduce

map function:
  - take every component object 
  - recurse through object tree, find every instance where value matches a UUID
	  - emit(UUID found, uuid of this component)

 reduce function:
  - remove redudant entries - only one per component, so list is unique list has only one copy of referring components.

This can be run incrementally.

OR just do a foreach on new records
for each record
  create a 'relationship' record for every UUID you find.

the problem: I have no way of knowing if the current record is the current! 
But that's ok: I can do that at specific query time: look up the related thing, see if there is still a connection.  
The reduced map just gives a list of places to look.


Result:
When looking up item A, you can find all the records that refer to it.



What I really want:
For any given object A
 - Find all objects that I refer to
 - Find all objects that refer to me
    ---> For a given date
    ---> want to know breakpoint dates when tings change
*/


// totally untested, just here to learn how mapreduce works.

var scopeRelationships = {
	uuid_regex: /^[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12}/,

	// no error protection on this, use uuid-mongo where outside server-side scripts
	uuidTextToBson: function(text) {
		const stripped = text.replace(/-/g, '').toLowerCase();
		return new Binary(Buffer.from(stripped, 'hex'), Binary.SUBTYPE_UUID)
	},

	uuidBsonToText: function(bson) {
		return [
   			bson.buffer.toString('hex', 0, 4),
    		bson.buffer.toString('hex', 4, 6),
		    bson.buffer.toString('hex', 6, 8),
		    bson.buffer.toString('hex', 8, 10),
		    bson.buffer.toString('hex', 10, 16),
		  ].join('-');	
		}
}

function mapRelationships()
{
	// record is this
	// recurse through record
	function recurse(thing,path) {
		for(var i in thing) {
			if (typeof thing[i] === "object") recurse(thing[i],path+'.'+i);
			if (typeof thing[i] === "array") recurse(thing[i],path+'['+i+']');
			else if (typeof thing[i] === 'string' && thing[i].match(scope.uuid_regex)) {
				// fixme: also look for bson objects, return bson objects
				// that requires pulling code out of uuid-mongo, but should be doable.


				// We have another uuid.
				emit(thing[i], // FIXME text->BSON?
				this.componentUuid); // FIXME BSON->text?
			}
		}
	}
	recurse(this,"");
}

function reduceRelationships(uuid,fromthings)
{
	// list only one entry for each unique thing in fromthings, also orders them I think.

	// Fixme: this won't work, since the fromthings is an array of Binary objects, not strings
	// So, I need to either change them into strings here or above, or do a proper sort-and-eliminate on the binary values
	

	var unique = {};
	for(var thing of fromthings) unique[thing] = null;

	var retval = [];
	for(uuid in unique) retval.push[uuid];
	return retval;
}