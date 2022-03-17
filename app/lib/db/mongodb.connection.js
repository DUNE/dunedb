const { MongoClient } = require('mongodb');
const { DB_NAME, DB_URL } = require('../constants');

class MongoConnection {
  constructor(url, db) {
    this.MONGO_URL = url;
    this.DB_NAME = db;
  }

  async open() {
    const mongoParameters = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 100,
      socketTimeoutMS: 30000,
    };
    this.client = await MongoClient.connect(this.MONGO_URL, mongoParameters);
    this.db = this.client.db(this.DB_NAME);
  }

  async close() {
    this.client.close();
  }

  collection(name) {
    return this.db.collection(name);
  }
}

module.exports = new MongoConnection(DB_URL, DB_NAME);
