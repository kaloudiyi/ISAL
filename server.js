const GoogleImages = require('google-images');
const PORT = process.env.PORT || 3000;

var MongoClient = require("mongodb").MongoClient;
var url = process.env.MONGOLAB_URI;
const cse_id = process.env.CSE_ID;
const api_key = process.env.API_KEY;

var express = require('express');
var app = express();
var path = require('path');

const client = new GoogleImages(cse_id,api_key);

console.log('Up on the port ' + PORT);

app.get('/', function (req, res) {
    res.sendFile(path.resolve('./index.html'));
});

app.get('/search/:query', function (req, res) {
    console.log(req.params.query);
    // create the db object
    var obj = {
        query: req.params.query,
        timestamp: Date.now()
    };
    // save the request
    MongoClient.connect(url, function (err, db) {
        db.collection('latest').insertOne(obj, function (err, result) {
            if (err) throw err;
            db.close();
        });
    });

    //  fire the image search
    client.search(obj.query)
        .then(function (images) {
            res.status(200).json(
                images.map(function (elt) {
                    var out = {};
                    out.url = elt.url;
                    out.snippet = elt.description;
                    out.thumbnail = elt.thumbnail.url;
                    out.context = elt.parentPage;
                    return out;
                }));
        });
});

app.get('/latest', function (req, res) {
    // Last searches logic
    MongoClient.connect(url, function (err, db) {
        db.collection('latest')
            .find({}, { fields: { _id: 0 } })
            .sort({ timestamp: -1 })
            .limit(10)
            .toArray(function (err, docs) {
                if (err) throw err
                db.close();
                res.status(200).json(docs.map(function(elt) {
                    var out = {};
                    out.term = elt.query;
                    out.when = new Date(elt.timestamp);
                    return out;
                }));
            });
    });
   
});

app.listen(PORT);