<script lang="ts" setup>
import {useModelWrapper} from '@/hooks/use-model-wrapper'
import {Settings20Filled} from '@vicons/fluent'
import {useSettingsStore} from '@/store/settings'
import {ldThemeOptions} from '@/enum/settings'
import {isElectron} from '@/utils/backend'
import {NButton} from 'naive-ui'
import DialogTextEdit from '@/components/CommonUI/DialogTextEdit.vue'
import {useGlobalStyle} from '@/hooks/use-global-theme'
import {useAppSettings} from '@/components/Settings/use-app-settings'
import moment from 'moment/moment'
import {useWebui} from '@/components/Settings/use-webui'
import {useKdbxOptions} from '@/components/Settings/use-kdbx-options'
import {formatSiteTitle} from '@/router'
import OptionUI from '@/components/CanUI/packages/OptionUI/index.vue'
import {StOptionItem, StOptionType} from '@/components/CanUI/packages/OptionUI/enum'

const props = withDefaults(
  defineProps<{
    visible: boolean
  }>(),
  {
    visible: true,
  },
)
const emit = defineEmits(['update:visible'])

const mVisible = useModelWrapper(props, emit, 'visible')

const isShowGlobalStyleDialog = ref(false)
const {globalStyleText, applyGlobalStyle} = useGlobalStyle()
const handleSaveGlobalStyle = (val) => {
  console.log(val)
  globalStyleText.value = val
  applyGlobalStyle()
  isShowGlobalStyleDialog.value = false
}

const settingsStore = useSettingsStore()
const {serverManagerOption} = useAppSettings()
const {webuiOption} = useWebui(mVisible)
const {kdbxConfigOption} = useKdbxOptions(mVisible)

const optionList = computed((): StOptionItem[] => {
  let calendarSettings: StOptionItem[] = [
    {
      label: 'Enable Calendar View',
      key: 'isCalendarView',
      store: settingsStore,
      type: StOptionType.SWITCH,
    },
  ]
  if (settingsStore.isCalendarView) {
    calendarSettings = [
      ...calendarSettings,
      {
        label: 'Set First Day of Week',
        key: 'calendarWeekIndex',
        store: settingsStore,
        type: StOptionType.SELECT,
        options: [
          {
            label: 'Locale Default',
            value: -1,
          },
          ...moment.weekdays().map((item, index) => ({label: item, value: index})),
        ],
      },
      {
        label: 'Show Lunar Day',
        subtitle:
          '是否显示<a href="https://github.com/yize/solarlunar" target="_blank" rel="nofollow noopener">农历</a>和<a href="https://github.com/NateScarlet/holiday-cn" target="_blank" rel="nofollow noopener">中国节假日</a>',
        key: 'calendarShowLunar',
        store: settingsStore,
        type: StOptionType.SWITCH,
      },
      {
        label: 'Show Note Title',
        key: 'calendarShowTitle',
        store: settingsStore,
        type: StOptionType.SWITCH,
      },
    ]
  }

  return [
    isElectron ? serverManagerOption.value : webuiOption.value,
    kdbxConfigOption.value,
    {
      label: 'Personalization',
      key: 'personalization',
      children: [
        {
          label: 'Theme Color',
          key: 'themeColor',
          store: settingsStore,
          type: StOptionType.COLOR_PICKER,
        },
        {
          label: 'Light/Dark Theme',
          key: 'ldTheme',
          store: settingsStore,
          type: StOptionType.MULTIPLE_SWITCH,
          options: ldThemeOptions,
        },
        {
          label: 'Enable Global Css',
          key: 'enableGlobalCss',
          store: settingsStore,
          type: StOptionType.SWITCH,
          actionRender: h(
            'button',
            {
              class: 'vp-button',
              onClick: () => {
                isShowGlobalStyleDialog.value = true
              },
            },
            'Edit',
          ),
        },
        // {
        //   label: 'NaiveUI Theme Editor',
        //   subtitle: 'Toggle this will refresh page',
        //   key: 'isEnableThemeEdit',
        //   store: settingsStore,
        //   type: StOptionType.SWITCH,
        // },
        {
          label: 'Disable Animation',
          subtitle: 'E-Ink optimization',
          key: 'disableAnimation',
          store: settingsStore,
          type: StOptionType.SWITCH,
        },
      ],
    },
    {
      label: 'Calendar',
      key: 'calendar',
      children: calendarSettings,
    },
    {
      label: 'About',
      key: 'about',
      children: [
        {
          label: formatSiteTitle(),
          subtitle: 'https://github.com/canwdev/kee-note-v4',
          key: 'github',
          actionRender: h(
            'a',
            {
              href: 'https://github.com/canwdev/kee-note-v4',
              target: '_blank',
              rel: 'nofollow noopener',
            },
            {
              default: () => 'Github',
            },
          ),
        },
      ],
    },
  ].filter(Boolean)
})
</script>

<template>
  <el-dialog class="global-settings" v-model="mVisible" top="4vh" title="Settings">
    <OptionUI :option-list="optionList" />
  </el-dialog>
  <DialogTextEdit
    v-model:visible="isShowGlobalStyleDialog"
    :text="globalStyleText"
    type="textarea"
    isTextarea
    @onSave="handleSaveGlobalStyle"
    title="Global CSS Editor"
    class="font-code"
  />
</template>

<style lang="scss">
.global-settings {
  max-width: 500px;
  .webui-config {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
