<script lang="ts">
import {defineComponent, ref} from 'vue'
import {FormInst, FormRules} from 'naive-ui'
import {hashSync} from 'bcryptjs'
import {getRandomHex} from '@/utils/my-crypt'
import {isDev} from '@/enum'
import {showInputPrompt} from '@/components/CommonUI/input-prompt'
import {Edit20Regular, New16Regular, QuestionCircle20Regular} from '@vicons/fluent'
import KdbxConfigDialog from '@/views/ServerManage/KdbxConfigDialog.vue'
import StepResult from '@/views/ServerManage/StepResult.vue'

const genUserData = (username, password) => {
  return JSON.stringify([
    {
      userId: 1,
      username: username,
      password_salted: hashSync(password, 10),
    },
  ])
}

type EnvConfigType = {
  key: string
  label: string
  tip?: string
  value: string | boolean | number
  required?: boolean
  disabled?: boolean
  placeholder?: string
}

export default defineComponent({
  name: 'EnvGenerator',
  components: {
    StepResult,
    KdbxConfigDialog,
    QuestionCircle20Regular,
    Edit20Regular,
    New16Regular,
  },
  setup() {
    const formRef = ref<FormInst | null>(null)
    const dataForm = ref<Record<string, string>>({})

    const isShowKdbxConfig = ref(false)

    const envConfigList = computed((): EnvConfigType[] => {
      return [
        {key: 'PORT', label: 'Server Port (Optional)', placeholder: '3000', value: '3000'},
        {key: 'JWT_SECRET', label: 'JWT Secret', value: getRandomHex(), required: true},
        {
          key: 'JWT_EXPIRES_IN',
          tip: 'Eg: 60, "2 days", "10h", "7d". A numeric value is interpreted as a seconds count. <a href="https://github.com/auth0/node-jsonwebtoken#usage" target="_blank">node-jsonwebtoken#usage</a>',
          label: 'JWT Expires In',
          value: '30d',
          required: true,
        },
        {
          key: 'AUTH_USERS',
          label: 'HTTP Auth users',
          value: '', // genUserData('admin', 'admin')
          required: true,
          disabled: true,
          placeholder: 'Please generate by right button',
        },
        {
          // 开头有2个下划线的，是私有配置项，不会提交到配置文件
          key: '__KDBX_CONFIG_IS_JSON',
          label: 'Kdbx Config is JSON Mode',
          value: true,
        },
        dataForm.value['__KDBX_CONFIG_IS_JSON']
          ? {
              key: 'KN_KDBX_CONFIG_JSON',
              label: 'Kdbx config (json)',
              value: '',
              required: true,
              disabled: true,
              placeholder: 'Please generate by right button',
            }
          : {
              key: 'KN_KDBX_CONFIG_PATH',
              label: 'Kdbx config path',
              tip: 'Absolute path for db-config.json, the database will be loaded once the server starts. If not set, it will load test/db-config.json',
              value: '',
              required: true,
              placeholder: 'Eg: D:/MyFolder/db-config.json',
            },
        {
          key: 'KN_HTTP_CRYPT_KEY',
          label: 'HTTP Crypt key',
          tip: 'Recommended to enable in production mode to enhance security. it can encrypt/decrypt HTTP request query/body and response body',
          value: '',
        },
      ]
    })

    const dataFormRules = computed((): FormRules => {
      const obj = {}
      envConfigList.value.forEach((item) => {
        if (item.required) {
          obj[item.key] = {
            required: true,
            trigger: ['blur', 'input'],
          }
        }
      })
      return obj
    })
    const outputText = ref('')
    const currentStep = ref(1)

    onBeforeMount(() => {
      const obj = {}
      envConfigList.value.forEach((item) => {
        obj[item.key] = item.value
      })
      dataForm.value = obj
    })

    const handleGenerate = () => {
      formRef.value?.validate((errors) => {
        if (errors) {
          window.$message.error('Invalid form!')
          return
        }
        let txt = ''
        for (const key in dataForm.value) {
          const val = dataForm.value[key]

          // ignore key start with __
          if (/^__/g.test(key)) {
            continue
          }

          const commentFlag = val !== '' ? '' : '#'
          txt += `${commentFlag}${key}=${val}\n`
        }
        outputText.value = txt
        currentStep.value = 2
      })
    }

    const setRandomValue = (key, len = 16) => {
      dataForm.value[key] = getRandomHex(len)
    }

    const showUserEditPrompt = async () => {
      const username = await showInputPrompt({
        title: 'Input username',
        value: 'admin',
      })
      if (!username) {
        return
      }
      const password = await showInputPrompt({
        title: 'Input password',
        value: 'admin',
      })
      if (!password) {
        return
      }

      dataForm.value['AUTH_USERS'] = genUserData(username, password)
    }

    const handleGenerateKdbxJson = async (data) => {
      if (dataForm.value['__KDBX_CONFIG_IS_JSON']) {
        dataForm.value['KN_KDBX_CONFIG_JSON'] = JSON.stringify(data)
        return
      }
      const handle = await window.showSaveFilePicker({
        suggestedName: 'db-config.json',
      })
      const writable = await handle.createWritable()
      const str = JSON.stringify(data, null, 2)
      await writable.write(str)
      await writable.close()

      window.$dialog.alert('Please copy and paste file absolute path.', 'Saved!', {
        type: 'success',
      })
    }

    return {
      isDev,
      formRef,
      dataForm,
      dataFormRules,
      outputText,
      handleGenerate,
      RandomKeys: {
        JWT_SECRET: true,
        KN_HTTP_CRYPT_KEY: true,
      },
      setRandomValue,
      showUserEditPrompt,
      currentStep,
      envConfigList,
      isShowKdbxConfig,
      handleGenerateKdbxJson,
    }
  },
})
</script>

<template>
  <div class="env-generator">
    <n-card size="small" style="position: sticky; top: 0; z-index: 100; margin-bottom: 10px">
      <n-page-header subtitle="" @back="$router.push({name: 'HomeView'})">
        <template #title>KeeNote Server `.env` Generator</template>
        <template #extra> </template>
      </n-page-header>
    </n-card>

    <div class="generator-content">
      <n-steps :vertical="false" v-model:current="currentStep" style="padding: 10px 10px">
        <n-step title="Edit Config" description="Edit Nest.js server configuration information" />
        <n-step title="Save Result" description="Save the .env configuration file" />
      </n-steps>
      <n-card v-if="currentStep === 1" class="card-gen">
        <n-form size="small" ref="formRef" :model="dataForm" :rules="dataFormRules">
          <n-form-item
            v-for="item in envConfigList"
            :key="item.key"
            :path="item.key"
            :label="item.label || item.key"
          >
            <n-space style="margin-right: 8px" :wrap="false" size="small">
              <n-popover
                v-if="item.tip"
                trigger="hover"
                style="max-width: 300px"
                placement="bottom"
              >
                <template #trigger>
                  <n-button quaternary>
                    <n-icon size="20">
                      <QuestionCircle20Regular />
                    </n-icon>
                  </n-button>
                </template>
                <div v-html="item.tip"></div>
              </n-popover>
              <n-button
                secondary
                type="primary"
                v-if="item.key === 'AUTH_USERS'"
                @click="showUserEditPrompt"
              >
                <n-icon size="20">
                  <Edit20Regular />
                </n-icon>
              </n-button>
              <n-button
                secondary
                type="primary"
                v-if="item.key === 'KN_KDBX_CONFIG_JSON' || item.key === 'KN_KDBX_CONFIG_PATH'"
                @click="isShowKdbxConfig = true"
              >
                <n-icon size="20">
                  <Edit20Regular />
                </n-icon>
              </n-button>
              <n-button
                secondary
                type="primary"
                v-if="RandomKeys[item.key]"
                @click="setRandomValue(item.key)"
              >
                <n-icon size="20">
                  <New16Regular />
                </n-icon>
              </n-button>
            </n-space>
            <n-switch v-if="typeof item.value === 'boolean'" v-model:value="dataForm[item.key]" />
            <n-input
              v-else
              v-model:value="dataForm[item.key]"
              :disabled="item.disabled"
              :placeholder="item.placeholder || ''"
              class="font-code"
            />
          </n-form-item>
          <n-space justify="end">
            <n-button @click="handleGenerate" type="primary" class="font-emoji">
              Generate
            </n-button>
          </n-space>
        </n-form>

        <KdbxConfigDialog v-model:visible="isShowKdbxConfig" @submit="handleGenerateKdbxJson" />
      </n-card>

      <StepResult v-if="currentStep === 2" v-model="outputText" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.env-generator {
  height: 100%;

  .generator-content {
    max-width: 1000px;
    margin-left: auto;
    margin-right: auto;
  }
}
</style>
