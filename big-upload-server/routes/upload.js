const router = require("koa-router")();
const path = require("path");
const fse = require("fs-extra");
const util = require("../utils/utils");
const { koaBody } = require("koa-body");

router.prefix("/upload");

// 大文件存储目录
const UPLOAD_DIR = path.resolve(__dirname, "..", "target");

// 提取文件后缀名
const extractExt = (filename) =>
  filename.slice(filename.lastIndexOf("."), filename.length);

// 返回已经上传的切片名列表
const createUploadedList = async (fileHash) => {
  // console.log("fileHash --->", fileHash);
  return fse.existsSync(path.resolve(UPLOAD_DIR, `${fileHash}-chunks`))
    ? await fse.readdir(path.resolve(UPLOAD_DIR, `${fileHash}-chunks`))
    : [];
};

/**
 * 针对 path 创建 readStream 并写入 writeStream,写入完成之后删除文件
 * @param {String} path
 * @param {String} writeStream
 */
const pipeStream = (path, writeStream) =>
  new Promise((resolve) => {
    const readStream = fse.createReadStream(path);
    readStream.on("end", () => {
      fse.unlinkSync(path);
      resolve();
    });
    readStream.pipe(writeStream);
  });

/**
 * 读取所有的 chunk 合并到 filePath 中
 * @param {String} filePath 文件存储路径
 * @param {String} chunkDir chunk存储文件夹名称
 * @param {String} size 每一个chunk的大小
 */
async function mergeFileChunk(filePath, chunkDir, size) {
  // 获取chunk列表
  const chunkPaths = await fse.readdir(chunkDir);
  // 根据切片下标进行排序  否则直接读取目录的获得的顺序可能会错乱
  chunkPaths.sort((a, b) => a.split("-")[1] - b.split("-")[1]);
  await Promise.all(
    chunkPaths.map((chunkPath, index) =>
      pipeStream(
        path.resolve(chunkDir, chunkPath),
        // 指定位置创建可写流
        fse.createWriteStream(filePath, {
          start: index * size,
          end: (index + 1) * size,
        })
      )
    )
  );
  fse.rmdirSync(chunkDir); // 合并后删除保存切片的目录
}

// 上传chunk
router.post("/chunk", koaBody({ multipart: true }), async (ctx, next) => {
  // // 模拟请求失败
  // if (Math.random() > 0.5) {
  // ctx.status = 500;
  // return;
  // }
  const { chunkHash, fileHash } = ctx.request.body;
  const { chunk } = ctx.request.files;
  // console.log('chunk ==>', chunk);
  const chunkDir = path.resolve(UPLOAD_DIR, `${fileHash}-chunks`);
  // // 切片目录不存在，创建切片目录
  if (!fse.existsSync(chunkDir)) {
    await fse.mkdirs(chunkDir);
  }
  await fse.move(chunk.filepath, `${chunkDir}/${chunkHash}`);
  ctx.body = util.success({ code: 200, data: "", msg: "上传成功" });
});

// chunk合并
router.post("/merge", async (ctx, next) => {
  const { fileName, fileSize, size, hash } = ctx.request.body;
  // console.log('data ====>', ctx.request.body);
  const ext = extractExt(fileName);
  const filePath = path.resolve(UPLOAD_DIR, `${hash}${ext}`);
  const chunkDir = path.resolve(UPLOAD_DIR, `${hash}-chunks`);
  await mergeFileChunk(filePath, chunkDir, size);
  ctx.body = util.success({ code: 200, data: "", msg: "合并成功" });
});

// 验证文件是否存在
router.post("/verify", async (ctx, next) => {
  const { fileName, fileHash } = ctx.request.body;
  // console.log("fileName", fileName);
  // console.log("fileHash", fileHash);
  let shouldUpload = true;
  let msg = "文件不存在，需要上传";
  const ext = extractExt(fileName);
  const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${ext}`);
  if (fse.existsSync(filePath)) {
    shouldUpload = false;
    msg = "文件存在，不需要上传";
  }
  ctx.body = util.success({
    code: 200,
    data: { shouldUpload, uploadList: await createUploadedList(fileHash), msg },
  });
});

router.post("/a", function (ctx, next) {
  // console.log("data ==>", ctx.request.body);
  // console.log("file ==>", ctx.request.files);
  ctx.body = util.success("this is a upload response!", "请求成功");
});

module.exports = router;
