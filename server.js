const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let f = req.url === '/' ? 'index.html' : req.url.slice(1);
    // Strip query parameters
    f = f.split('?')[0];
    const fp = path.join(process.cwd(), f);
    fs.readFile(fp, (e, d) => {
        if (e) { res.writeHead(404); res.end('Not found'); return; }
        const ext = path.extname(fp);
        const ct = { 'html': 'text/html', 'css': 'text/css', 'js': 'application/javascript', 'svg': 'image/svg+xml', 'png': 'image/png', 'jpg': 'image/jpeg', 'webp': 'image/webp' };
        res.writeHead(200, { 'Content-Type': ct[ext.slice(1)] || 'text/plain' });
        res.end(d);
    });
});

server.listen(8081, () => {
    console.log('Server running on http://localhost:8081');
});
