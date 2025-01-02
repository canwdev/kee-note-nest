<script lang="ts">
import {defineComponent, ref} from 'vue'
import {FormInst, FormValidationError, useMessage, FormRules} from 'naive-ui'
import {userLogin, userProfile} from '@/api'
import {useRouter} from 'vue-router'
import globalEventBus, {GlobalEvents} from '@/utils/bus'
import {LsKeys} from '@/enum'
import {Key16Regular, Person16Regular} from '@vicons/fluent'
import {useHistory} from '@/views/Home/use-history'

interface ModelType {
  username: string | null
  password: string | null
}

export default defineComponent({
  components: {
    Key16Regular,
    Person16Regular,
  },
  setup() {
    const router = useRouter()
    const formRef = ref<FormInst | null>(null)
    const message = useMessage()
    const formModel = ref<ModelType>({
      username: import.meta.env.VITE_USER_NAME || '',
      password: import.meta.env.VITE_USER_PASSWORD || '',
    })

    const formRules: FormRules = {
      username: [
        {
          required: true,
          message: 'Username is required',
          trigger: ['blur'],
        },
      ],
      password: [
        {
          required: true,
          message: 'Password is required',
          trigger: ['blur'],
        },
      ],
    }

    const {updateHistory, loadFirstHistory} = useHistory()

    const handleLogin = async () => {
      const {access_token} = await userLogin({
        username: formModel.value.username,
        password: formModel.value.password,
      })
      if (!access_token) {
        message.error('Invalid token! Check HTTP Crypt key in settings?')
        return
      }
      localStorage.setItem(LsKeys.LS_KEY_AUTHORIZATION, access_token)

      const hItem = updateHistory({
        dbPath: 'web_ui_kdbx',
      })

      // 传入query参数
      await checkProfile(hItem ? {groupUuid: hItem.lastGroupUuid} : {})
    }

    const checkProfile = async (query = {}) => {
      if (!localStorage.getItem(LsKeys.LS_KEY_AUTHORIZATION)) {
        return
      }
      const data = await userProfile()

      await router.replace({
        name: 'NoteView',
        query,
      })
    }

    // 自动聚焦输入框
    const inputUsernameRef = ref()
    const autoFocusInput = () => {
      inputUsernameRef.value?.focus()
    }

    onMounted(async () => {
      await checkProfile()
      autoFocusInput()
    })

    return {
      formRef,
      formModel,
      formRules,
      handleValidateButtonClick(e: MouseEvent) {
        e.preventDefault()
        formRef.value?.validate((errors: Array<FormValidationError> | undefined) => {
          if (errors) {
            message.error('Invalid Form!')
            return
          }
          handleLogin()
        })
      },
      checkProfile,
      handleSettings() {
        globalEventBus.emit(GlobalEvents.SHOW_SETTINGS)
      },
      inputUsernameRef,
    }
  },
})
</script>

<template>
  <n-layout class="login-view">
    <n-layout-content>
      <n-card class="card-wrap" title="Login to KeeNote Server">
        <n-form ref="formRef" :model="formModel" :rules="formRules">
          <n-form-item path="username" label="Username">
            <n-input-group>
              <n-input-group-label>
                <n-icon size="16"><Person16Regular /></n-icon>
              </n-input-group-label>
              <n-input
                ref="inputUsernameRef"
                v-model:value="formModel.username"
                @keyup.enter="handleValidateButtonClick"
              />
            </n-input-group>
          </n-form-item>

          <n-form-item path="password" label="Password">
            <n-input-group>
              <n-input-group-label>
                <n-icon size="16"><Key16Regular /></n-icon>
              </n-input-group-label>
              <n-input
                v-model:value="formModel.password"
                type="password"
                show-password-on="click"
                @keyup.enter="handleValidateButtonClick"
                class="font-code"
            /></n-input-group>
          </n-form-item>
          <n-space size="small" justify="end">
            <n-button @click="handleSettings"> Settings </n-button>
            <n-button type="primary" @click="handleValidateButtonClick"> Login </n-button>
          </n-space>
        </n-form>
      </n-card>
    </n-layout-content>
  </n-layout>
</template>

<style lang="scss" scoped>
@import './login';
</style>
