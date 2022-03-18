// const { db } = require('database-js');

// var Connection = require('database-js').Connection;

// // 👉 Change the connection URL according to the database you need to connect

// (async function(){
// 	try{
// 		var conn =
// 			// new Connection("sqlite:///path/to/test.sqlite"); // SQLite
// 			// new Connection("mysql://user:password@localhost/test"); // MySQL
// 			// new Connection("postgres://user:password@localhost/test"); // PostgreSQL
// 			// new Connection( < ANOTHER URL HERE > ); // see the drivers
// 			new Connection('database-js-adodb:///Z:\\sietch_win\\apa.accdb');
// 		console.log(conn);
// 		var statement = conn.prepareStatement("SELECT * FROM tbl030;");
// 		var results = await statement.query();
// 		console.log(results);
// 	} catch(err) {
// 		console.error(err);
// 	}
// })();

'use strict';

const ADODB = require('node-adodb');
const connection = ADODB.open('Provider=Microsoft.ACE.OLEDB.12.0;Data Source=apa.accdb;Persist Security Info=False;');
const fs = require('fs');
// Schema
(async function(){
	var schema = await connection.schema(20);
	for(var t of schema) {
		if (t.TABLE_TYPE == "TABLE") {
			var data = await connection.query('SELECT * FROM '+t.TABLE_NAME);
			fs.writeFileSync(t.TABLE_NAME+".json",JSON.stringify(data,null,2));
		}
	}

})();
// connection
//   .schema(20)
//   .then(schema => {
//   	console.log('schema');
//     console.log(JSON.stringify(schema, null, 2));
//   })
//   .catch(error => {
//     console.log(error);
//   });

// connection
//   .query('SELECT * FROM tbl030')
//   .then(data => {
//     console.log(JSON.stringify(data, null, 2));
//   })
//   .catch(error => {
//     console.error(error);
//   });
