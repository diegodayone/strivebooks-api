const express = require("express")
const bodyParser = require("body-parser")
const bookRouter = require("./services/books")
const cors = require("cors")

const server = express();

server.use(bodyParser.json())

server.use("/books", cors(), bookRouter)

server.use("/test", (req, res) => {
    res.send("working")
})

server.listen(3450, () => {
    console.log("SERVER IS RUNNING ON 3450")
})