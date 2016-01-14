var express = require('express'),
    app = express(),
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
            option: "in"
        },
        lowerEndStop:{
            pinNumber: 36,
            option: "in"
        }
    },
    maxSteps = 100,
    currentStep = 0,
    stepDelay = 100,
    stopMotor = false,
    status;

app.set('view engine', 'jade');

app.set('title', "Pi Projector Screen Toggle")

// Open all pins for use
for (var pin in pins) {
    console.log("Opening pin " + pins[pin].pinNumber + " as an " + pins[pin].option);

    gpio.open(parseInt(pins[pin].pinNumber), pins[pin].option, function (err) {
        if (err) console.log("GPIO OPEN ERROR: " + err);
    });
}

console.log("All declared pins are now open and available for use.");

app.use(express.static('public'));

app.get('/', function (req, res) {
    res.render('index', {screenStatus: status});
});

app.get('/raise', function (req, res) {
    res.redirect(301, '/');

    status = "raising";

    raise();
});

app.get('/lower', function (req, res) {
    res.redirect(301, '/');

    status = "lowering";

    lower();
});

app.get('/stopMotor', function (req, res) {
    res.redirect(301, '/');

    stopTheMotor();
});

// Runs motor in the set direction
function move () {
    if (currentStep >= maxSteps) {
        stopTheMotor();
        return;
    }

    getEndStops();

    gpio.write(pins.stepPin.pinNumber, 1, function () {
        sleep(stepDelay);

        gpio.write(pins.stepPin.pinNumber, 0, function () {
            sleep(stepDelay);

            currentStep++;

            if (!stopMotor) move();
        });
    });
}

// Stopping motor
function stopTheMotor () {
    if (currentStep < maxSteps) {
        console.log("Screen is currently stopped in a unkown state while " + status + ". You will have to rely on the mechanical End Stops to raise or lower the screen now.");

        status = " stopped in a unkown state while " + status + ". You will have to rely on the mechanical End Stops to raise or lower the screen now.";
    } else {
        currentStep = 0;

        if (status === "lowering") {
            status = "lowered";
        } else if (status === "raising") {
            status = "raised";
        }

        console.log("Screen is currently " + status);
    }

    stopMotor = true;
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

// Get endstop values to make sure we can still move
function getEndStops () {
    gpio.read(pins.raiseEndStop.pinNumber, function(err, value) {
        if(err) console.log("GPIO READ ERROR: " + err);

        console.log("Raise endstop value " + value);

        if (value === 1) {
            console.log("Raise Endstop triggered, stopping motor");
        }
    });

    gpio.read(pins.lowerEndStop.pinNumber, function(err, value) {
        if(err) console.log("GPIO READ ERROR: " + err);

        console.log("Lower endstop value " + value);

        if (value === 1) {
            console.log("Lower Endstop triggered, stopping motor");
        }
    });
}

var server = app.listen(3000, function () {
    var host = server.address().address,
        port = server.address().port;

    console.log('Listening at http://%s:%s', host, port);
});

process.on('SIGINT', function () {
    console.log("Caught interrupt signal");

    for (var pin in pins) {
        console.log("Closing pin " + pins[pin].pinNumber);

        gpio.close(pins[pin].pinNumber, function (err) {
            if(err) console.log("GPIO CLOSE ERROR: " + err);
        });
    }

    console.log("All pins now closed, safe to exit.");

    process.exit();
});