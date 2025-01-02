import {NButton, NSpace} from 'naive-ui'
import {useKeeStore} from '@/store/kee-store'
import {showInputPrompt} from '@/components/CommonUI/input-prompt'
import {changeCredentials, createCredentialKey, maintenanceDatabase} from '@/api/keepass'
import globalEventBus, {GlobalEvents} from '@/utils/bus'
import {isElectron} from '@/utils/backend'
import {kService} from '@/api'
import {useSettingsStore} from '@/store/settings'
import {electronCommonApi} from '@/api/electron'
import {StOptionItem, StOptionType} from '@/components/CanUI/packages/OptionUI/enum'

const KDBX_LATEST_VERSION = 4

export const useKdbxOptions = (mVisible) => {
  const settingsStore = useSettingsStore()
  const keeStore = useKeeStore()

  const kdbxConfigOption = computed((): StOptionItem => {
    if (!keeStore.dbInfo) {
      return {
        label: 'Kdbx Config',
        key: 'kdbx',
        hidden: true,
      }
    }
    const dbVersion = keeStore.dbInfo.header.versionMajor
    const isUpgrade = dbVersion < KDBX_LATEST_VERSION

    return {
      label: 'Kdbx Config',
      key: 'kdbx',
      children: [
        {
          label: 'Auto Save',
          subtitle: `Automatically write to local database file`,
          key: 'enableAutoSave',
          store: settingsStore,
          type: StOptionType.SWITCH,
        },
        {
          label: 'Database Info',
          subtitle: `KDBX Version: ${dbVersion}`,
          key: 'info',
          actionRender: h(
            NSpace,
            {size: 'small'},
            {
              default: () => [
                h(
                  NButton,
                  {
                    type: 'primary',
                    size: 'small',
                    onClick: async () => {
                      window.$dialog.info({
                        title: 'Database Info',
                        content: () =>
                          h('textarea', {
                            cols: 46,
                            rows: 20,
                            class: 'font-code',
                            readonly: true,
                            value: JSON.stringify(keeStore.dbInfo, null, 2),
                          }),
                      })
                    },
                  },
                  {
                    default: () => 'View',
                  },
                ),
              ],
            },
          ),
        },
        {
          label: 'Database Password',
          key: 'change_password',
          actionRender: h(
            NButton,
            {
              type: 'primary',
              size: 'small',
              onClick: async () => {
                const password = await showInputPrompt({
                  title: '1. Input new database password',
                  placeholder: '',
                  value: '',
                  type: 'password',
                })
                const password2 = await showInputPrompt({
                  title: '2. Confirm new password',
                  placeholder: '',
                  value: '',
                  type: 'password',
                  validateFn: (value) => {
                    if (value !== password) {
                      return 'password not match'
                    }
                  },
                })
                if (password2) {
                  await changeCredentials({password: password2})
                  window.$message.success('Database password changed!')
                  globalEventBus.emit(GlobalEvents.CLOSE_DATABASE)
                  mVisible.value = false
                }
              },
            },
            {
              default: () => 'Change',
            },
          ),
        },
        isElectron
          ? {
              label: 'Database Key',
              key: 'change_key',
              actionRender: h(
                NSpace,
                {size: 'small'},
                {
                  default: () => [
                    h(
                      NButton,
                      {
                        size: 'small',
                        onClick: async () => {
                          const {filePath} = await electronCommonApi.electronOpenSaveDialog({
                            defaultPath: 'new.key',
                            filters: [
                              {
                                name: 'Key File',
                                extensions: ['key'],
                              },
                            ],
                          })
                          if (!filePath) {
                            return
                          }
                          await createCredentialKey({keyPath: filePath})
                          window.$message.success('Key file created: ' + filePath)
                        },
                      },
                      {
                        default: () => 'Create',
                      },
                    ),
                    h(
                      NButton,
                      {
                        type: 'primary',
                        size: 'small',
                        onClick: async () => {
                          const {filePaths} = await electronCommonApi.electronOpenFileDialog({
                            filters: [
                              {
                                name: 'Key File',
                                extensions: ['*'],
                              },
                            ],
                          })
                          if (filePaths && filePaths.length > 0) {
                            const keyPath = filePaths[0]
                            console.log(keyPath)

                            window.$dialog.warning({
                              title: 'Confirm change database key?',
                              content: keyPath,
                              positiveText: 'OK',
                              negativeText: 'Cancel',
                              onPositiveClick: async () => {
                                await changeCredentials({keyPath})
                                window.$message.success('Database key changed!')
                                globalEventBus.emit(GlobalEvents.CLOSE_DATABASE)
                                mVisible.value = false
                              },
                              onNegativeClick: () => {},
                            })
                          }
                        },
                      },
                      {
                        default: () => 'Change',
                      },
                    ),
                  ],
                },
              ),
            }
          : null,
        isElectron
          ? {
              label: 'Maintenance',
              subtitle: `KDBX Version: ${dbVersion}`,
              key: 'maintenance',
              actionRender: h(
                NSpace,
                {size: 'small'},
                {
                  default: () => [
                    h(
                      NButton,
                      {
                        size: 'small',
                        onClick: async () => {
                          // 升级或降级数据库版本
                          const action = isUpgrade ? 'upgrade' : 'downgrade'
                          window.$dialog.warning({
                            title: `Maintenance`,
                            content: `Confirm ${action} database to version ${
                              isUpgrade ? dbVersion + 1 : dbVersion - 1
                            }?`,
                            positiveText: 'OK',
                            negativeText: 'Cancel',
                            onPositiveClick: async () => {
                              const params: any = {}

                              if (isUpgrade) {
                                params.upgrade = true
                              } else {
                                params.setVersion = 3
                              }

                              await maintenanceDatabase(params)
                              window.$message.success(`Database ${action} success!`)
                              globalEventBus.emit(GlobalEvents.CLOSE_DATABASE)
                              mVisible.value = false
                            },
                            onNegativeClick: () => {},
                          })
                        },
                      },
                      {
                        default: () => (isUpgrade ? 'Upgrade' : 'Downgrade'),
                      },
                    ),
                    h(
                      NButton,
                      {
                        type: 'error',
                        size: 'small',
                        onClick: async () => {
                          // 清理数据库
                          window.$dialog.warning({
                            title: `Cleanup`,
                            content: `Confirm cleanup database: historyRules, customIcons, binaries?`,
                            positiveText: 'OK',
                            negativeText: 'Cancel',
                            onPositiveClick: async () => {
                              await maintenanceDatabase({cleanup: true})
                              window.$message.success(`Database cleanup success!`)

                              globalEventBus.emit(GlobalEvents.CLOSE_DATABASE)
                              mVisible.value = false
                            },
                            onNegativeClick: () => {},
                          })
                        },
                      },
                      {
                        default: () => 'Cleanup',
                      },
                    ),
                  ],
                },
              ),
            }
          : null,
      ].filter(Boolean),
    }
  })

  return {
    kdbxConfigOption,
  }
}
