# 大文件上传

[博客地址](https://juejin.cn/post/7224764099187474490)

技术栈：

​	前端：vite + vue3 + element-plus

​	后端：koa2

实现文件切割、分片上传、文件秒传、上传进度条功能。优化了请求的并发控制，失败处理了以及服务器chunk清理。



### 启动项目概要

前台 big-upload

```javascript
// 安装依赖
yarn install
```

```javascript
// 启动服务
yarn dev
```



服务端

```js
// 安装依赖
yarn install
```

```js
// 启动服务
yarn dev
```



