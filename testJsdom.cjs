const { JSDOM } = require("jsdom");
const fs = require('fs');

const dom = new JSDOM(fs.readFileSync('output.html', 'utf8'), { runScripts: "dangerously" });
setTimeout(() => {
    console.log("Iframe srcdoc:", dom.window.document.getElementById('app-frame').srcdoc);
}, 500);
