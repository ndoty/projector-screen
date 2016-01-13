var express = require('express'),
    app = express(),
    gpio = require('pi-gpio'),
    pins = [],
    // pin = 40,
    state;

app.set('view engine', 'jade');

gpio.open(40, "output", function (err) {
    if (err) console.log("GPIO OPEN ERROR: " + err);

    gpio.read(40, function(err, value) {
        if (err) console.log("GPIO READ ERROR: " + err);

        state = value;

        console.log("Pin 40 is :" + value);

        gpio.close(40);
    });
});

app.use(express.static('public'));

app.get('/', function(req, res) {
    res.render('index', {state: state});
});

var bool = true;

app.get('/raise', function(req, res) {
    togglePin(40, 0, res);
});

app.get('/lower', function(req, res) {
    togglePin(40, 1, res);
});

function togglePin(pin, val, res) {
    gpio.open(pin, "output", function () {
        gpio.write(pin, val, function(err) {
            if (err) console.log("GPIO WRITE ERROR: " + err);

            console.log('Pin ' + pin + ' set to ' + val);

            if(pins.indexOf(pin) == -1) {
                console.log("Adding Pin " + pin + " to open pins.")
                pins.push(pin);
            }

            console.log("Open pins: ");

            for (var pin in pins) {
                console.log("[" + pin + "]");
            }

            res.render('index', {state: val});
        });
    });
}

var server = app.listen(3000, function() {
    var host = server.address().address,
        port = server.address().port;

    console.log('Listening at http://%s:%s', host, port);
});

process.on('SIGINT', function() {
    console.log("Caught interrupt signal");

    for (var pin in pins) {
        console.log("Closing Pin: " + pin);
        gpio.close(pin);
    }

    process.exit();
});