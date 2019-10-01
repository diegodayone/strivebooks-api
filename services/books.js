const express = require("express")
const fs = require("fs-extra")
const shortid = require("shortid")
const connection = require('../db')
const Request = require("tedious").Request
const Types = require("tedious").TYPES

getBooks = async () => {
    var buffer = await fs.readFile("books.json");
    var items = buffer.toString()
    return JSON.parse(items)
}

getComments = async () => {
    var buffer = await fs.readFile("comments.json");
    var items = buffer.toString()
    return JSON.parse(items)
}

saveBooks = async (books) => {
    await fs.writeFile("books.json", JSON.stringify(books))
}

saveComments = async (books) => {
    await fs.writeFile("comments.json", JSON.stringify(books))
}

const router = express.Router();

router.get("/", async (req, res) => {
    var selectBooks = "SELECT * FROM BOOKS"
    var request = new Request(selectBooks, (err, rowCount, rows) =>{
      if(err) res.send(err)
      else res.send(books)
    })

    var books = [];
    request.on('row', (columns) => { //every time we receive back a row from SQLServer
      var book = {}
      columns.forEach(column =>{
        book[column.metadata.colName] = column.value //add property to the book object
      })
      books.push(book);
    })
    connection.execSql(request); //Execute Query
    // var books = await getBooks();

    // console.log(req.query)
    // for (let entry in req.query) {
    //     var queryValue = req.query[entry].toLowerCase ? req.query[entry].toLowerCase() : req.query[entry];
    //     books = books.filter(x => x[entry].toLowerCase ?
    //         x[entry].toLowerCase().indexOf(queryValue) >= 0 :
    //         x[entry] == queryValue)

    //     // if (req.query.toLowerCase)
    //     //     books = books.filter(x => x[entry].toLowerCase().indexOf(req.query[entry].toLowerCase()) >= 0);
    //     // else
    //     //     books = books.filter(x => x[entry] == req.query[entry]

    //     console.log(entry + " => " + queryValue + " array size: " + books.length)
    // }

    // res.send(books)
})

router.get("/:id", async (req, res) => {
    var selectBooks = "SELECT * FROM BOOKS WHERE ASIN = @ASIN"
    var request = new Request(selectBooks, (err, rowCount, rows) =>{
      if(err) res.send(err)
      else {
          if (rowCount == 1)
             res.send(book)
          else
                res.status(404).send("Cannot find element " + req.params.id)
      }
    })

    var book = {};
    request.on('row', (columns) => { //every time we receive back a row from SQLServer
      columns.forEach(column =>{
        book[column.metadata.colName] = column.value //add property to the book object
      })
    })
    request.addParameter("ASIN", Types.NVarChar, req.params.id)

    connection.execSql(request); //Execute Query
})

router.post("/", async (req, res) => {
    var selectBooks = `INSERT INTO Books (ASIN, Title, Description, Author, Genre, Price)
                       VALUES ('${req.body.Asin}', '${req.body.Title}', '${req.body.Description}', 
                       '${req.body.Author}', '${req.body.Genre}', ${req.body.Price})`

    var request = new Request(selectBooks, (err) =>{ 
        if(err) res.send(err)
        else res.send("Item added")
     })
    connection.execSql(request); //Execute Query

    // request.addParameter("ASIN", Types.NVarChar, req.body.Asin)
    // request.addParameter("TITLE", Types.NVarChar, req.body.Title)
    // request.addParameter("DESCRIPTION", Types.NVarChar, req.body.Description)
    // request.addParameter("AUTHOR", Types.NVarChar, req.body.Author)
    // request.addParameter("GENRE", Types.NVarChar, req.body.Genre)
    // request.addParameter("PRICE", Types.Money, req.body.Price)
})

router.put("/:id", async (req, res) => {
    //Not Flexible version
    // var updateStatic = `UPDATE BOOKS 
    // SET Title = '${req.body.Title}', 
    // Description = '${req.body.Description}', 
    // Genre = '${req.body.Genre}'
    // Price = ${req.body.Price}
    // Author = ${req.body.Author}'
    // WHERE ASIN = ${req.params.id}`

    //Dynamic version
    var updateBooks = `UPDATE Books SET `
    delete req.body.Asin
    Object.keys(req.body).forEach(propName =>{
        if (propName == 'Price')
            updateBooks  += `${propName} = ${req.body[propName]}, ` 
        else
            updateBooks += `${propName} = '${req.body[propName]}', `
    })
    updateBooks = updateBooks.substr(0, updateBooks.length -2)
    updateBooks += ` WHERE ASIN = ${req.params.id} `

    var request = new Request(updateBooks, (err, rowCount, rows) =>{ 
        if(err) res.send(err)
        else res.send("Rows modified " + rowCount)
    })
    connection.execSql(request); //Execute Query
})

router.delete("/:id", async (req, res) => {
    var request = new Request("DELETE FROM Books WHERE ASIN = " + req.params.id,
    (err, rowCount, rows)=>{
        if (err) res.send(err)
        else res.send("Rows deleted: " + rowCount)
    })
    connection.execSql(request);
    // var books = await getBooks();
    // //[1 ,2 , 5, 7]
    // //--------X
    // //[1 ,2 , 7]
    // var booksWithoutSpecifiedID = books.filter(x => x.asin != req.params.id)
    // await saveBooks(booksWithoutSpecifiedID);
    // res.send(booksWithoutSpecifiedID)
})

router.post("/:bookId/comments", async(req, res)=>{
    var insertReview = `INSERT INTO Reviews (Reviewer, Rate, Description, FK_Book)
    VALUES ('${req.body.Reviewer}', '${req.body.Rate}', '${req.body.Description}', 
    '${req.body.FK_Book}')`

    var request = new Request(insertReview, (err) =>{ 
    if(err) res.send(err)
    else res.send("Item added")
    })
    connection.execSql(request); //Execute Query
})

router.get("/:bookId/comments", async (req, res)=>{
    var selectBooks = "SELECT Reviewer, Rate, Reviews.Description, ASIN, Title FROM BOOKS JOIN REVIEWS ON ASIN = FK_Book WHERE FK_BOOK = " + req.params.bookId
    var request = new Request(selectBooks, (err, rowCount, rows) =>{
      if(err) res.send(err)
      else res.send(reviews)
    })

    var reviews = [];
    request.on('row', (columns) => { //every time we receive back a row from SQLServer
      var review = {}
      columns.forEach(column =>{
        review[column.metadata.colName] = column.value //add property to the book object
      })
      reviews.push(review);
    })
    connection.execSql(request); //Execute Query
})

router.delete("/:bookId/comments/:reviewId", async(req, res) =>{
    var request = new Request("DELETE FROM Reviews WHERE ReviewId = " + req.params.reviewId,
    (err, rowCount, rows)=>{
        if (err) res.send(err)
        else res.send("Rows deleted: " + rowCount)
    })
    connection.execSql(request);
})

module.exports = router