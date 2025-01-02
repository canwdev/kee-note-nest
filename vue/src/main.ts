import pkg from '../package.json'
// 全局设置moment地区语言
import moment from 'moment/moment'
import 'moment/min/locales'
const locale =
  navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language
moment.locale(locale)

/**
 * 输出包版本信息
 */
// @ts-ignore
const timeDisplay = BUILD_TIMESTAMP ? moment(BUILD_TIMESTAMP).format('YYYY-MM-DD HH:mm:ss') : 'N/A'
console.info(
  `%c ${pkg.name} ${import.meta.env.MODE} %c ${timeDisplay} %c`,
  'background:#8F6E63; border-radius: 3px 0 0 3px; padding:2px 0; color: #f9f9f9; font-size: 10px;',
  'background:#f9f9f9; border-radius: 0 3px 3px 0; padding:2px 0; color: #8F6E63; font-size: 10px; font-weight: bold;',
  'background:transparent',
)

import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
// https://pictogrammers.com/library/mdi/
import '@mdi/font/css/materialdesignicons.min.css'

import {createApp} from 'vue'
import 'normalize.css'
import router from './router'
import App from './App.vue'
import {create} from 'naive-ui'
import {createPinia} from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import '@/components/CanUI/packages/ViewPortWindow/theme/index.scss'
import CanUI from '@/components/CanUI'
import './styles/base.scss'

const naive = create()

const app = createApp(App)

app.use(CanUI)
app.use(ElementPlus)

app.use(naive)
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(pinia)
app.use(router)
app.mount('#app')
