import {useKeeStore} from '@/store/kee-store'
import {changeCredentials, createCredentialKey, maintenanceDatabase} from '@/api/keepass'
import globalEventBus, {GlobalEvents} from '@/utils/bus'
import {isElectron} from '@/utils/backend'
import {useSettingsStore} from '@/store/settings'
import {electronCommonApi} from '@/api/electron'
import {StOptionItem, StOptionType} from '@/components/CanUI/packages/OptionUI/enum'
import {showInputPrompt} from '@/components/CanUI/functions/input-prompt'

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
          type: StOptionType.BUTTON,
          value: 'View',
          props: {
            onClick: () => {
              window.$dialog({
                title: 'Database Info',
                message: h('textarea', {
                  cols: 46,
                  rows: 20,
                  class: 'font-code',
                  readonly: true,
                  value: JSON.stringify(keeStore.dbInfo, null, 2),
                }),
              })
            },
          },
        },
        {
          label: 'Database Password',
          key: 'change_password',
          type: StOptionType.BUTTON,
          value: 'Change...',
          props: {
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
        },
        isElectron
          ? {
              label: 'Database Key',
              key: 'change_key',
              actionRender: h(
                'div',
                {class: 'flex-row-center-gap'},
                {
                  default: () => [
                    h(
                      'button',
                      {
                        class: 'vp-button',
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
                      'Create',
                    ),
                    h(
                      'button',
                      {
                        class: 'vp-button primary',
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

                            window.$dialog
                              .confirm(keyPath, 'Confirm change database key?', {
                                type: 'warning',
                              })
                              .then(async () => {
                                await changeCredentials({keyPath})
                                window.$message.success('Database key changed!')
                                globalEventBus.emit(GlobalEvents.CLOSE_DATABASE)
                                mVisible.value = false
                              })
                              .catch()
                          }
                        },
                      },
                      'Change...',
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
                'div',
                {class: 'flex-row-center-gap'},
                {
                  default: () => [
                    h(
                      'button',
                      {
                        class: 'vp-button danger',
                        onClick: async () => {
                          // 升级或降级数据库版本
                          const action = isUpgrade ? 'upgrade' : 'downgrade'

                          window.$dialog
                            .confirm(
                              `Confirm ${action} database to version ${
                                isUpgrade ? dbVersion + 1 : dbVersion - 1
                              }?`,
                              `Maintenance`,
                              {
                                type: 'warning',
                              },
                            )
                            .then(async () => {
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
                            })
                            .catch()
                        },
                      },
                      {
                        default: () => (isUpgrade ? 'Upgrade' : 'Downgrade'),
                      },
                    ),
                    h(
                      'button',
                      {
                        class: 'vp-button primary',
                        onClick: async () => {
                          // 清理数据库

                          window.$dialog
                            .confirm(
                              `Confirm cleanup database: historyRules, customIcons, binaries?`,
                              `Cleanup`,
                              {
                                type: 'warning',
                              },
                            )
                            .then(async () => {
                              await maintenanceDatabase({cleanup: true})
                              window.$message.success(`Database cleanup success!`)

                              globalEventBus.emit(GlobalEvents.CLOSE_DATABASE)
                              mVisible.value = false
                            })
                            .catch()
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
