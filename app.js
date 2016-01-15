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
    maxSteps = 500,
    currentStep = 0,
    stepDelay = 1,
    stopMotor = false,
    status = '',
    message = '',
    webUIConnected = false,
    stream;

app.set('view engine', 'jade');

app.set('title', "Pi Projector Screen Toggle");

server.listen(3000);

io.on('connection', function (socket) {
    console.log("Web UI Connected");

    webUIConnected = true;

    stream = socket;

    socket.emit('feedback', message);

    socket.on('disconnect', function (data) {
        webUIConnected = false;

        console.log("Web UI Disconnected")
    });
});

openPins();

app.use(express.static('public'));

app.use(express.static(__dirname + '/bower_components'));

checkLimits();

app.get('/', function (req, res) {
    res.render('index', {feedback: message});
});

app.get('/raise', function (req, res) {
    res.redirect(301, '/');

    status = "raising";

    message = "Screen is currently " + status;

    console.log(message);

    if (webUIConnected) {
        stream.emit('feedback', message);
    }

    raise();
});

app.get('/lower', function (req, res) {
    res.redirect(301, '/');

    status = "lowering";

    message = "Screen is currently " + status;

    console.log(message);

    if (webUIConnected) {
        stream.emit('feedback', message);
    }

    lower();
});

app.get('/stopMotor', function (req, res) {
    res.redirect(301, '/');

    stopTheMotor();
});

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
        console.log(stopMotor);
        if (!stopMotor) {
            gpio.write(pins.stepPin.pinNumber, 1, function () {
                sleep(stepDelay);

                gpio.write(pins.stepPin.pinNumber, 0, function () {
                    sleep(stepDelay);

                    currentStep++;

                    console.log("Moved moter to step " + currentStep + " out of " + maxSteps + " steps");
                });
            });
        }
    });
}

// Stopping motor
function stopTheMotor () {
    stopMotor = true;

    if (currentStep < maxSteps) {
        if (currentStep > 0) {
            message = "Screen is currently stopped at step " + currentStep + " our of " + maxSteps + " steps while " + status;

            console.log(message);

            if (webUIConnected) {
                stream.emit('feedback', message);
            }
        } else {
            message = "Screen should be either fully raised or lowered - Raise or lower accordingly";

            console.log(message);

            if (webUIConnected) {
                stream.emit('feedback', message);
            }
        }
    } else {
        currentStep = 0;

        if (status === "lowering") {
            message = "Screen is now lowered";
        } else if (status === "raising") {
            message = message + "Screen is now raised";
        }

        status = '';

        console.log(message);

        if (webUIConnected) {
            stream.emit('feedback', message);
        }
    }
}

function raise () {
    stopMotor = false;

    gpio.write(pins.dirPin.pinNumber, 1, function () {
        move();
    });
}

function lower () {
    stopMotor = false;

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
    if (currentStep >= maxSteps) {
        steps = 0;

        stopTheMotor();
    }

    if (status === "raising") {
        gpio.read(pins.raiseEndStop.pinNumber, function(err, value) {
            if(err) console.log("GPIO READ ERROR: " + err);

            if (value === 1) {
                message = "Raise Endstop triggered, stopping motor";

                console.log(message);

                if (webUIConnected) {
                    stream.emit('feedback', message);
                }

                stopTheMotor();
            }
        });
    } else if (status === "lowering") {
        gpio.read(pins.lowerEndStop.pinNumber, function(err, value) {
            if(err) console.log("GPIO READ ERROR: " + err);

            if (value === 1) {
                message = "Lower Endstop triggered, stopping motor";

                console.log(message);

                if (webUIConnected) {
                    stream.emit('feedback', message);
                }

                stopTheMotor();
            }
        });
    }

    if (cb) cb();
}

process.on('SIGINT', function () {
    if (webUIConnected) {
        stream.emit('feedback', "SERVER DOWN");
    }

    console.log("Caught interrupt signal");

    closePins();

    console.log("Safe to exit.");

    process.exit();
});

module.exports = app;