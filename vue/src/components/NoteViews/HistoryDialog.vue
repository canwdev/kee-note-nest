<script setup lang="ts">
import {h} from 'vue'
import {useModelWrapper} from '@/hooks/use-model-wrapper'
import {getLocalStorageObject, LsKeys} from '@/enum'
import {useLocalStorageBoolean} from '@/hooks/use-local-storage'
import {Delete16Filled, History24Regular} from '@vicons/fluent'
import {useSettingsStore} from '@/store/settings'

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
</script>

<template>
  <el-dialog v-model="mVisible" title="History">
    <n-list>
      <n-list-item>
        <n-thing title="Enable History" description="" />
        <template #suffix>
          <n-switch v-model:value="settingsStore.isSaveHistory" />
        </template>
      </n-list-item>
      <n-list-item v-if="settingsStore.isSaveHistory">
        <n-list
          v-if="settingsStore.historyList && settingsStore.historyList.length"
          bordered
          hoverable
          clickable
        >
          <n-list-item
            v-for="(item, index) in settingsStore.historyList"
            :key="item.dbPath"
            @click="$emit('historyItemClick', item)"
          >
            <n-thing :description="item.dbPath" />
            <template #suffix>
              <n-popconfirm @positive-click="removeHistoryItem(index)">
                <template #trigger>
                  <n-button @click.stop title="Delete history" type="error" quaternary>
                    <n-icon size="20">
                      <Delete16Filled />
                    </n-icon>
                  </n-button>
                </template>
                Confirm remove this history?
              </n-popconfirm>
            </template>
          </n-list-item>
        </n-list>
      </n-list-item>
    </n-list>
  </el-dialog>
</template>
