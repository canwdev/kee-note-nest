import {NButton} from 'naive-ui'
import {isElectron} from '@/utils/backend'
import {marked} from 'marked'
import {useMainStore} from '@/store/main'
import {useSettingsStore} from '@/store/settings'
import {electronCommonApi} from '@/api/electron'
import {StOptionItem, StOptionType} from '@/components/CanUI/packages/OptionUI/enum'

export const useAppSettings = () => {
  const mainStore = useMainStore()
  const settingsStore = useSettingsStore()
  const isLoading = ref(false)
  const serverLogMessage = ref('')

  const serverManagerOption = computed((): StOptionItem => {
    return {
      label: 'Electron App Config',
      key: 'electron',
      children: [
        {
          label: 'Window Content Protection',
          subtitle: 'Prevents the window contents from being captured by other apps.',
          key: 'isContentProtection',
          store: settingsStore,
          type: StOptionType.SWITCH,
        },
        {
          label: 'Nest.js Server',
          subtitle: mainStore.isServerRunning
            ? serverLogMessage.value
            : 'Run KeeNote on a webpage!',
          key: 'enable_server',
          type: StOptionType.BUTTON,
          props: {
            onClick: async () => {
              await doToggleServer({toggle: !mainStore.isServerRunning})
            },
            disabled: isLoading.value,
          },
          value: isLoading.value ? '...' : mainStore.isServerRunning ? 'Stop' : 'Start',
        },
      ],
    }
  })

  const doToggleServer = async (params) => {
    try {
      isLoading.value = true
      const res = await electronCommonApi.electronToggleServer(params)
      mainStore.isServerRunning = res.running
      serverLogMessage.value = marked.parse(res.logMessage)
    } catch (e) {
    } finally {
      isLoading.value = false
    }
  }

  onMounted(async () => {
    if (isElectron) {
      await doToggleServer({getStatusOnly: true})
      if (mainStore.isServerRunning) {
        window.$notification.success({
          title: 'Server auto started!',
          dangerouslyUseHTMLString: true,
          message: serverLogMessage.value,
        })
      }
    }
  })

  return {
    serverManagerOption,
  }
}
