"use strict";

// uses global db.

class FailLimiter
{
  constructor(opts) {
    this.opts = {
      name: "faillimiter", // change to be unique to this particular rate-limit application
      collection: "fail_limiter",
      ...opts};
    this.opts.lookup = Array.isArray(opts.lookup) ? opts.lookup : [opts.lookup]

    this.opts.onRateLimited = typeof this.opts.onRateLimited === 'function' ? this.opts.onRateLimited : function (req, res, next) {
        res.status(429).send('Too many bad tries; need to wait '+(parseInt(res.get('Retry-After'))/60.).toFixed()+" minutes");
    }
  }

  key(req) {
    // unique key:
    var lookups = this.opts.lookup.map(function (item) {
          return item + ':' + item.split('.').reduce(function (prev, cur) {
            return prev[cur]
          }, req)
         }).join(':');
    var key = this.opts.name + ":" + lookups;
    logger.info("key", key);
    return key;
  }


  async registerFail(req,res) {
    var key = this.key(req);
    var rec = await db.collection(this.opts.collection)
                         .findOne({_id:key});
    var now = Date.now()
    rec = rec ? rec : {
        total: this.opts.total,
        remaining: this.opts.total,
        reset: new Date(now + this.opts.expire)
    }

    rec.remaining = Math.max(Number(rec.remaining) - 1, -1); // Disallow negative.
    res.set('X-RateLimit-Limit', rec.total)
    res.set('X-RateLimit-Reset', Math.ceil(rec.reset / 1000)) // UTC epoch seconds
    res.set('X-RateLimit-Remaining', Math.max(rec.remaining,0));

    await db.collection(this.opts.collection)
                         .updateOne({_id:key},{$set:rec},{upsert:true});
 
  }
  // async registerSuccess(req,res) {
  //   var key = this.key(req);
  //   var rec = {
  //       total: opts.total,
  //       remaining: opts.total,
  //       reset: new Date(0)
  //   }
  //    await db.collection(this.opts.collection)
  //                        .updateOne(key,rec,{upsert:true});
  // }

  limitChecker() {
    // returns middleware that checks to see if this client is banned
    var self = this;
    return async function(req,res,next) {
         logger.info("limitChecker middleware running");
         var key = self.key(req);
         var rec = await db.collection(self.opts.collection)
                         .findOne({_id:key});
         // not yet at fail limit, allow
         var now = Date.now();
         rec = rec ? rec : {
            total: self.opts.total,
            remaining: self.opts.total,
            reset: new Date(now + self.opts.expire)
         }
         logger.info("checking...",rec);
         res.locals.limitChecker = rec;
         if (rec.remaining >= 0) return next();
         if (now > rec.reset) { // we've opened up again, allow hits.
          rec.reset = now + self.opts.expire
          rec.remaining = self.opts.total
          await db.collection(self.opts.collection)
                           .updateOne({_id:key},{$set: rec},{upsert:true});
          return next();
        }

        // Fail 'em.
        var after = (rec.reset - Date.now()) / 1000
        res.set('Retry-After', after);
        self.opts.onRateLimited(req, res, next);
    }
  }
}

module.exports = FailLimiter;

// var collection = null;
// async function connect(opts)
// {
//   if(collection) return collection;
//   var client = await new MongoClient.connect(opts.mongoUrl, opts.mongoOpts);
//   if(!client) throw new Error("Cannot connect to Mongo client");
//   var db = client.db(opts.mongoDb);
//   if(!db) throw new Error("Cannot connect to Mongo DB");
//   collection =  db.collection(opts.mongoCollection);
//   return collection;
// }

// module.exports = function (opts) {
//     opts.lookup = Array.isArray(opts.lookup) ? opts.lookup : [opts.lookup]
//     opts.mongoUrl = opts.mongoUrl || "mongodb://localhost";
//     opts.mongoDb = opts.mongoDb || "express_limiter_mongo";
//     opts.mongoCollection = opts.mongoCollection || "express_limiter_mongo";
//     opts.mongoOpts = {useNewUrlParser:true, useUnifiedTopology: true, connectTimeoutMS: 1000, socketTimeoutMS: 1000, ...opts.mongoOpts};

//     var middleware = async function (req, res, next) {
//       if (opts.whitelist && opts.whitelist(req)) return next()
//       opts.onRateLimited = typeof opts.onRateLimited === 'function' ? opts.onRateLimited : function (req, res, next) {
//         res.status(429).send('Rate limit exceeded')
//       }
//        var lookups = opts.lookup.map(function (item) {
//         return item + ':' + item.split('.').reduce(function (prev, cur) {
//           return prev[cur]
//         }, req)
//       }).join(':')
//       var path = req.path
//       var method = req.method.toLowerCase()
//       var key = 'ratelimit:' + path + ':' + method + ':' + lookups;
//       if(opts.key) key = opts.key; // Allow the user to override the key, link up several middleware instances.
//       var col = await connect(opts);
//       var limit = await col.findOne({_id:key});
//       var now = Date.now()
//       limit = limit ? limit : {
//         total: opts.total,
//         remaining: opts.total,
//         reset: new Date(now + opts.expire)
//       }
      
//       if (now > limit.reset) {
//           limit.reset = now + opts.expire
//           limit.remaining = opts.total
//       }

//       // do not allow negative remaining
//       limit.remaining = Math.max(Number(limit.remaining) - 1, -1)
      
//       await col.updateOne({_id:key},{$set:{...limit}},{upsert:true});
//       if (!opts.skipHeaders) {
//         res.set('X-RateLimit-Limit', limit.total)
//         res.set('X-RateLimit-Reset', Math.ceil(limit.reset / 1000)) // UTC epoch seconds
//         res.set('X-RateLimit-Remaining', Math.max(limit.remaining,0))
//       }

//       if (limit.remaining >= 0) return next()

//       var after = (limit.reset - Date.now()) / 1000

//       if (!opts.skipHeaders) res.set('Retry-After', after)

//       opts.onRateLimited(req, res, next)
//     }; // end middleware


//     return middleware;
//   };
