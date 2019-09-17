const express = require("express")
const bodyParser = require("body-parser")
const bookRouter = require("./services/books")

const server = express();

server.use(bodyParser.json())

server.use("/books", bookRouter)

server.listen(3450, () => {
    console.log("SERVER IS RUNNING ON 3450")
})