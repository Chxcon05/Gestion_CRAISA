// Mock DOM
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('leads.html', 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost:8081/leads.html' });
const document = dom.window.document;
const window = dom.window;

// Execute the script
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>', scriptStart);
const script = html.substring(scriptStart + 8, scriptEnd);

try {
    eval(script);
    console.log('Script executed successfully');
    console.log('leadsBody.innerHTML length:', document.getElementById('leadsBody').innerHTML.length);
} catch (e) {
    console.log('ERROR:', e.message);
    console.log(e.stack);
}
"