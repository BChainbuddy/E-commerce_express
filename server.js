const express = require("express");

const app = express();

const port = "8001";

app.listen(port, () => {
  console.log(`Successfull connection to ${port}...`);
});

app.get('', (request, respones) => {

})

app.put('', (request, response) => {

})

app.post('', (request, response) => {

})

app.delete('', (request, response) => {
    
})