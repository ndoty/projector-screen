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
    togglePin(40, 0, function (res) {
        res.redirect('/');
    });
});

app.get('/lower', function (req, res) {
    var res = res;

    togglePin(40, 1, function (res) {
        console.log(res);
        res.redirect('/');
    });
});

function togglePin (pin, val, cb) {
    if(!pins.hasOwnProperty(pin)) {
        gpio.open(pin, "output");
    }

    gpio.write(pin, val, function (err) {
        if (err) {
            console.log("GPIO WRITE ERROR: " + err);
        }

        afterToggle(pin, val, cb);
    });
}

function afterToggle (pin, val, cb) {
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

    if (cb) cb();
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