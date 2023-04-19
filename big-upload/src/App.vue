<template>
  <h1>大文件上传</h1>
  <input type="file" @change="handleFileChange" />
  <el-button @click="handleUpload">上传</el-button>
  <el-button @click="handlePause" v-if="!isPaused">暂停</el-button>
  <el-button @click="handleResume" v-else>恢复</el-button>
  <div v-show="hashPercentage > 0">
    <h3>计算文件的hash</h3>
    <el-progress :percentage="hashPercentage"></el-progress>
    {{ "计算完成，文件hash为：" + hash }}
  </div>
  <div v-show="uploadPercentage > 0">
    <h3>大文件上传总进度</h3>
    <el-progress :percentage="uploadPercentage"></el-progress>
  </div>
  <div v-show="chunkList.length > 0">
    <h3>分片上传进度</h3>
    <el-table :data="chunkList" style="width: 100%">
      <el-table-column prop="chunkHash" label="分块" width="270">
      </el-table-column>
      <el-table-column
        prop="size"
        label="size(Kb)"
        width="90"
        :formatter="(row, column, value) => Math.floor(value / 1024)"
      >
      </el-table-column>
      <el-table-column prop="percentage" label="上传进度">
        <template #default="scope">
          <el-progress :percentage="scope.row.percentage"></el-progress>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ElMessage } from "element-plus";
import SparkMD5 from "spark-md5";
import { computed, ref, watch } from "vue";
import { uploadChunks, mergeChunks, verifyUpload, test } from "./api/upload";

const SIZE = 3 * 1024 * 1024; // 定义切片的大小
const Status = { wait: 1, error: 2, done: 3, fail: 4 };
const File = ref(null);
const chunkList = ref([]);
const requestList = ref([]);
const worker = ref(null);
const hash = ref("");
const isPaused = ref(false);
const hashPercentage = ref(0);
const controller = ref(null);

// 判断文件是可以秒传
async function VerifyUpload(fileName, fileHash) {
  const { data } = await verifyUpload(JSON.stringify({ fileName, fileHash }));
  console.log("文件秒传判断", data);
  return data;
}

// 计算总文件上传进度
const uploadPercentage = computed(() => {
  if (!File.value || !chunkList.value.length) return 0;
  const loaded = chunkList.value
    .map((item) => item.size * item.percentage)
    .reduce((acc, cur) => acc + cur);
  return parseInt((loaded / File.value.size).toFixed(2));
});

// 监听上传进度来判断是否合并
watch(uploadPercentage, async (val) => {
  console.log("进度", val);
  if (val == 100) {
    await MergeChunks();
  }
});

// 获取文件
function handleFileChange(e) {
  const [file] = e.target.files;
  // console.log(file);
  if (!file) {
    File.value = null;
    return;
  }
  File.value = file;
}

// 点击按钮上传文件
async function handleUpload() {
  const file = File.value;
  if (!file) {
    ElMessage("请选择一个文件吧");
    return;
  }
  resetData();

  // 文件分片
  const fileChunkList = createFileChunk(file);
  hash.value = await calculateHash(fileChunkList);
  // console.log("hash", hash.value);

  const { shouldUpload, uploadList } = await VerifyUpload(
    File.value.name,
    hash.value
  );
  // console.log(shouldUpload);
  // console.log(uploadList);
  if (!shouldUpload) {
    ElMessage.success("秒传：上传成功");
    return;
  }

  chunkList.value = fileChunkList.map(({ file }, index) => {
    return {
      chunk: file,
      size: file.size,
      chunkHash: `${hash.value} - ${index}`,
      fileHash: hash.value,
      index,
      percentage: uploadList.includes(`${hash.value} - ${index}`) ? 100 : 0,
    };
  });

  // console.log("test", await uploadChunks(chunkList.value[0]));
  UploadChunks(uploadList);
}

// 文件分片
function createFileChunk(file, size = SIZE) {
  const fileChunkList = [];
  let cur = 0;
  while (cur < file.size) {
    fileChunkList.push({ file: file.slice(cur, cur + size) });
    cur += size;
  }
  return fileChunkList;
}

// 计算hash
function calculateHash(fileChunkList) {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    const file = File.value;
    const size = file.size;
    let offset = 2 * 1024 * 1024;
    let chunks = [file.slice(0, offset)];

    let cur = offset;
    while (cur < size) {
      // 最后一块全部加进来
      if (cur + offset >= size) {
        chunks.push(file.slice(cur, cur + offset));
      } else {
        // 中间的 前中后去两个字节
        const mid = cur + offset / 2;
        const end = cur + offset;
        chunks.push(file.slice(cur, cur + 2));
        chunks.push(file.slice(mid, mid + 2));
        chunks.push(file.slice(end - 2, end));
      }
      // 前取两个字节
      cur += offset;
    }

    reader.readAsArrayBuffer(new Blob(chunks));
    reader.onload = (e) => {
      spark.append(e.target.result);
      hashPercentage.value = 100;
      resolve(spark.end());
    };
  });
}

// 上传进度监听函数
function onProgress(item) {
  return (e) => {
    item.percentage = parseInt(String((e.loaded / e.total) * 100));
  };
}
// 上传文件切片
async function UploadChunks(uploadedList = []) {
  console.log("开始上传");
  if (controller.value) {
    controller.value = null;
  }
  controller.value = new AbortController();
  requestList.value = chunkList.value
    .filter((chunk) => {
      return !uploadedList.includes(chunk.chunkHash);
    })
    .map(async (item, index) => {
      uploadChunks(
        item,
        onProgress(chunkList.value[chunkList.value.indexOf(item)]),
        controller.value.signal
      ).catch((err) => {
        return;
      });
    });

  await Promise.all(requestList.value)
}

// 通知服务器合并切片
function MergeChunks() {
  mergeChunks(
    JSON.stringify({
      fileName: File.value.name,
      fileSize: File.value.size,
      size: SIZE,
      hash: hash.value,
    })
  );
}

// 暂停上传
function handlePause() {
  console.log("中断上传", controller);
  requestList.value.forEach((element) => {
    controller.value.abort();
  });
  requestList.value = [];
  isPaused.value = true;
}

// 恢复上传
async function handleResume() {
  isPaused.value = false;
  const { uploadList } = await VerifyUpload(File.value.name, hash.value);
  // console.log("恢复上传", uploadList);
  UploadChunks(uploadList);
}

function resetData() {
  chunkList.value = [];
  requestList.value = [];
  hash.value = null;
  hash.value = "";
  hashPercentage.value = 0;
}
</script>
<style lang="scss" scoped></style>
