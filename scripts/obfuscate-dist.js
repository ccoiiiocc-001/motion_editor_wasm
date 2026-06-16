const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const OBFUSCATION_OPTIONS = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    numbersToExpressions: true,
    simplify: true,
    stringArray: true,
    stringArrayThreshold: 0.75,
    stringArrayEncoding: ['base64'],
    splitStrings: true,
    unicodeEscapeSequence: true
};

function getAllJsFiles(dirPath, fileList = []) {
    if (!fs.existsSync(dirPath)) return fileList;
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            getAllJsFiles(filePath, fileList);
        } else if (filePath.endsWith('.js') && !filePath.includes('fabric.min.js') && !filePath.includes('fabric_unminified.js')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

function runObfuscation() {
    const targetDirs = [
        path.join(__dirname, '../dist_web/js'),
        path.join(__dirname, '../dist_web/effect_editor')
    ];

    let allFiles = [];
    targetDirs.forEach(dir => {
        allFiles = allFiles.concat(getAllJsFiles(dir));
    });

    console.log(`Found ${allFiles.length} JavaScript files to obfuscate.`);

    allFiles.forEach(file => {
        try {
            console.log(`Obfuscating: ${file}`);
            const code = fs.readFileSync(file, 'utf8');
            const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, OBFUSCATION_OPTIONS);
            fs.writeFileSync(file, obfuscatedResult.getObfuscatedCode(), 'utf8');
        } catch (err) {
            console.error(`Error obfuscating file ${file}:`, err);
        }
    });

    console.log('Obfuscation process completed successfully.');
}

runObfuscation();
