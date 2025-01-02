import {ElMessage, ElMessageBox, ElNotification} from 'element-plus'
import NProgress from 'nprogress'

declare global {
  interface Window {
    $message: ElMessage
    $dialog: ElMessageBox
    $notification: ElNotification
    $loadingBar: NProgress
    $electronAPI: any
  }
}

declare module 'axios' {
  export interface AxiosResponse<T = any> extends Promise<T> {}
}
