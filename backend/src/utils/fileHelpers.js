const fs = require('fs');
const path = require('path');

const jsonFolderPath = path.join(__dirname, '../json');

const writeJsonToFile = (fileName, data) => {
    const filePath = path.join(jsonFolderPath, `${fileName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

const readJsonFromFile = (fileName) => {
    const filePath = path.join(jsonFolderPath, `${fileName}.json`);
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    }
    return null;
};

module.exports = {
    writeJsonToFile,
    readJsonFromFile
};