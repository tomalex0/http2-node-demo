const http2         = require('http2');
const http         = require('http');
const fs            = require('fs');
const path          = require('path');
const finalhandler  = require('finalhandler');
const Router        = require('router');
const serveStatic   = require('serve-static');
const url           = require('url');

const staticFolder = "public";

const { HTTP2_HEADER_PATH } = http2.constants

let staticFiles = require('./controller/staticfiles');

let staticFileMap;

staticFiles.getStaticFiles(staticFolder).then(function(filemap){
    staticFileMap = filemap;
});

function push (stream, path) {
    const file = staticFileMap.get(path);

    if (!file) {
        stream.respond({
            'content-type': 'text/html',
            ':status': 404
        });
        return;
    }

    stream.pushStream({ [HTTP2_HEADER_PATH]: path }, (pushStream) => {
        pushStream.respondWithFD(file.fileDescriptor, file.headers)
    });
}


const options = {
    key: fs.readFileSync('./ssl/server.key'),
    cert: fs.readFileSync('./ssl/server.crt')
};

var router = Router();



router.use('/',serveStatic(path.resolve(__dirname,`${staticFolder}`)));

router.get('/', function (req, res) {


    let query = url.parse(req.url, true).query;

    let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Home</title>
            <link href="/assets/css/bootstrap.min.css" rel="stylesheet" type="text/css" />
            <link href="/assets/css/bootstrap-grid.min.css" rel="stylesheet" type="text/css" />
            <link href="/assets/css/bootstrap-reboot.min.css" rel="stylesheet" type="text/css" />
            <link href="/assets/css/styles.css" rel="stylesheet" type="text/css" />
            
        </head>
        <body>
            <section class="jumbotron text-center">
              <div class="container">
                <h1 class="jumbotron-heading">Album example</h1>
                <p class="lead text-muted">Something short and leading about the collection below—its contents, the creator, etc. Make it short and sweet, but not too short so folks don't simply skip over it entirely.</p>
                <p>
                  <a href="#" class="btn btn-primary">Main call to action</a>
                  <a href="#" class="btn btn-secondary">Secondary action</a>
                </p>
              </div>
            </section>
            <div class="album text-muted">
                <div class="container">
                    <div class="row">
                        <div class="card">
                            <img src="/assets/images/1.jpeg" alt="Card image cap">
                            <p class="card-text">This is a wider card with supporting text below as a natural lead-in to additional content. This content is a little bit longer.</p>
                        </div>
                        <div class="card">
                            <img src="/assets/images/2.jpeg" alt="Card image cap">
                            <p class="card-text">This is a wider card with supporting text below as a natural lead-in to additional content. This content is a little bit longer.</p>
                        </div>
                        <div class="card">
                            <img src="/assets/images/3.jpeg" alt="Card image cap">
                            <p class="card-text">This is a wider card with supporting text below as a natural lead-in to additional content. This content is a little bit longer.</p>
                        </div>    
                    </div>
                </div>
            </div>    
             
            <script src="/assets/js/jquery-3.1.1.slim.min.js"></script>
            <script src="/assets/js/tether.min.js"></script>
            <script src="/assets/js/bootstrap.min.js"></script>
            <script src="/assets/js/app.js"></script>
        </body>
        </html>
    `;

    if(res.stream && res.stream.push && !query.skip_push) {
        push(res.stream, '/assets/css/bootstrap.min.css');
        push(res.stream, '/assets/css/bootstrap-grid.min.css');
        push(res.stream, '/assets/css/bootstrap-reboot.min.css');
        push(res.stream, '/assets/css/styles.css');
        push(res.stream, '/assets/js/jquery-3.1.1.slim.min.js');
        push(res.stream, '/assets/js/tether.min.js');
        push(res.stream, '/assets/js/bootstrap.min.js');
        push(res.stream, '/assets/js/app.js');
        push(res.stream, '/assets/images/1.jpeg');
        push(res.stream, '/assets/images/2.jpeg');
        push(res.stream, '/assets/images/3.jpeg');

    }

    res.end(html);

});


let http2SecureOptions = Object.assign({
    allowHTTP1: true
},options);

// Create a secure HTTP/2 server
http2
    .createSecureServer(http2SecureOptions,(req, res) => {
        router(req, res, finalhandler(req, res))
    })
    .listen(8080,function () {
        console.log(`Http2 running in port ${this.address().port}`);
    });


//Create http server
http
    .createServer((req, res) => {
        router(req, res, finalhandler(req, res))
    })
    .listen(8082,function () {
        console.log(`Http running in port ${this.address().port}`);
    });
