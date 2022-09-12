const { MongoClient } = require('mongodb');

const { DB_NAME, DB_URL, DB_CERTKEY, DB_CA } = require('../constants');


class MongoConnection {
  constructor(url, db) {
    this.MONGO_URL = url;
    this.DB_NAME = db;
  }

  async open() {
    const mongoParameters = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 1000,
      socketTimeoutMS: 30000,
      tls: !!DB_CERTKEY,
      tlsCAFile: DB_CA,
      tlsCertificateKeyFile: DB_CERTKEY,
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
