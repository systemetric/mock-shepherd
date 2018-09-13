const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const childProcess = require("child_process");

const unzip = require("./unzip");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const outPath = path.join(__dirname, "out");
!fs.existsSync(outPath) && fs.mkdirSync(outPath);

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "index.txt")));

let child = {
  process: null,
  log: ""
};

const logData = data => (child.log += data);

const killProcess = () => child.process && child.process.kill("SIGINT");

app.post("/upload/upload", upload.single("uploaded_file"), (req, res) => {
  killProcess();
  child.log = "";

  const respond = err => {
    if (err) console.log(err);
    res.status(err ? 500 : 204);
    res.send(err);
  };

  rimraf(outPath, err => {
    err
      ? respond(err)
      : fs.mkdir(outPath, err => {
          err
            ? respond(err)
            : req.file.mimetype === "application/zip"
              ? unzip.unzipBuffer(req.file.buffer, outPath, respond)
              : fs.writeFile(
                  path.join(outPath, "main.py"),
                  req.file.buffer,
                  respond
                );
        });
  });
});

app.post("/run/run", (_req, res) => {
  killProcess();
  child.log = "";

  child.process = childProcess.spawn("python", [
    "-u",
    path.join(outPath, "main.py")
  ]);
  child.process.stdout.on("data", logData);
  child.process.stderr.on("data", logData);
  child.process.on("close", () => (child.process = null));

  res.sendStatus(204);
});

app.post("/run/stop", (_req, res) => {
  killProcess();
  child.process = null;

  res.sendStatus(204);
});

app.get("/run/output", (_req, res) => {
  res.send(child.log);
});

const port = parseInt(process.env.SHEPHERD_PORT) || 4000;
app.listen(port, () => {
  console.log(`[INFO] Server running on port: ${port}`);
});
