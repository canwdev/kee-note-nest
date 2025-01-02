import {NButton} from 'naive-ui'
import {showInputPrompt} from '@/components/CommonUI/input-prompt'
import {getMyCryptKey, LsKeys} from '@/enum'
import {RouterLink} from 'vue-router'
import {StOptionItem, StOptionType} from '@/components/CanUI/packages/OptionUI/enum'

export const useWebui = (mVisible) => {
  const handleMyCryptKeyChange = (value) => {
    localStorage.setItem(LsKeys.LS_KEY_KN_HTTP_CRYPT_KEY, String(value))
    location.reload()
  }

  const webuiOption = computed((): StOptionItem => {
    return {
      label: 'Web UI Config',
      key: 'webui',
      children: [
        {
          label: 'HTTP Crypt Key',
          subtitle: 'Change this will reload page',
          key: 'kn_http_crypt_key',
          actionRender: h(
            NButton,
            {
              type: 'primary',
              size: 'small',
              onClick: async () => {
                const value = await showInputPrompt({
                  title: 'Edit KN_HTTP_CRYPT_KEY',
                  placeholder: 'keep default',
                  value: getMyCryptKey(),
                  allowEmpty: true,
                })
                handleMyCryptKeyChange(value)
              },
            },
            {
              default: () => 'Edit',
            },
          ),
        },
        {
          label: '.env generator',
          key: 'env_generator',
          actionRender: h(
            RouterLink,
            {
              to: '/gen',
              // target: '_blank',
              onClick: () => {
                mVisible.value = false
              },
            },
            {
              default: () => 'Go',
            },
          ),
        },
      ],
    }
  })

  return {
    webuiOption,
  }
}
