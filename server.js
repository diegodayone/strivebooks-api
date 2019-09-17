const express = require("express")
const bodyParser = require("body-parser")
const bookRouter = require("./services/books")
const cors = require("cors")

const server = express();
server.set("port", process.env.PORT || 3450)

server.use(bodyParser.json())

var corsOptions = {
    origin: "https://strivebooks.herokuapp.com",
    optionsSuccessStatus: 200
}

server.use("/books", cors(corsOptions), bookRouter)

server.use("/test", (req, res) => {
    res.send("working")
})

server.listen(server.get('port'), () => {
    console.log("SERVER IS RUNNING ON " + server.get("port"))
})