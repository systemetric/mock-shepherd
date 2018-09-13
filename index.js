const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const unzip = require("./unzip");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const outPath = path.join(__dirname, "out");
!fs.existsSync(outPath) && fs.mkdirSync(outPath);

app.post("/upload/upload", upload.single("uploaded_file"), (req, res) => {
  unzip.unzipBuffer(req.file.buffer, outPath, err => {
    if (err) console.log(err);
    res.status(err ? 500 : 204);
    res.send(err);
  });
});

app.get("/run/output", (_req, res) => {
  res.send("Logs!");
});

const port = parseInt(process.env.SHEPHERD_PORT) || 4000;
app.listen(port, () => {
  console.log(`[INFO] Server running on port: ${port}`);
});
