var express = require('express'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server),
    fs = require('fs'),
    gpio = require('pi-gpio'),
    pins = {
        stepPin: {
            pinNumber: 37,
            option: "out"
        },
        dirPin: {
            pinNumber: 38,
            option: "out"
        },
        raiseEndStop: {
            pinNumber: 35,
            option: "in pulldown"
        },
        lowerEndStop:{
            pinNumber: 36,
            option: "in pulldown"
        }
    },
    step = 0,
    stepDelay = 1,
    status = '',
    endStopTriggered = false,
    webUIConnected = false,
    stream;

app.set('view engine', 'jade');

app.set('title', "Pi Projector Screen Toggle");

server.listen(3000);

io.on('connection', function (socket) {
    console.log("Web UI Connected");

    webUIConnected = true;

    stream = socket;

    checkLimits();

    socket.on('disconnect', function (data) {
        webUIConnected = false;

        console.log("Web UI Disconnected")
    });
});

openPins();

app.use(express.static('public'));

app.use(express.static(__dirname + '/bower_components'));

app.get('/', function (req, res) {
    res.render('index', {feedback: message});
});

app.get('/raise', function (req, res) {
    res.redirect(301, '/');

    status = "raising";

    logMessage("Screen is currently " + status);

    raise();
});

app.get('/lower', function (req, res) {
    res.redirect(301, '/');

    status = "lowering";

    logMessage("Screen is currently " + status);

    lower();
});

app.get('/stopMotor', function (req, res) {
    res.redirect(301, '/');

    endStopTriggered = true;
});

checkLimits();

function logMessage (message) {
    console.log(message);

    if (webUIConnected) {
        stream.emit('feedback', message);
    }
}

function openPins () {
    // Open all pins for use
    for (var pin in pins) {
        console.log("Opening pin " + pins[pin].pinNumber + " as an " + pins[pin].option);

        gpio.open(parseInt(pins[pin].pinNumber), pins[pin].option, function (err) {
            if (err) console.log("GPIO OPEN ERROR: " + err);
        });
    }

    console.log("All declared pins are now open and available for use.");
}

function closePins () {
    for (var pin in pins) {
        console.log("Closing pin " + pins[pin].pinNumber);

        gpio.close(pins[pin].pinNumber, function (err) {
            if(err) console.log("GPIO CLOSE ERROR: " + err);
        });
    }

    console.log("All declared pins are now closed");
}

// Runs motor in the set direction
function move () {
    checkLimits(function () {
        if (!endStopTriggered) {
            gpio.write(pins.stepPin.pinNumber, 1, function () {
                sleep(stepDelay);

                gpio.write(pins.stepPin.pinNumber, 0, function () {
                    sleep(stepDelay);

                    step++;

                    logMessage("Moved screen " + step + " steps");

                    if (!endStopTriggered) move();
                });
            });
        }
    });
}

// Stopping motor
function stopTheMotor () {
}

function raise () {
    gpio.write(pins.dirPin.pinNumber, 1, function () {
        move();
    });
}

function lower () {
    gpio.write(pins.dirPin.pinNumber, 0, function() {
        move();
    });
}

// Go to sleep
function sleep (milliseconds) {
    var start = new Date().getTime();

    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds) {
            break;
        }
    }
}

// Make sure we can still move
function checkLimits (cb) {
    if (status === '') {
        gpio.read(pins.raiseEndStop.pinNumber, function(err, value) {
            if(err) console.log("GPIO READ ERROR: " + err);

            if (value === 1) {
                endStopTriggered = true;

                logMessage("Raise Endstop triggered\nScreen is raised");

                return;
            } else {
                endStopTriggered = false;
            }
        });

        gpio.read(pins.lowerEndStop.pinNumber, function(err, value) {
            if(err) console.log("GPIO READ ERROR: " + err);

            if (value === 1) {
                endStopTriggered = true;

                logMessage("Lower Endstop triggered\nScreen is lowered");

                return;
            } else {
                endStopTriggered = false;
            }
        });
    } else if (status === "raising") {
        gpio.read(pins.raiseEndStop.pinNumber, function(err, value) {
            if(err) console.log("GPIO READ ERROR: " + err);

            if (value === 1) {
                endStopTriggered = true;

                logMessage("Raise Endstop triggered\nScreen is raised");
            } else {
                endStopTriggered = false;
            }
        });
    } else if (status === "lowering"  || status === '') {
        gpio.read(pins.lowerEndStop.pinNumber, function(err, value) {
            if(err) console.log("GPIO READ ERROR: " + err);

            if (value === 1) {
                endStopTriggered = true;

                logMessage("Lower Endstop triggered\nScreen is lowered");
            } else {
                endStopTriggered = false;
            }
        });
    }

    if (!endStopTriggered && status === '') {
        logMessage("Screen is not fully raised or lowered\nRaise or lower accordingly")
    }

    if (!endStopTriggered && cb) cb();
}

process.on('SIGINT', function () {
    if (webUIConnected) {
        stream.emit('feedback', "SERVER DOWN");
    }

    console.log("\nCaught interrupt signal");

    closePins();

    console.log("Safe to exit.");

    process.exit();
});

module.exports = app;