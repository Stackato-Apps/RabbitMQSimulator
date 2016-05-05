var express = require('express');
var http = require("http");
var engine = require('ejs-locals');
var app = express();
var config = require('./config.json');
var url = require('url');

// TODO instead of using VCAP_APP_HOST it should use an ENV var.
var expImpEnabled = typeof(process.env.VCAP_APP_HOST) !== 'undefined';
var playerEnabled = true;

var rabbitmq_url = url.parse(process.env.RABBITMQ_URL)

// split the username and password
var auth = rabbitmq_url.auth.split(":")

app.set('mgmt-user', auth[0] || config.mgmt.user);
app.set('mgmt-pass', auth[1] || config.mgmt.pass);
app.set('mgmt-host', rabbitmq_url.hostname || config.mgmt.host);
app.set('mgmt-port', rabbitmq_url.port || config.mgmt.port);

app.use(express.static(__dirname + '/web'));
app.use(express.bodyParser());
app.use(require('express-blocks'));

app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.engine('html', engine);

function get_auth(user, pass) {
   return 'Basic ' + new Buffer(user + ':' + pass).toString('base64');
}

function get_base_req_opts() {
    return {
        'host': app.get('mgmt-host'),
        'port': app.get('mgmt-port'),
        'headers': {
            'Content-Type': 'application/json',
            'Authorization': get_auth(app.get('mgmt-user'), app.get('mgmt-pass'))
        }
    };
}

app.get('/definitions', function (req, res) {
    var options = get_base_req_opts();
    options.path = '/api/definitions';
    options.method = 'GET';
    var rest = http.request(options, function (response){
        var output = '';
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
            output += chunk;
        });

        response.on('end', function() {
            res.set('Content-Type', 'application/json');
            console.log("sending output:", output);
            res.send(output);
        });
    });
    rest.end();
});

app.post('/definitions', function (req, res) {
    var post_data = JSON.stringify(req.body);
    var options = get_base_req_opts();
    options.path = '/api/definitions';
    options.method = 'POST';
    options.headers['Content-Length'] = post_data.length;
    var rest = http.request(options, function (response){
        var output = '';
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
            output += chunk;
        });

        response.on('end', function() {
            res.set('Content-Type', 'application/json');
            res.send(output);
        });
    });
    rest.write(post_data);
    rest.end();
});

app.get('/', function (req, res) {
    console.log('rendering simulator');
    res.render('simulator', {expImpEnabled: expImpEnabled, playerEnabled: playerEnabled});
});

app.get('/about.html', function (req, res) {
    res.render('about');
});

app.get('/player.html', function (req, res) {
    res.render('player');
});

app.listen(port = process.env.PORT || 3000);
console.log('Listening on port ', port);
console.log("expImpEnabled", expImpEnabled);
