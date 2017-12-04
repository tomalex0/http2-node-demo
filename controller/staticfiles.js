const { promisify } = require('util');
const { resolve } = require('path');
const fs = require('fs');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const fstat = promisify(fs.fstat);
const open = promisify(fs.open);
const mime = require('mime');


function stringReplaceAll(content, str1, str2, ignore){
    return content.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,'\\$&'),(ignore?'gi':'g')),(typeof(str2)=='string')?str2.replace(/\$/g,'$$$$'):str2);
};

async function getFilesData(files, dirName) {
    const filesmap = new Map();

    await Promise.all(files.map(async (res) => {
        const contentType = mime.lookup(res);
        const fileDescriptor = await open(res, 'r');
        const filestat = await fstat(fileDescriptor);
        let filePath = stringReplaceAll(res.split(dirName)[1],'\\','/');
        filesmap.set(`${filePath}`, {
            fileDescriptor,
            headers: {
                'content-length': filestat.size,
                'last-modified': filestat.mtime.toUTCString(),
                'content-type': contentType
            }
        });
    }));

    return filesmap;


}
//http://2ality.com/2016/10/async-function-tips.html
async function getFiles(dir) {
    const filesmap = new Map();
    const subdirs = await readdir(dir);

    const files = await Promise.all(subdirs.map(async (subdir) => {
        const res = resolve(dir, subdir);

        let isDirectory = (await stat(res)).isDirectory();

        return isDirectory ? getFiles(res) : res;
    }));

    return files.reduce((a, f) => a.concat(f), []);

}

module.exports.getStaticFiles = async function(staticFolder) {
    let files = await  getFiles(`./${staticFolder}`);
    let filemap = await  getFilesData(files, staticFolder);
    return filemap;
}


