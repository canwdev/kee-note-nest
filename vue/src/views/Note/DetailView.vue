<script lang="ts">
import {kService} from '@/api'
import {EntryItem} from '@/enum/kdbx'
import keepassIcons from '@/assets/icons'
import globalEventBus, {GlobalEvents, saveDatabaseAsync} from '@/utils/bus'
import {useBeforeUnload, useUnSavedChanges} from '@/hooks/use-changed'
import MarkdownEditor from '@/components/NoteViews/Detail/MarkdownEditor.vue'
import DialogEntryIconColor from '@/components/NoteViews/Dialogs/DialogEntryIconColor.vue'
import IconDisplay from '@/components/NoteViews/IconDisplay.vue'
import DialogEntryPreview from '@/components/NoteViews/Dialogs/DialogEntryPreview.vue'
import {
  TextBoxSettings24Regular,
  ArrowLeft16Regular,
  Save20Regular,
  CalendarAdd20Regular,
  CalendarEdit16Regular,
  TextboxMore20Regular,
  TextboxMore20Filled,
} from '@vicons/fluent'
import AttachmentBox from '@/components/NoteViews/Detail/AttachmentBox.vue'
import {getEntryItemUpdateParams} from '@/utils/export-import'
import {useEditorSettingsStore} from '@/store/editor'
import {useKeeStore} from '@/store/kee-store'
import {useSettingsStore} from '@/store/settings'
import {useKeeNoteSaveClose} from '@/hooks/use-keenote'

export default defineComponent({
  name: 'DetailView',
  components: {
    MarkdownEditor,
    DialogEntryIconColor,
    IconDisplay,
    DialogEntryPreview,
    TextBoxSettings24Regular,
    ArrowLeft16Regular,
    Save20Regular,
    CalendarAdd20Regular,
    CalendarEdit16Regular,
    AttachmentBox,
    TextboxMore20Regular,
    TextboxMore20Filled,
  },
  setup() {
    const entryDetail = ref<EntryItem | null>(null)
    const entryDetailTimes = reactive([0, 0])

    const keeStore = useKeeStore()
    const settingsStore = useSettingsStore()

    const editorSettingsStore = useEditorSettingsStore()

    const {commonSaveDatabase} = useKeeNoteSaveClose()

    onMounted(() => {
      getEntryDetail(true)
      window.addEventListener('keydown', listenShortcuts)
    })
    onBeforeUnmount(() => {
      window.removeEventListener('keydown', listenShortcuts)
    })

    const listenShortcuts = (event) => {
      if (event.ctrlKey || event.metaKey) {
        const key = String.fromCharCode(event.which).toLowerCase()
        switch (key) {
          case 's':
            event.preventDefault()
            handleSave()
            break
          case '¿': // Keyboard symbol: "/"
            isShowPreviewModal.value = true
            event.preventDefault()
            break
          default:
            return
        }
      } else if (event.code === 'Escape') {
        if (isShowPreviewModal.value || isShowIconEdit.value) {
          return
        }
        handleBack()
      }
    }

    const getEntryDetail = async (isFocus = false) => {
      entryDetail.value = await kService.getEntryDetail({uuid: keeStore.detailUuid})
      nextTick(() => {
        keeStore.isChanged = false
        if (isFocus) {
          titleInputRef.value.focus()
        }
      })
    }

    useBeforeUnload(() => keeStore.isChanged)

    watch(entryDetail, (val) => {
      if (!val) {
        return
      }
      const {creationTime, lastModTime} = val
      entryDetailTimes[0] = new Date(creationTime).getTime()
      entryDetailTimes[1] = new Date(lastModTime).getTime()
    })

    watch(
      entryDetail,
      () => {
        keeStore.isChanged = true
      },
      {deep: true},
    )

    const handleSave = async () => {
      if (!entryDetail.value) {
        return
      }
      if (keeStore.isChanged) {
        entryDetail.value.creationTime = new Date(entryDetailTimes[0])

        const params = getEntryItemUpdateParams({
          uuid: entryDetail.value.uuid,
          entryDetail: entryDetail.value,
          isSetModTime: false,
        })

        await kService.updateEntry(params)
        await syncAndSave()

        return
      }
      if (keeStore.isNotSave) {
        await commonSaveDatabase()
        return
      }
    }

    // 处理不同保存条件下的按钮样式
    const saveBtnInfo = computed(() => {
      if (settingsStore.enableAutoSave || keeStore.isChanged) {
        return {
          quaternary: true,
          disabled: !keeStore.isChanged,
          label: settingsStore.enableAutoSave ? 'Save' : 'Done',
        }
      }
      if (keeStore.isNotSave) {
        return {
          secondary: true,
          strong: true,
          type: 'primary',
          disabled: false,
          label: 'Save',
        }
      }
      return {
        quaternary: true,
        disabled: true,
        label: 'Done',
      }
    })

    const isBackRefresh = ref(false)
    const syncAndSave = async () => {
      await getEntryDetail()
      await saveDatabaseAsync()
      isBackRefresh.value = true
    }

    const complexEditorRef = ref()
    const isShowIconEdit = ref(false)
    const isShowPreviewModal = ref(false)

    const menuOptions = computed(() => {
      return [
        {
          label: '🔰 Preview (Ctrl+/)',
          props: {
            onClick: async () => {
              isShowPreviewModal.value = true
            },
          },
        },
        {
          label: '🦆 Edit Icon & Color',
          props: {
            onClick: async () => {
              isShowIconEdit.value = true
            },
          },
        },
        !editorSettingsStore.isAdvancedEditor && {
          label: '💫 Enable HyperMD Editor',
          props: {
            onClick: async () => {
              editorSettingsStore.isAdvancedEditor = true
            },
          },
        },
      ].filter(Boolean)
    })

    const titleInputRef = ref()

    const handleBack = () => {
      const back = () => {
        keeStore.detailUuid = null
        if (isBackRefresh.value) {
          globalEventBus.emit(GlobalEvents.REFRESH_ENTRY_LIST)
        }
      }
      if (keeStore.isChanged) {
        window.$dialog.warning({
          title: 'Confirm',
          content: 'Discard Changes?',
          positiveText: 'OK',
          negativeText: 'Cancel',
          onPositiveClick: () => {
            back()
          },
          onNegativeClick: () => {},
        })
        return
      }
      back()
    }

    return {
      keeStore,
      settingsStore,
      editorSettingsStore,
      entryDetail,
      handleBack,
      entryDetailTimes,
      handleSave,
      commonSaveDatabase,
      keepassIcons,
      complexEditorRef,
      showEditorSettings() {
        complexEditorRef.value.showSettings()
      },
      isShowIconEdit,
      menuOptions,
      isShowPreviewModal,
      titleInputRef,
      syncAndSave,
      saveBtnInfo,
    }
  },
})
</script>

<template>
  <div class="detail-view">
    <n-layout class="layout-inner-root">
      <n-layout-header class="detail-header" bordered>
        <n-space align="center" justify="space-between" class="header-space">
          <n-button quaternary @click="handleBack">
            <n-icon size="18"> <ArrowLeft16Regular /> </n-icon>&nbsp;Back</n-button
          >

          <div class="entry-title" v-if="entryDetail">
            <n-dropdown
              :options="menuOptions"
              key-field="label"
              placement="bottom-start"
              trigger="hover"
            >
              <n-button size="small" quaternary @click="isShowIconEdit = true">
                <IconDisplay
                  :icon="entryDetail.icon"
                  :bg-color="entryDetail.bgColor"
                  :fg-color="entryDetail.fgColor"
                />
                <span v-if="keeStore.isChanged">* </span>
              </n-button>
            </n-dropdown>
          </div>

          <n-space size="small" align="center">
            <!--            保存当前编辑的内容-->
            <n-button
              :type="saveBtnInfo.type"
              :secondary="saveBtnInfo.secondary"
              :quaternary="saveBtnInfo.quaternary"
              :strong="saveBtnInfo.strong"
              :disabled="saveBtnInfo.disabled"
              @click="handleSave"
            >
              <n-icon size="18"> <Save20Regular /> </n-icon>&nbsp;{{ saveBtnInfo.label }}
            </n-button>

            <!--            保存数据库-->
            <!--            <n-button-->
            <!--              strong-->
            <!--              secondary-->
            <!--              v-if="!settingsStore.enableAutoSave && keeStore.isNotSave && !keeStore.isChanged"-->
            <!--              type="primary"-->
            <!--              @click="commonSaveDatabase"-->
            <!--            >-->
            <!--              <n-icon size="20"> <Save20Regular /></n-icon>&nbsp;Save-->
            <!--            </n-button>-->
          </n-space>
        </n-space>
      </n-layout-header>

      <div v-if="entryDetail && 'fieldsV2' in entryDetail" class="detail-card-wrap">
        <div class="detail-card">
          <n-space vertical class="detail-infos">
            <n-space justify="space-between">
              <n-space align="center">
                <n-date-picker
                  size="small"
                  v-model:value="entryDetailTimes[0]"
                  type="datetime"
                  @update:value="keeStore.isChanged = true"
                  title="Create Time"
                >
                  <template #date-icon>
                    <n-icon size="18"> <CalendarAdd20Regular /> </n-icon>
                  </template>
                </n-date-picker>
                <n-date-picker
                  size="small"
                  v-model:value="entryDetailTimes[1]"
                  type="datetime"
                  disabled
                  title="Update Time"
                >
                  <template #date-icon>
                    <n-icon size="18"> <CalendarEdit16Regular /> </n-icon>
                  </template>
                </n-date-picker>
              </n-space>

              <n-space size="small" align="center">
                <n-button
                  size="small"
                  quaternary
                  @click="editorSettingsStore.isShowMore = !editorSettingsStore.isShowMore"
                  title="Toggle more details"
                >
                  <n-icon size="18">
                    <TextboxMore20Filled v-if="editorSettingsStore.isShowMore" />
                    <TextboxMore20Regular v-else />
                  </n-icon>
                </n-button>

                <n-button
                  size="small"
                  quaternary
                  v-if="editorSettingsStore.isAdvancedEditor"
                  @click="showEditorSettings"
                  title="Editor Settings"
                >
                  <n-icon size="18">
                    <TextBoxSettings24Regular />
                  </n-icon>
                </n-button>
              </n-space>
            </n-space>

            <n-input-group>
              <n-input
                size="small"
                ref="titleInputRef"
                autofocus
                v-model:value="entryDetail.fieldsV2.Title"
                type="text"
                placeholder="Title"
              >
              </n-input>
            </n-input-group>

            <n-collapse-transition :show="entryDetail && editorSettingsStore.isShowMore">
              <div class="extra-info">
                <div class="extra-item">
                  <label>Username</label>
                  <n-input
                    size="small"
                    v-model:value="entryDetail.fieldsV2.UserName"
                    placeholder=""
                  />
                </div>
                <div class="extra-item">
                  <label>Password</label>
                  <n-input
                    size="small"
                    v-model:value="entryDetail.fieldsV2.Password"
                    type="password"
                    show-password-on="click"
                    class="font-code"
                  />
                </div>
                <div class="extra-item">
                  <label>URL</label>
                  <n-input size="small" v-model:value="entryDetail.fieldsV2.URL" placeholder="" />
                </div>
              </div>

              <AttachmentBox :entry-detail="entryDetail" @dataUpdated="syncAndSave" />
            </n-collapse-transition>
          </n-space>

          <MarkdownEditor
            ref="complexEditorRef"
            v-if="editorSettingsStore.isAdvancedEditor"
            v-model="entryDetail.fieldsV2.Notes"
            @turnOff="editorSettingsStore.isAdvancedEditor = false"
          />
          <n-input
            v-else
            v-model:value="entryDetail.fieldsV2.Notes"
            type="textarea"
            placeholder="Input your Note here."
            :autosize="{
              minRows: 20,
            }"
            style="background-color: inherit !important"
          />
        </div>
      </div>

      <DialogEntryIconColor v-model:visible="isShowIconEdit" :entry-detail="entryDetail" />

      <DialogEntryPreview v-model:visible="isShowPreviewModal" :preview-detail="entryDetail" />
    </n-layout>
  </div>
</template>

<style lang="scss" scoped>
.detail-view {
  top: 0;
  left: 0;
  z-index: 100;
  position: absolute;
  width: 100%;
  height: 100%;
  $min_width: 800px;

  .detail-header {
    .header-space {
      width: 100%;
      height: 100%;
      padding: 6px 24px;
      box-sizing: border-box;
      @media screen and (max-width: $min_width) {
        padding: 2px;
      }
      @media screen and (max-height: 500px) {
        height: 10px;
        overflow: hidden;
        transition: all 0.3s;
        opacity: 0;
        &:hover {
          opacity: 1;
          height: 100%;
          border: 1px dashed;
        }
      }
    }
  }

  .entry-title {
    max-width: 50vw;
    font-weight: 500;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .layout-inner-root {
    height: 100%;
    :deep(.n-layout-scroll-container) {
      display: flex;
      flex-direction: column;
    }

    .detail-card-wrap {
      flex: 1;
      overflow: auto;
      padding-top: 10px;
      padding-bottom: 5px;
      @media screen and (max-height: 500px) {
        padding-top: 0;
      }
    }

    .detail-card {
      margin-left: auto;
      margin-right: auto;
      width: $min_width;

      @media screen and (max-width: $min_width) {
        width: 100%;
        padding: 0 10px;
        box-sizing: border-box;
      }

      @media screen and (max-width: 1200px) {
        margin-top: 10px;
      }
      @media screen and (max-height: 500px) {
        margin-top: 1px;
      }
      .detail-infos {
        @media screen and (max-height: 500px) {
          height: 10px;
          overflow: hidden;
          transition: all 0.3s;
          opacity: 0;
          &:hover {
            margin-left: -5px;
            margin-right: -5px;
            padding: 5px 5px 0;
            opacity: 1;
            outline: 1px dashed;
            height: 100%;
          }
        }
        .extra-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: auto;
          gap: 10px;
          @media screen and (max-width: $min_width) {
            grid-template-columns: repeat(1, 1fr);
          }
          .extra-item {
            display: flex;
            align-items: center;
            label {
              margin-right: 5px;
              min-width: 70px;
              text-align: right;
            }
          }
        }
      }
    }
  }
}
</style>
