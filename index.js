#!/usr/bin/env node

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const childProcess = require("child_process");
const createCanvas = require("canvas");
const unzip = require("./unzip");

const randomColourPart = () => Math.floor(Math.random() * 255);
const randomColour = () =>
  `rgb(${randomColourPart()},${randomColourPart()},${randomColourPart()})`;

const WIDTH = 1280;
const HEIGHT = 720;
const BLOCK = 50;

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const outPath = path.join(__dirname, "out");

let imageTime = Date.now();
let logs = "Random logs\n";
function updateImageTime() {
  setTimeout(() => {
    imageTime = Date.now();
    if(logs.length < 500) {
      logs += Math.random() + "\n";
    } else {
      logs = "Random logs\n";
    }
    updateImageTime();
  }, (Math.floor(Math.random() * 3) + 1) * 1000);
}
updateImageTime();

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "index.txt")));

let child = {
  process: null,
  log: ""
};

const logData = data => {
  child.log += data;
  console.log(`[LOG] ${data.toString().trim()}`);
};

const killProcess = () => {
  if (child.process) {
    child.process.kill("SIGINT");
    console.log("[INFO] Killed process!");
  }
};

const port = parseInt(process.argv[process.argv.length - 1]) || 8080;

app.post("/upload/upload", upload.single("uploaded_file"), (req, res) => {
  killProcess();
  child.log = "";

  const respond = err => {
    console.log(err ? `[ERROR] ${err}` : "[INFO] Uploaded!");
    res.status(err ? 500 : 204);
    res.send(err);
  };

  console.log(`[INFO] Uploading ${req.file.originalname}...`);

  rimraf(outPath, err => {
    err
      ? respond(err)
      : setTimeout(() => {
          fs.mkdir(outPath, err => {
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
        }, 100);
  });
});

app.post("/run/start", (_req, res) => {
  console.log("[INFO] Received start request!");

  killProcess();
  child.log = "";

  console.log("[INFO] Spawning process...");
  child.process = childProcess.spawn("python", [
    "-u",
    path.join(outPath, "main.py")
  ]);
  child.process.stdout.on("data", logData);
  child.process.stderr.on("data", logData);
  child.process.on("close", () => {
    child.process = null;
    console.log("[INFO] Process terminated!");
  });

  res.sendStatus(204);
});

app.post("/run/stop", (_req, res) => {
  console.log("[INFO] Received stop request!");

  killProcess();
  child.process = null;

  res.sendStatus(204);
});

app.get("/run/output", (_req, res) => {
  res.send(child.log || logs);
});

app.get("/static/image.jpg", (_req, res) => {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < HEIGHT / BLOCK; y++) {
    for (let x = 0; x < WIDTH / BLOCK; x++) {
      ctx.fillStyle = randomColour();
      ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
    }
  }

  const text = `${new Date().toLocaleTimeString()} [${port}]`;

  ctx.font = "100px sans-serif";
  let bounds = ctx.measureText(text);

  const backWidth = bounds.width + 50;
  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.fillRect(
    (WIDTH - backWidth) / 2,
    (HEIGHT - (bounds.emHeightAscent + bounds.emHeightDescent)) / 2,
    backWidth,
    bounds.emHeightAscent + bounds.emHeightDescent
  );

  ctx.fillStyle = "white";
  ctx.fillText(
    text,
    (WIDTH - bounds.width) / 2,
    (HEIGHT + bounds.emHeightAscent - bounds.emHeightDescent) / 2
  );

  // Simulates network delay
  setTimeout(() => {
    res.contentType("image/jpeg");
    canvas.createJPEGStream().pipe(res);
  }, 500);
});

app.get("/static/imgtime.txt", (_req, res) => {
  res.send(imageTime.toString());
});

app.listen(port, () => {
  console.log(`[INFO] Server running on port: ${port}`);
});
