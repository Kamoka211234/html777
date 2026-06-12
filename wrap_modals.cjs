const fs = require('fs');

let content = fs.readFileSync('components/App.tsx', 'utf8');

const startMarker = "{showFindModal && <FindModal";
const endMarker = "{showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker) + endMarker.length;

if (startIndex !== -1 && endIndex !== -1) {
    let subContent = content.substring(startIndex, endIndex);
    
    // Add keys to all modals
    const regex = /{([a-zA-Z0-9_\.]+(?: &&|\.visible &&) \()?\s*<([a-zA-Z0-9_]+)/g;
    subContent = subContent.replace(regex, (match, prefix, tagName) => {
        if (!match.includes('key=')) {
            return match + ` key="${tagName}"`;
        }
        return match;
    });

    const newSubContent = `<AnimatePresence>\n      ` + subContent + `\n      </AnimatePresence>`;
    
    content = content.substring(0, startIndex) + newSubContent + content.substring(endIndex);
    fs.writeFileSync('components/App.tsx', content);
    console.log("Successfully wrapped modals in App.tsx!");
} else {
    console.log("Could not find markers.", startIndex, endIndex);
}
