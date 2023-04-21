const fse = require("fs-extra");
const path = require("path");
const schedule = require("node-schedule");

const UPLOAD_DIR = path.resolve(__dirname, "..", "target");

// 空目录删除
function remove(file, stats) {
  const now = new Date().getTime();
  // console.log('stats', stats);
  console.log("file", file);
  const offset = now - stats.ctimeMs;
  if (offset > 2 * 60 * 1000) {
    fse.unlinkSync(file);
    console.log(file, "文件过期，删除");
  }
}

async function scan(dir, callback) {
  const files = await fse.readdirSync(dir);
  files.forEach(async (filename) => {
    const fileDir = path.resolve(dir, filename);
    const stats = await fse.statSync(fileDir);
    // 删除文件
    if (stats.isDirectory()) {
      scan(fileDir, remove);
      // 删除空文件夹
      if (fse.readdirSync(fileDir).length == 0) {
        fse.rmdirSync(fileDir);
      }
      return;
    }
    if(callback) {
      callback(fileDir, stats)
    }
  });
}

// scheduleJob参数
// * * * * * *
// ┬ ┬ ┬ ┬ ┬ ┬
// │ │ │ │ │ │
// │ │ │ │ │ └ day of week (0 - 7) (0 or 7 is Sun)
// │ │ │ │ └───── month (1 - 12)
// │ │ │ └────────── day of month (1 - 31)
// │ │ └─────────────── hour (0 - 23)
// │ └──────────────────── minute (0 - 59)
// └───────────────────────── second (0 - 59, OPTIONAL)
let start = function () {
  // 每5秒
  schedule.scheduleJob("*/5 * * * * *", function () {
    console.log("定时清理chunks开始");
    scan(UPLOAD_DIR);
  });
};

start();
