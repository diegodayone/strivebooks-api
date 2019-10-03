const express = require("express")
const fs = require("fs-extra")
const shortid = require("shortid")
const connection = require('../db')
const Request = require("tedious").Request
const Types = require("tedious").TYPES

const router = express.Router();

router.get("/", async (req, res) => {
    var selectBooks = "SELECT * FROM BOOKS" //get EVERYTHING FROM BOOKS
    if (req.query.category) //if we specify a category, filter for the category
      selectBooks += " WHERE Genre = '" + req.query.category + "'";

    selectBooks += " ORDER BY ASIN" //sort result by ASIN
    //Skips the first N record where N = req.query.skip or 0 if req.query.skip is undefined
    selectBooks += ` OFFSET ${req.query.skip ? req.query.skip : 0} ROWS`
    
    if (req.query.limit) //Uses FETCH NEXT to limit the number of results from the query
      selectBooks += " FETCH NEXT " + req.query.limit + " ROWS ONLY"
    
    console.log(selectBooks)

    var request = new Request(selectBooks, (err, rowCount, rows) =>{
      if(err) res.send(err)
      else res.send(books)
    })

    var books = [];
    request.on('row', (columns) => { //every time we receive back a row from SQLServer
      var book = {}
      columns.forEach(column =>{
        book[column.metadata.colName.toLowerCase()] = column.value //add property to the book object
      })
      books.push(book);
    })
    connection.execSql(request); //Execute Query
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
        book[column.metadata.colName.toLowerCase()] = column.value //add property to the book object
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

router.post("/:id/addToCart/:user", (req, res) => {
  var addToCart = `INSERT INTO ShoppingCart (Username, FK_BOOK) 
                   OUTPUT Inserted.CartID
                   VALUES ('${req.params.user}', ${req.params.id})`

  var request = new Request(addToCart, (err, rowCount, rows) =>{
    if (err) res.send(err)
    else res.send({ id: rows[0][0].value})
  })

  connection.execSql(request);
})

router.post("/:bookId/comments", async(req, res)=>{
    var insertReview = `INSERT INTO Reviews (Reviewer, Rate, Description, FK_Book)
    OUTPUT Inserted.ReviewID
    VALUES ('${req.body.Reviewer.replace("'", "''")}', 
    '${req.body.Rate}', 
    '${req.body.Description.replace("'", "''")}', 
    '${req.params.bookId.replace("'", "''")}')`

    var request = new Request(insertReview, (err, rowCount, row) =>{ 
    if(err) res.send(err)
    else res.send({id: row[0][0].value})
    })
    connection.execSql(request); //Execute Query
})

router.get("/:bookId/comments", async (req, res)=>{
    var selectBooks = "SELECT ReviewID, Reviewer, Rate, Reviews.Description, ASIN, Title FROM BOOKS JOIN REVIEWS ON ASIN = FK_Book WHERE FK_BOOK = " + req.params.bookId
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