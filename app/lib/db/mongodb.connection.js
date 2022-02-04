const { MongoClient } = require('mongodb');
const { DB_NAME } = require('../constants');

class MongoConnection {
  constructor(url, db) {
    this.MONGO_URL = url || 'mongodb://localhost:27017/dunedb';
    this.DB_NAME = db || 'dunedb';
  }

  async open() {
    this.client = await MongoClient.connect(this.MONGO_URL, { useNewUrlParser: true });
    this.db = this.client.db(this.DB_NAME);
  }

  close() {
    this.client.close();
  }

  collection(name) {
    return this.db.collection(name);
  }
}

module.exports = new MongoConnection(process.env.DATABASE_URL, DB_NAME);
