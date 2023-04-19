const CODE = {
  SUCCESS: 200,
  PARAM_ERROR: 100, // 参数错误
  USER_LOGIN_ERROR: 300, // 用户未登录
  BUSINESS_ERROR: 400, // 业务请求失败
  AUTH_ERROR: 500, // 认证失败或TOKEN过期
};

module.exports = {
  /**
   * 分页结构封装
   * @param {number} pageNum
   * @param {number} pageSize
   */
  success(data = "", msg = "", code = CODE.SUCCESS) {
    return {
      code,
      data,
      msg,
    };
  },
  fail(msg = "", code = CODE.BUSINESS_ERROR, data = "") {
    log4j.debug(msg);
    return {
      code,
      data,
      msg,
    };
  }
};