import axios from 'axios'

const service = axios.create({
  baseURL: '/api',
  timeout: 5000
})

service.defaults.headers.post['Content-Type'] = 'application/json'
// service.defaults.headers.put['Content-Type'] = 'application/json'

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // console.log('response', response);
    if(response.data.code == 200) {
      return response.data.data
    }
  },
  // 请求失败
  (error) => {
    return Promise.reject(error)
  }
)

export default service