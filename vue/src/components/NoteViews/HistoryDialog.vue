<script setup lang="ts">
import {h} from 'vue'
import {useModelWrapper} from '@/hooks/use-model-wrapper'
import {Delete16Filled, History24Regular} from '@vicons/fluent'
import {useSettingsStore} from '@/store/settings'
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
const settingsStore = useSettingsStore()

const handleClearHistory = () => {
  settingsStore.historyList = []
}

const removeHistoryItem = (index: number) => {
  const list = [...settingsStore.historyList]
  list.splice(index, 1)
  settingsStore.historyList = list
}

const optionList = computed((): StOptionItem[] => {
  return [
    {
      label: 'Enable History',
      type: StOptionType.SWITCH,
      store: settingsStore,
      key: 'isSaveHistory',
      children: (settingsStore.historyList || []).map((item, index) => {
        return {
          key: item.dbPath,
          label: item.dbPath,
          clickFn: () => {
            emit('historyItemClick', item)
          },
          type: StOptionType.BUTTON,
          props: {
            class: 'mdi mdi-delete',
            onClick: (event) => {
              event.stopPropagation()
              removeHistoryItem(index)
            },
          },
        }
      }),
    },
  ]
})
</script>

<template>
  <el-dialog v-model="mVisible" title="History">
    <OptionUI :option-list="optionList" />
  </el-dialog>
</template>
