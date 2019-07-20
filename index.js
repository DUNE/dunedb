const express = require('express')
const app = express()
const pug = require('pug')
const uuidv4 = require('uuid/v4');

var morgan = require('morgan');
const port = 12313;
const uuid_url = "http://sietch.xyz/";

app.use(morgan('tiny'));


app.set('view engine', 'pug')
app.set('views','pug');

app.get("/qr", (req,res)=>
{

  res.render('qr', { qrurl: uuid_url+uuidv4() })
});

app.get('/', (req, res) => res.send('Hello World!'));

app.use(express.static(__dirname + '/static'));
app.listen(port, () => console.log(`Example app listening on port ${port}!`))