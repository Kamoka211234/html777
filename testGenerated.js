const bundleFunctionString = `
            html = html.replace(/<link\\s+[^>]*>/gi, (match) => { 
                return '<REPLACED>'; 
            });
`;

let html = '<link rel="stylesheet" href="style.css">';
// Simulate the parsing the browser does
const generatedCode = bundleFunctionString;
console.log(generatedCode);
const func = new Function('html', 'return ' + generatedCode.replace('html = ', ''));
console.log("Run:", func(html));
