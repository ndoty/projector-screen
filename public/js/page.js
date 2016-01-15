var socket = io.connect('http://localhost:3000');

socket.on('feedback', function (data) {
    document.getElementById('feedback').innerHTML = data;
});