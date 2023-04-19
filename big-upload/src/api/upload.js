import request from "../utils/request";

export const uploadChunks = (data, onProgress, signal) => {
  return request({
    url: "/upload/chunk",
    method: "POST",
    data,
    headers: {
      "Content-type": "multipart/form-data;charset=UTF-8",
    },
    onUploadProgress: onProgress,
    signal
  });
};

export const mergeChunks = (data) => {
  return request({
    url: "/upload/merge",
    method: "post",
    data,
  });
};

export const verifyUpload = (data) => {
  return request({
    url: "upload/verify",
    method: "post",
    data
  })
}

export const test = (data) => {
  return request({
    url: "/upload/a",
    method: "POST",
    data: {
      formData: data,
    },
  });
};
