import {useSettingsStore} from '@/store/settings'
import {LdThemeType} from '@/enum/settings'

import {useMainStore} from '@/store/main'
import {LsKeys} from '@/enum'
import {createOrFindStyleNode} from '@/utils/dom'
import {getSystemIsDarkMode, hexToRgb} from '@/utils/color'
import {useElementPlusTheme} from '@/hooks/use-element-plus-theme'

export const useGlobalTheme = () => {
  const mainStore = useMainStore()
  const settingsStore = useSettingsStore()

  const handleThemeChange = (val: LdThemeType) => {
    if (val === LdThemeType.SYSTEM) {
      mainStore.isAppDarkMode = getSystemIsDarkMode()
    } else if (val === LdThemeType.LIGHT) {
      mainStore.isAppDarkMode = false
    } else if (val === LdThemeType.DARK) {
      mainStore.isAppDarkMode = true
    }
    settingsStore.ldTheme = val
  }

  handleThemeChange(settingsStore.ldTheme)

  const handleSystemThemeChange = (event: any) => {
    if (settingsStore.ldTheme === LdThemeType.SYSTEM) {
      mainStore.isAppDarkMode = Boolean(event.matches)
    }
  }

  watch(() => settingsStore.ldTheme, handleThemeChange)

  const isAppDarkMode = computed(() => mainStore.isAppDarkMode)

  watch(
    isAppDarkMode,
    (val) => {
      if (val) {
        document.body.classList.add('_dark')

        // Element Plus 暗黑模式 https://element-plus.org/zh-CN/guide/dark-mode.html
        document.documentElement.classList.add('dark')
      } else {
        document.body.classList.remove('_dark')
        document.documentElement.classList.remove('dark')
      }
    },
    {immediate: true},
  )

  const {changeTheme} = useElementPlusTheme(settingsStore.themeColor)

  const updateThemeColor = () => {
    const themeColor = settingsStore.themeColor
    // console.log({themeColor})
    if (themeColor) {
      changeTheme(themeColor)
      try {
        const res = hexToRgb(themeColor)
        if (!res) {
          return
        }
        const {r, g, b} = res
        const root = document.documentElement
        root.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`)
      } catch (e) {
        console.error(e)
      }
    }
  }

  watch(
    () => settingsStore.themeColor,
    () => {
      updateThemeColor()
    },
  )

  watch(
    () => settingsStore.disableAnimation,
    (val) => {
      if (val) {
        document.documentElement.classList.add('disable-animation')
      } else {
        document.documentElement.classList.remove('disable-animation')
      }
    },
    {
      immediate: true,
    },
  )

  onBeforeUnmount(() => {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .removeEventListener('change', handleSystemThemeChange)
  })
  onMounted(() => {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', handleSystemThemeChange)
    updateThemeColor()
  })

  return {
    isAppDarkMode,
  }
}

/**
 * 使用全局样式
 */
export const useGlobalStyle = () => {
  const styleEl = ref<HTMLElement | null>(null)
  const globalStyleText = ref('')
  const settingsStore = useSettingsStore()

  const applyGlobalStyle = () => {
    if (styleEl.value) {
      if (settingsStore.enableGlobalCss) {
        styleEl.value.innerHTML = globalStyleText.value
        localStorage.setItem(LsKeys.GLOBAL_STYLE, globalStyleText.value)
      } else {
        styleEl.value.innerHTML = ''
      }
    }
  }

  watch(
    () => settingsStore.enableGlobalCss,
    (val) => {
      applyGlobalStyle()
    },
  )

  onMounted(() => {
    styleEl.value = createOrFindStyleNode(LsKeys.GLOBAL_STYLE)
    globalStyleText.value =
      localStorage.getItem(LsKeys.GLOBAL_STYLE) ||
      'body {font-family: "宋体";}\n* {border-radius: 0 !important}'

    applyGlobalStyle()
  })

  return {
    globalStyleText,
    applyGlobalStyle,
  }
}
