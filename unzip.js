const yauzl = require("yauzl");
const fs = require("fs");
const path = require("path");

module.exports.unzipBuffer = function(buffer, outputPath, callback) {
  yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
    if (err) {
      callback(err);
      return;
    }
    zipfile.readEntry();
    zipfile.on("entry", entry => {
      const outputFilePath = path.join(outputPath, entry.fileName);
      if (/\/$/.test(entry.fileName)) {
        // Directory
        fs.existsSync(outputFilePath)
          ? zipfile.readEntry()
          : fs.mkdir(
              outputFilePath,
              err => (err ? callback(err) : zipfile.readEntry())
            );
      } else {
        // File
        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) {
            callback(err);
            return;
          }
          readStream.on("end", () => {
            zipfile.readEntry();
          });
          readStream.pipe(fs.createWriteStream(outputFilePath));
        });
      }
    });
    zipfile.on("end", () => {
      callback();
    });
  });
};
