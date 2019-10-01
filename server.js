const express = require("express")
const bodyParser = require("body-parser")
const bookRouter = require("./services/books")
const cors = require("cors")
require('dotenv').config()
var Request = require('tedious').Request

const connection = require("./db")

const server = express();
server.set("port", process.env.PORT || 3450)

console.log(process.env.USER);

server.use(bodyParser.json())

var whitelist = ['https://strivebooks.herokuapp.com', 'http://localhost:3000']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

server.use("/books", cors(), bookRouter)

server.use("/test", (req, res) => {
    var selectBooks = "SELECT * FROM BOOKS"
    var request = new Request(selectBooks, (err, rowCount, rows) =>{
      if(err) console.log(err)
      else console.log(rowCount, rows)
    })

    var books = [];
    request.on('row', (columns) => { //every time we receive back a row from SQLServer
      var book = {}
      columns.forEach(column =>{
        book[column.metadata.colName] = column.value //add property to the book object
        //book['Title'] = 'Lord of the Rings: The Fellowship of the Ring'
        //book['ASIN'] = '123'...
      })
      books.push(book);
    })

    request.on("requestCompleted", () => res.send(books)) //When we are done

    connection.execSql(request); //Execute Query
})

server.listen(server.get('port'), () => {
    console.log("SERVER IS RUNNING ON " + server.get("port"))
})