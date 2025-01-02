import axios from 'axios'
import {MyCrypt} from '@/utils/my-crypt'
import globalEventBus, {GlobalEvents} from '@/utils/bus'
import {LsKeys} from '@/enum'

function Service(config: any) {
  const {
    baseURL,
    withCredentials = false,
    timeout,
    headers,
    isAuth = true,
    isToast = true,
    isRawResponse = false,
    encryptionKey = import.meta.env.VITE_KN_HTTP_CRYPT_KEY ||
      localStorage.getItem(LsKeys.LS_KEY_KN_HTTP_CRYPT_KEY),
  } = config || {}

  let myCrypt: MyCrypt
  if (encryptionKey) {
    myCrypt = new MyCrypt(encryptionKey)
  }

  // globalEventBus.on(GlobalEvents.UPDATE_KN_HTTP_CRYPT_KEY, (myCryptKey) => {
  //   if (myCrypt) {
  //     myCrypt.setKey(String(myCryptKey))
  //   } else {
  //     myCrypt = new MyCrypt(String(myCryptKey))
  //   }
  // })

  // 创建 axios 实例
  const service = axios.create({
    baseURL,
    withCredentials, // send cookies when cross-domain requests
    timeout, // request timeout
    headers, // 请求头部
  })

  // 请求 拦截器
  service.interceptors.request.use(
    (config) => {
      window.$loadingBar.start()
      if (isAuth) {
        const Authorization = localStorage.getItem(LsKeys.LS_KEY_AUTHORIZATION)
        if (Authorization) {
          // @ts-ignore
          config.headers.Authorization = 'bearer ' + Authorization
        }
      }

      if (myCrypt) {
        // 加密请求
        // console.log('config1', config)
        if (
          /post/gi.test(<string>config.method) &&
          config.data &&
          !(config.data instanceof FormData)
        ) {
          config.data = {
            ie: true,
            main: myCrypt.encrypt(JSON.stringify(config.data)),
          }
        } else if (/get/gi.test(<string>config.method) && config.params) {
          // console.log(config.params)
          config.params = {
            ie: true,
            main: myCrypt.encrypt(JSON.stringify(config.params)),
          }
        }
      }

      return config
    },
    (error) => Promise.reject(error),
  )

  // 响应 拦截器
  service.interceptors.response.use(
    (response) => {
      if (isRawResponse) {
        return response
      }
      let {data} = response
      try {
        // 解密请求
        if (myCrypt && data.ie) {
          const decrypted = myCrypt.decrypt(data.main) || 'null'
          // console.log('dd', decrypted)
          data = JSON.parse(decrypted)
        }
      } catch (error: any) {
        window.$message.error(error.message)
        window.$loadingBar.done()
        return Promise.reject(error)
      }
      window.$loadingBar.done()
      return data
    },
    (error) => {
      let message = error.message
      let backendMessage
      const {response} = error || {}

      // extract backend message
      if (response && response.data) {
        const {data} = response
        if (data.message) {
          backendMessage = data.message
        }
      }

      // extract backend message
      backendMessage = response?.data?.message

      if (isToast) {
        if (backendMessage) {
          window.$notification.error({
            message: backendMessage,
            title: message,
          })
        } else {
          window.$message.error(message)
        }
      }
      window.$loadingBar.done()
      return Promise.reject(error)
    },
  )

  return service
}

export default Service
