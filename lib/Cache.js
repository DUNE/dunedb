'use strict';

// 
// Local process cache for some objects.
// This manages in-memory caches, but allows multiple processes
// to be running - another process invalidates all caches. 
// 

// To use:
// Cache = require("Cache.js");
// Cache.add("name",async function(){...}); // add a new cache. Can be done before initialization.
// Cache.current("name"); // get or regenerate data
// Cache.invalidate("name"); // invalidate caches.
// Cache.fast("name"); // Get the current cache. If empty, regenerate. If invalid, regenerate AFTER retrieving.
// Cache.cached("name"); // Get the current cache. If empty, it's empty.

const database = require("../lib/database.js");


class Cache
{
	constructor(name,recreator_fn) {
		if(!name) throw new Error("Need a name for this cache.");		this._name = name;
		this._recreator_fn = recreator_fn;
		console.log("Created cache",this._name);

		// needed for capped collections
		// var count = await this._collection.find().count();
		// if(count == 0) {
		// 	db.createCollection("cacheSignals", {capped: true, max: 1000})
		// }
	};

	cached() {
		return this._cached;
	}

	async fast() {
		if(!this._cached) return await current();
		current().then(()=>{}); // Set up a regeneration promise, do nothing when done. 
		return this._cached;  // return right away, ultra-fast.
	}

	async current() {
		console.time("Cache-"+this._name);
		console.log("getting current",this._name)
		var valid = await this.isValid();
		if(!valid) await this.regenerate();
		console.timeEnd("Cache-"+this._name);
		return this._cached;
	}

	async regenerate() {
		console.log("CACHE: Regerate ",this._name);
		this._cached = await this._recreator_fn();
		this._cacheTime = new Date();
	}

	async isValid() {
		if(!this._cached) return false;
		var rec = await db.collection("cacheSignals").findOne({_id:this._name});
		if(!rec) return true;
		return (rec.date.getTime() < this._cacheTime.getTime());
	}

	invalidate() {
		console.log("CACHE: invalidate ",this._name);
		// Write the DB saying that this value is now obsolete.
		// Don't wait.
		var self = this;
		db.collection("cacheSignals").updateOne(
			{_id: this._name},
			{$set: {date: new Date()}},
			{upsert: true},
			function(err,res) { 
				if(err) console.error("Error in cache invalidation",self._name,err)}
		);
		// this._cached = false;  // Turn on for optimizatino. Turn off for testing.
	}
}

class CacheManager
{
	constructor() {
		this.map = {};
	}

	add(name,fn) {
		this.map[name] = new Cache(name,fn);
		console.log("added ",name);
	}

	async current(name) {
		if(this.map[name])
		  return this.map[name].current();
		else
		  console.error("CacheManager::current() no such name ",name)
	}

   invalidate(name) {
		if(this.map[name])
			this.map[name].invalidate();
	}
}
var gCacheManager = new CacheManager();

module.exports = gCacheManager;