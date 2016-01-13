var express = require('express'),
    app = express(),
    gpio = require('pi-gpio'),
    pins = {},
    // pin = 40,
    state;

app.set('view engine', 'jade');

app.set('title', "Pi Projector Screen Toggle")

gpio.open(40, "output", function (err) {
    if (err) console.log("GPIO OPEN ERROR: " + err);

    gpio.read(40, function (err, value) {
        if (err) console.log("GPIO READ ERROR: " + err);

        state = value;

        console.log("Pin 40 is :" + value);

        gpio.close(40);
    });
});

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.render('index', {state: state});
});

var bool = true;

app.get('/raise', function (req, res) {
    togglePin(40, 0, res);
});

app.get('/lower', function (req, res) {
    togglePin(40, 1, res);
});

function togglePin(gpioPin, pinVal, pageRes) {
    var pin = gpioPin,
        val = pinVal,
        res = pageRes;

    gpio.open(pin, "output");

    gpio.write(pin, val, function (err) {
        if (err) {
            console.log("GPIO WRITE ERROR: " + err);
        }

        test(pin, val, res)
    });
}

function test(pin, val, res) {
    console.log("After write: " + pin + " " + val);

    console.log(pin, val);

    console.log('Pin ' + pin + ' set to ' + val);

    state = val;

    if(!pins.hasOwnProperty(pin)) {
        console.log("Adding Pin " + pin + " to open pins.")
        pins[pin] = pin;
    }

    console.log("Open pins");

    for (pin in pins) {
        console.log("[" + pin + "]");
    }

    res.redirect('/');
}

var server = app.listen(3000, function () {
    var host = server.address().address,
        port = server.address().port;

    console.log('Listening at http://%s:%s', host, port);
});

process.on('SIGINT', function () {
    console.log("Caught interrupt signal");

    for (var pin in pins) {
        console.log("Closing Pin: " + pin);
        gpio.close(pin);
    }

    process.exit();
});