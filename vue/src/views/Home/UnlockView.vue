<script lang="ts" setup>
import {ref} from 'vue'
import {kService} from '@/api'
import {useRouter} from 'vue-router'
import globalEventBus, {GlobalEvents} from '@/utils/bus'

import HistoryDialog from '@/components/NoteViews/HistoryDialog.vue'
import {useHistory} from '@/views/Home/use-history'
import {createCredentialKey} from '@/api/keepass'
import moment from 'moment/moment'
import {electronCommonApi} from '@/api/electron'
import AutoFormElPlus from '@/components/CanUI/packages/AutoFormElPlus/index.vue'
import {AutoFormItemType, MixedFormItems} from '@/components/CanUI/packages/AutoFormElPlus/enum'

interface ModelType {
  dbPath: string | null
  password: string | null
  keyPath: string | null
}

const router = useRouter()

const formRef = ref()
const formModel = ref<ModelType>({
  dbPath: '',
  password: '',
  keyPath: '',
})
const formRules = {
  dbPath: [
    {
      required: true,
      message: 'dbPath is required',
      trigger: ['blur'],
    },
  ],
}

const submitForm = () => {
  formRef.value.submitForm()
}
const formItems = computed((): MixedFormItems[] => {
  return [
    {
      type: AutoFormItemType.INPUT,
      key: 'dbPath',
      label: 'Kdbx Path',
      placeholder: 'Input or select file path',
      props: {
        clearable: true,
        onKeyup: (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            submitForm()
          }
        },
      },
      render: () => {
        return h(
          'button',
          {
            type: 'button',
            class: `vp-button mdi ${
              isCreateMode.value ? 'mdi-file-document-plus-outline' : 'mdi-folder-settings-outline'
            }`,
            onClick: () => {
              if (isCreateMode.value) {
                handleChooseCreateFile('dbPath')
              } else {
                handleChooseFile('dbPath')
              }
            },
          },
          '',
        )
      },
    },
    {
      type: AutoFormItemType.INPUT,
      key: 'password',
      label: 'Password',
      placeholder: 'Please input password',
      props: {
        type: 'password',
        showPassword: true,
        clearable: true,
        onKeyup: (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            submitForm()
          }
        },
      },
    },
    {
      type: AutoFormItemType.INPUT,
      key: 'keyPath',
      label: 'Key Path (Optional)',
      placeholder: 'Input or select file path',
      props: {
        type: 'password',
        showPassword: true,
        clearable: true,
        onKeyup: (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            submitForm()
          }
        },
      },
      render: () => {
        return h(
          'button',
          {
            type: 'button',
            class: `vp-button mdi ${
              isCreateMode.value ? 'mdi-file-document-plus-outline' : 'mdi-folder-settings-outline'
            }`,
            onClick: () => {
              if (isCreateMode.value) {
                handleChooseCreateFile('keyPath')
              } else {
                handleChooseFile('keyPath')
              }
            },
          },
          '',
        )
      },
    },
  ]
})

const {updateHistory, loadFirstHistory} = useHistory()

const handleLogin = async () => {
  await kService.openDatabase({
    dbPath: formModel.value.dbPath,
    password: formModel.value.password,
    keyPath: formModel.value.keyPath,
  })

  const hItem = updateHistory(formModel.value)

  // 传入query参数
  await checkProfile(hItem ? {groupUuid: hItem.lastGroupUuid} : {})
}

const handleCreate = async () => {
  await kService.createDatabase({
    dbPath: formModel.value.dbPath,
    password: formModel.value.password,
    keyPath: formModel.value.keyPath,
    name: `New Database`,
  })
  window.$message.success('Database created: ' + formModel.value.dbPath)
  isCreateMode.value = false
  formModel.value.password = ''

  autoFocusInput()
}

const checkProfile = async (query = {}) => {
  if (!(await kService.checkDatabaseIsOpen())) {
    return
  }

  await router.replace({
    name: 'NoteView',
    query,
  })
}

// 自动聚焦输入框
const inputPwdRef = ref()
const autoFocusInput = () => {
  inputPwdRef.value?.focus()
}

onMounted(async () => {
  const hItem = loadFirstHistory()
  if (hItem) {
    formModel.value.dbPath = hItem.dbPath
    formModel.value.keyPath = hItem.keyPath
  }

  await checkProfile()
  autoFocusInput()
})

// 选择要创建的文件
const handleChooseCreateFile = async (type) => {
  const newFilename = moment().format('YYYY-MM-DD')
  const {filePath} = await electronCommonApi.electronOpenSaveDialog({
    defaultPath: type === 'dbPath' ? `${newFilename}.kdbx` : `${newFilename}.key`,
    filters: [
      type === 'dbPath'
        ? {
            name: 'KeePass Database',
            extensions: ['kdbx'],
          }
        : {
            name: 'Key File',
            extensions: ['key'],
          },
    ],
  })

  // 创建key
  if (type === 'keyPath') {
    await createCredentialKey({keyPath: filePath})
    window.$message.success('Key file created: ' + filePath)
  }

  if (filePath) {
    formModel.value[type] = filePath
  }
}

// 选择已存在的文件
const handleChooseFile = async (type) => {
  const {filePaths} = await electronCommonApi.electronOpenFileDialog({
    filters: [
      type === 'dbPath'
        ? {
            name: 'KeePass Database',
            extensions: ['kdbx'],
          }
        : {
            name: 'Key File',
            extensions: ['key', '*'],
          },
    ],
  })
  if (filePaths && filePaths.length > 0) {
    formModel.value[type] = filePaths[0]
  }
}

const isShowHistoryDialog = ref(false)
const handleHistoryItemClick = (item) => {
  formModel.value.dbPath = item.dbPath
  formModel.value.keyPath = item.keyPath
  isShowHistoryDialog.value = false
}

const isCreateMode = ref(false)
const toggleCreate = () => {
  if (!isCreateMode.value) {
    formModel.value.dbPath = ''
    formModel.value.password = ''
    formModel.value.keyPath = ''
  }
  isCreateMode.value = !isCreateMode.value
}
const handleSettings = () => {
  globalEventBus.emit(GlobalEvents.SHOW_SETTINGS)
}
const handleSubmit = () => {
  if (isCreateMode.value) {
    handleCreate()
    return
  }
  handleLogin()
}
</script>

<template>
  <div class="login-view">
    <HistoryDialog
      @historyItemClick="handleHistoryItemClick"
      v-model:visible="isShowHistoryDialog"
    />

    <el-card class="card-wrap" :shadow="false">
      <div class="title-wrapper">
        <button
          class="btn-no-style"
          :title="isCreateMode ? 'Back' : 'Create Database'"
          @click="toggleCreate"
        >
          <span v-if="isCreateMode" class="mdi mdi-arrow-left"></span>
          <span v-else class="mdi mdi-plus"></span>
        </button>
        <div class="login-title">{{ `${isCreateMode ? 'Create' : 'Open'} Kdbx Database` }}</div>
        <button class="btn-no-style" :disabled="isCreateMode" @click="isShowHistoryDialog = true">
          <span class="mdi mdi-history"></span>
        </button>
      </div>

      <AutoFormElPlus
        ref="formRef"
        :form-schema="{
          model: formModel,
          rules: formRules,
          props: {
            labelPosition: 'top',
          },
          formItems,
        }"
        @onSubmit="handleSubmit"
      >
        <template #actions>
          <button type="button" class="vp-button" @click="handleSettings">Settings</button>
          <button type="button" class="vp-button primary" @click="submitForm()">
            {{ isCreateMode ? 'Create' : 'Unlock' }}
          </button>
        </template>
      </AutoFormElPlus>
    </el-card>
  </div>
</template>

<style lang="scss">
@import './login';
</style>
