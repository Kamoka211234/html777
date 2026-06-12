const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'components', 'modals');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
   const filepath = path.join(dir, file);
   let content = fs.readFileSync(filepath, 'utf8');
   
   if (!content.includes('motion/react')) {
       content = content.replace(/import React(.*?);/, "import React$1;\nimport { motion, AnimatePresence } from 'motion/react';");
   }
   
   // Replace the first opening <div className="fixed inset-0 ..."> with motion.div
   if (content.includes('<div className="fixed inset-0')) {
       // Replace first match
       let isMatched = false;
       content = content.replace(/<div\s+className="fixed inset-0[^>]*>/, (match) => {
           if (isMatched) return match;
           isMatched = true;
           return match.replace('<div', '<motion.div \ninitial={{ opacity: 0 }}\nanimate={{ opacity: 1 }}\nexit={{ opacity: 0 }}\ntransition={{ duration: 0.15 }}\n');
       });
       
       if (isMatched) {
           // We need to replace the outermost closing div!
           const lastDivIdx = content.lastIndexOf('</div>');
           if (lastDivIdx !== -1) {
               content = content.substring(0, lastDivIdx) + '</motion.div>' + content.substring(lastDivIdx + 6);
           }
           fs.writeFileSync(filepath, content);
           console.log("Modified " + file);
       }
   }
}
console.log("Done");
