const express = require("express")
const fs = require("fs-extra")
const shortid = require("shortid")
const connection = require('../db')
const Request = require("tedious").Request
const Types = require("tedious").TYPES

const router = express.Router();

router.get("/:username", (req, res)=>{
  //1) query our cart to get the elements with book info
  var cartContent = `SELECT ASIN, Title, Image, Author, Price, COUNT(*) AS Quantity, Price * Count(*) as Total
                    FROM ShoppingCart JOIN Books ON FK_Book = ASIN 
                    WHERE Username = '${req.params.username}'
                    GROUP BY ASIN, Title, Image, Author, Price
                    ORDER BY Total DESC`
 
  var cart = [];
  //2) create a request
  var request = new Request(cartContent, (err, rowCount, rows) =>{
    if (err) res.send(err)
    else res.send(cart)
  })

  var cart = []
  request.on("row", (columns) =>{
    // var x = [...columns].reduce((result, item)=> {
    //   var key = Object.keys(item)[0];
    //   result[key] = item[key];
    //   return result;
    // }, {});
    // console.log(x)
    var shoppingCartElement = {}
    columns.forEach(column =>{
        shoppingCartElement[column.metadata.colName] = column.value
    })
    cart.push(shoppingCartElement)
  })

  //3) dispatch the request through our connection
  connection.execSql(request);
})

router.delete("/:username/delete/:bookId", (req, res)=> {
  var deleteQuery = `DELETE TOP (${req.body.number ? req.body.number : 1})
                    FROM ShoppingCart 
                    WHERE Username = '${req.params.username}' AND FK_Book = '${req.params.bookId}'`

  var request = new Request(deleteQuery, (err, rowCount) =>{
    if (err) res.send(err)
    else {
      if (rowCount > 0)
        res.send("Element deleted")
      else 
        res.status(404).send("Cannot find item in the cart")
    }
  })

  connection.execSql(request);
})



module.exports = router