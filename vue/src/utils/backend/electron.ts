export default {
  async post(url, params, options) {
    // console.log('post1', {url, params})
    try {
      window.$loadingBar.start()
      let res = await window.$electronAPI.ipcInvoke(url, params)
      if (options && options.responseType === 'blob') {
        // 模拟 axios 的blob文件下载
        res = new Blob([res])
      }
      window.$loadingBar.done()
      return res
    } catch (error: any) {
      window.$notification.error({
        message: error.message,
        title: 'Backend Message',
      })
      window.$loadingBar.done()
      return Promise.reject(error)
    }
  },
  on(channel, listener) {
    window.$electronAPI.on(channel, listener)
  },
  off(channel, listener) {
    window.$electronAPI.off(channel, listener)
  },
}
