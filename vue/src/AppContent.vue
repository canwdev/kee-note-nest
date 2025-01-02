<script lang="ts">
import GlobalSettings from '@/components/Settings/GlobalSettings.vue'
import globalEventBus, {GlobalEvents} from '@/utils/bus'
import {kService} from '@/api'
import {useSettingsStore} from '@/store/settings'
import {useKeeStore} from '@/store/kee-store'
import {useBeforeUnload, useUnSavedChanges} from '@/hooks/use-changed'
import {isElectron} from '@/utils/backend'
import electronService from '@/utils/backend/electron'
import {useKeeNoteSaveClose} from '@/hooks/use-keenote'
import {ElMessage, ElMessageBox, ElNotification} from 'element-plus'
import NProgress from 'nprogress'

NProgress.configure({
  showSpinner: false,
})

export default defineComponent({
  components: {
    GlobalSettings,
  },
  emits: ['themeChange'],
  setup() {
    const settingsStore = useSettingsStore()
    const keeStore = useKeeStore()

    window.$message = ElMessage
    window.$dialog = ElMessageBox
    window.$notification = ElNotification
    window.$loadingBar = NProgress

    const {commonCloseDatabase} = useKeeNoteSaveClose()

    const handleClose = () => {
      commonCloseDatabase({isCloseApp: true})
    }

    onMounted(() => {
      globalEventBus.on(GlobalEvents.SHOW_SETTINGS, handleShowSettings)
      globalEventBus.on(GlobalEvents.SAVE_DATABASE, saveAction)

      if (isElectron) {
        electronService.on('IPC_APP_CLOSING', handleClose)
      }
    })
    onBeforeUnmount(() => {
      globalEventBus.off(GlobalEvents.SHOW_SETTINGS, handleShowSettings)
      globalEventBus.off(GlobalEvents.SAVE_DATABASE, saveAction)

      if (isElectron) {
        electronService.off('IPC_APP_CLOSING', handleClose)
      }
    })

    const settingsVisible = ref(false)
    const handleShowSettings = () => {
      settingsVisible.value = true
    }

    const saveAction = async (options: any = {}) => {
      const {resolve, reject} = options
      try {
        if (settingsStore.enableAutoSave) {
          await kService.saveDatabase()
          console.info('Database saved!')
        } else {
          // 如果是手动保存，需要用户手动点击保存按钮，才能写入文件
          keeStore.isNotSave = true
          console.info('Auto save disabled')
        }
        resolve()
      } catch (e) {
        reject(e)
      }
    }

    // 提示用户不要直接关闭页面
    useBeforeUnload(() => keeStore.isNotSave)

    return {
      settingsVisible,
    }
  },
})
</script>
<template>
  <AutoRouterView />
  <GlobalSettings v-model:visible="settingsVisible" />
</template>
