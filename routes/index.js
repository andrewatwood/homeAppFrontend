var express = require('express');
var unirest = require('unirest');
var router = express.Router();

var server = 'localhost:8080';
function getDomoticzState(server){
  
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
