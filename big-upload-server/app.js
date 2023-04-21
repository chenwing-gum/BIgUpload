const Koa = require("koa");
const app = new Koa();
const views = require("koa-views");
const json = require("koa-json");
const onerror = require("koa-onerror");
const bodyparser = require("koa-bodyparser");
const logger = require("koa-logger");
const { koaBody } = require('koa-body');

const index = require("./routes/index");
const users = require("./routes/users");
const upload = require("./routes/upload");

require('./schedule/chunkClearShedult')

// error handler
onerror(app);

// middlewares
app.use(
  bodyparser({
    enableTypes: ["json", "form", "text"],
  })
);

// app.use(koaBody({multipart:true}));

app.use(json());
app.use(logger());
app.use(require("koa-static")(__dirname + "/public"));

app.use(
  views(__dirname + "/views", {
    extension: "pug",
  })
);

// logger
app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

// 跨域
app.use(async (ctx, next) => {
  ctx.set("Access-Control-Allow-Origin", "*");
  ctx.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild"
  );
  console.log(ctx);
  // if (ctx.method == 'OPTIONS') {
  //   ctx.status = 200;
  // } else {
  await next();
  // }
});

// routes
app.use(index.routes(), index.allowedMethods());
app.use(users.routes(), users.allowedMethods());
app.use(upload.routes(), upload.allowedMethods());

// error-handling
app.on("error", (err, ctx) => {
  console.error("server error", err, ctx);
});

module.exports = app;
