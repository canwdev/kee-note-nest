<script lang="ts">
import {kService} from '@/api'
import {GroupItem} from '@/enum/kdbx'
import {defineComponent} from 'vue'
import {useRouter} from 'vue-router'
import globalEventBus, {GlobalEvents, saveDatabaseAsync} from '@/utils/bus'
import {isElectron} from '@/utils/backend'
import {useContextMenu} from '@/hooks/use-context-menu'
import {LsKeys} from '@/enum'
import ListView from '@/components/NoteViews/ListView.vue'
import CalendarView from '@/components/NoteViews/Calendar/CalendarView.vue'
import IconDisplay from '@/components/NoteViews/IconDisplay.vue'
import DialogIconChooser from '@/components/NoteViews/Dialogs/DialogIconChooser.vue'
import {useMainStore} from '@/store/main'

import {importEntryListJson} from '@/utils/export-import'
import {useSettingsStore} from '@/store/settings'
import {useKeeNoteGroupManage, useKeeNoteSaveClose} from '@/hooks/use-keenote'
import DetailView from '@/views/Note/DetailView.vue'
import {checkDatabaseIsOpen} from '@/api/keepass'
import DialogSearch from '@/components/NoteViews/DataSearch/DialogSearch.vue'
import DropdownMenu from '@/components/CanUI/packages/OptionUI/Tools/DropdownMenu.vue'
import FoldableSidebarLayout from '@/components/CanUI/packages/Layouts/FoldableSidebarLayout.vue'

export default defineComponent({
  name: 'NoteLayout',
  components: {
    FoldableSidebarLayout,
    DropdownMenu,
    DialogSearch,
    DetailView,
    ListView,
    CalendarView,
    DialogIconChooser,
  },
  setup() {
    const router = useRouter()

    const mainStore = useMainStore()
    const settingsStore = useSettingsStore()

    const getMenuOptions = (option, event?: MouseEvent) => {
      let isRootSelected = option
        ? option.uuid === rootGroupUuid.value
        : groupUuid.value === rootGroupUuid.value

      const isShiftPressed = event?.shiftKey

      let isEmptyRecycleBin = false
      if (option) {
        isEmptyRecycleBin = keeStore.recycleBinUuid === option.uuid
      } else {
        isEmptyRecycleBin = keeStore.recycleBinUuid === editingUuid.value
      }

      return [
        {
          label: '🗒️ Create Note',
          props: {
            onClick: () => {
              nodeAction(option, () => {
                handleCreateEntry()
              })
            },
          },
        },
        {
          label: '📁 Create Group',
          props: {
            onClick: () => {
              nodeAction(option, () => {
                handleCreateGroup()
              })
            },
          },
        },
        option && {
          label: '📝 Rename Group',
          props: {
            onClick: () => {
              nodeAction(option, () => {
                showRenameModal()
              })
            },
          },
        },
        option && {
          label: '🌟 Change Icon',
          props: {
            onClick: () => {
              nodeAction(option, () => {
                isShowChooseIconModal.value = true
              })
            },
          },
        },
        {
          label: '📥 Import JSON',
          props: {
            onClick: () => {
              handleImportJson()
            },
          },
        },
        !isRootSelected && {
          label: isEmptyRecycleBin
            ? '❌ Empty Recycle Bin'
            : isShiftPressed
            ? '❌ Permanent Delete'
            : '🚮 Move to Recycle Bin',
          props: {
            onClick: () => {
              nodeAction(option, () => {
                confirmRemoveGroup(isShiftPressed)
              })
            },
          },
        },
      ].filter(Boolean)
    }

    const {editingNode, nodeAction, handleContextmenu, ...contextMenuEtc} =
      useContextMenu(getMenuOptions)

    onMounted(() => {
      window.addEventListener('keydown', listenShortcuts)
    })
    onBeforeUnmount(() => {
      window.removeEventListener('keydown', listenShortcuts)
    })
    const listenShortcuts = (event) => {
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase()
        if (key === 'l') {
          event.preventDefault()
          if (!keeStore.isChanged) {
            handleToggleLock()
          }
        } else if (key === 's') {
          if (!keeStore.detailUuid) {
            event.preventDefault()
            if (keeStore.isNotSave) {
              // TODO: 处理快速重复按键，避免重复请求
              commonSaveDatabase()
            }
          }
        }
      }
    }

    const {
      groupTree,
      keeStore,
      getGroupTree,
      selectedKeys,
      groupUuid,
      rootGroupUuid,
      editingUuid,
      handleOpenDatabase,
      handleCreateEntry,
      handleCreateGroup,
      confirmRemoveGroup,
      handleTreeDrop,
      showRenameModal,
      isShowChooseIconModal,
      handleSelectIcon,
      handleCloseDatabase,
      handleToggleLock,
    } = useKeeNoteGroupManage(editingNode)

    const {commonSaveDatabase} = useKeeNoteSaveClose()

    onActivated(async () => {
      keeStore.isDbOpened = await kService.checkDatabaseIsOpen()
      if (keeStore.isDbOpened) {
        await getGroupTree()
      } else {
        await handleOpenDatabase()
      }
    })

    const menuOptionsBase = [
      {
        label: '⚙️ Settings',
        props: {
          onClick: () => {
            globalEventBus.emit(GlobalEvents.SHOW_SETTINGS)
          },
        },
      },

      !isElectron && {
        type: 'divider',
        label: 'd_logout',
      },
      !isElectron && {
        label: '🏃 Logout',
        props: {
          onClick: () => {
            handleLogout()
          },
        },
      },
    ].filter(Boolean)

    const menuOptions = computed(() => {
      const options = [
        {
          label: settingsStore.isCalendarView ? '📃 List View' : '📅 Calendar View',
          props: {
            onClick: () => {
              settingsStore.isCalendarView = !settingsStore.isCalendarView
            },
          },
        },
        ...menuOptionsBase,
      ]
      if (groupUuid.value) {
        return [
          ...getMenuOptions(null),
          {
            split: true,
          },
          ...options,
        ]
      }
      return options
    })

    const handleImportJson = async () => {
      await importEntryListJson(editingUuid.value)
    }

    const handleLogout = async () => {
      try {
        await handleCloseDatabase()
      } catch (e) {
        window.$message.warning('Database close failed')
      }
      localStorage.removeItem(LsKeys.LS_KEY_AUTHORIZATION)
      await router.replace({
        name: 'HomeView',
      })
    }

    const isShowSearchDialog = ref(false)

    return {
      mainStore,
      settingsStore,
      keeStore,
      isElectron,
      groupTree,
      selectedKeys,
      menuOptions,
      editingNode,
      isShowChooseIconModal,
      renderPrefix({option}: {option: GroupItem}) {
        return h(IconDisplay, {
          icon: option.icon,
          size: 18,
        })
      },
      nodeProps: ({option}: {option: any}) => {
        return {
          onClick() {
            // message.info('[Click] ' + option)
          },
          onContextmenu(e: MouseEvent): void {
            handleContextmenu(e, option)
          },
        }
      },
      handleTreeDrop,
      handleSelectIcon,
      handleLogout,
      handleToggleLock,
      commonSaveDatabase,
      isShowSearchDialog,
      ...contextMenuEtc,
    }
  },
})
</script>

<template>
  <div class="note-layout">
    <div class="nav-header-content">
      <div class="flex-row-center-gap">
        <span class="logo-icon mdi mdi-lock"> </span>
        <span class="note-title"> KeeNote {{ keeStore.isNotSave ? '*' : '' }}</span>

        <button
          v-if="keeStore.isNotSave"
          @click="commonSaveDatabase"
          title="Save (ctrl+s)"
          class="btn-no-style"
        >
          <span class="mdi mdi-content-save"></span>
        </button>
      </div>

      <div class="flex-row-center-gap">
        <button
          class="btn-no-style"
          :title="keeStore.isDbOpened ? 'Lock' : 'Unlock'"
          @click="handleToggleLock"
        >
          <span v-if="keeStore.isDbOpened" class="mdi mdi-shield-lock"></span>
          <span class="mdi mdi-key" v-else></span>
        </button>

        <button class="btn-no-style" title="Search" @click="isShowSearchDialog = true">
          <span class="mdi mdi-magnify"></span>
        </button>

        <DropdownMenu :options="menuOptions">
          <el-badge :hidden="!mainStore.isServerRunning" is-dot type="success" :offset="[-4, 5]">
            <button class="btn-no-style" title="Menu">
              <span class="mdi mdi-cog"></span>
            </button>
          </el-badge>
        </DropdownMenu>
      </div>
    </div>
    <FoldableSidebarLayout v-model="settingsStore.isSidebarCollapsed">
      <template #sidebar>
        <n-scrollbar x-scrollable>
          <n-tree
            style="min-width: 150px"
            block-line
            :data="groupTree"
            key-field="uuid"
            label-field="title"
            children-field="children"
            class="content-padding"
            selectable
            default-expand-all
            draggable
            :cancelable="false"
            :node-props="nodeProps"
            @drop="handleTreeDrop"
            :render-prefix="renderPrefix"
            v-model:selected-keys="selectedKeys"
          />
        </n-scrollbar>
      </template>
      <template #default>
        <template v-if="groupTree.length">
          <CalendarView v-if="settingsStore.isCalendarView" />
          <ListView v-else />
        </template>
      </template>
    </FoldableSidebarLayout>

    <DialogIconChooser v-model:visible="isShowChooseIconModal" @onSelectIcon="handleSelectIcon" />

    <n-dropdown
      trigger="manual"
      placement="bottom-start"
      :show="showRightMenu"
      :options="rightMenuOptions"
      :x="xRef"
      :y="yRef"
      @select="handleSelect"
      key-field="label"
      :on-clickoutside="handleClickOutside"
    />
  </div>

  <transition name="fade-scale">
    <DetailView v-if="Boolean(keeStore.detailUuid)" />
  </transition>

  <DialogSearch v-model:visible="isShowSearchDialog" />
</template>

<style lang="scss" scoped>
.note-layout {
  height: 100%;
  display: flex;
  flex-direction: column;

  .nav-header-content {
    padding: 8px 24px;
    box-sizing: border-box;
    user-select: none;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid $color_border;

    .btn-no-style {
      .mdi {
        font-size: 24px;
      }
    }

    .flex-row-center-gap {
      gap: 16px;
    }

    .logo-icon {
      border: 2px solid $primary;
      border-radius: 50%;
      color: $primary;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .note-title {
      @media screen and (max-width: 500px) {
        display: none;
      }
    }
  }

  .foldable-sidebar-layout {
    flex: 1;
    box-shadow: none;
  }
}
</style>
