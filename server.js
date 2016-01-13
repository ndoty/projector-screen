var express = require('express'),
    app = express(),
    gpio = require('pi-gpio'),
    pin = 11;

app.set('view engine', 'jade');

// gpio.setup(pin, gpio.DIR_OUT);

app.use(express.static('public'));

app.get('/', function(req, res) {
    res.render('index');
});

var bool = true,
    timeout;

app.get('/test', function(req, res) {
    console.log('Pin Toggled: ' +  bool);

    // togglePin(bool);
    bool = !bool;

    res.render('index');
});

app.get('/raise', function(req, res) {
    clearInterval(timeout);

    // togglePin(false);
    console.log('Pin #' + pin + ' turned off');

    res.render('index');
});

app.get('/lower', function(req, res) {
    clearInterval(timeout);

    // togglePin(true);
    console.log('Pin #' + pin + ' turned on');

    res.render('index');
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