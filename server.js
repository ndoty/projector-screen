var express = require('express'),
    app = express(),
    gpio = require('pi-gpio'),
    pin = 40;

app.set('view engine', 'jade');

// gpio.setup(pin, gpio.DIR_OUT);

app.use(express.static('public'));

app.get('/', function(req, res) {
    res.render('index', {state: "test"});
});

var bool = true,
    timeout;

app.get('/raise', function(req, res) {
    clearInterval(timeout);

    gpio.open(pin, "output", function(err) {
        gpio.write(pin, 1, function() {
            gpio.close(pin);
        });
    });

    // togglePin(false);
    console.log('Pin #' + pin + ' turned off');

    res.render('index', {state: "test"});
});

app.get('/lower', function(req, res) {
    clearInterval(timeout);

    // togglePin(true);
    console.log('Pin #' + pin + ' turned on');

    res.render('index', {state: "test"});
});

function togglePin(val) {
    gpio.write(pin, val, function(err) {
        if (err) throw err;
    });
}

function tone(note) {
    var bool = true;
    var interval = 500 / note;

    clearInterval(timeout);

    timeout = setInterval(function() {
        togglePin(bool)
        bool = !bool;
    }, interval);

    setTimeout(function() {
        clearInterval(timeout);
    }, 250);
}

var server = app.listen(3000, function() {
    var host = server.address().address,
        port = server.address().port;

    console.log('Listening at http://%s:%s', host, port);
});