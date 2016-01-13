var express = require('express'),
    app = express(),
    gpio = require('pi-gpio'),
    // pin = 40,
    state;

app.set('view engine', 'jade');

gpio.read(40, function(err, value) {
    // if(err) throw err;
    state = value;
    console.log(value);
});

app.use(express.static('public'));

app.get('/', function(req, res) {
    res.render('index', {state: state});
});

var bool = true,
    timeout;

app.get('/raise', function(req, res) {
    togglePin(40, 0, res);
});

app.get('/lower', function(req, res) {
    togglePin(40, 1, res);
});

function togglePin(pin, val, res) {
    gpio.write(pin, val, function(err) {
        // if (err) throw err;

        console.log('Pin ' + pin + ' set to ' + val);

        res.render('index', {state: "test"});
    });
}

var server = app.listen(3000, function() {
    var host = server.address().address,
        port = server.address().port;

    console.log('Listening at http://%s:%s', host, port);
});