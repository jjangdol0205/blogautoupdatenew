const fs = require('fs');
let text = fs.readFileSync('d:/autoblog3/src/app/api/generate/route.ts', 'utf8').replace(/\r\n/g, '\n');
const startStr = '    let personaGuidance = "";\n    if (category === \'brandconnect\') {';
const endStr = '    } else {\n      personaGuidance = \';
const finalEndStr = '\;\n    }';

let startIndex = text.indexOf(startStr);
if (startIndex !== -1) {
    let elseIndex = text.indexOf(endStr, startIndex);
    if (elseIndex !== -1) {
        let afterElseIndex = elseIndex + endStr.length;
        let finalEndIndex = text.indexOf(finalEndStr, afterElseIndex);
        if (finalEndIndex !== -1) {
            let personaText = text.substring(afterElseIndex, finalEndIndex);
            let newBlock = '    let personaGuidance = \\n' + personaText.trim() + '\n\;';
            
            let result = text.substring(0, startIndex) + newBlock + text.substring(finalEndIndex + finalEndStr.length);
            fs.writeFileSync('d:/autoblog3/src/app/api/generate/route.ts', result);
            console.log('done');
        } else {
            console.log('finalEndIndex not found');
        }
    } else {
        console.log('elseIndex not found');
    }
} else {
    console.log('startIndex not found');
}
