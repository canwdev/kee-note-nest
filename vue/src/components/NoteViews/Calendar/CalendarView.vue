<script lang="ts">
import {defineComponent} from 'vue'
import {useKeeNoteEntryList} from '@/hooks/use-keenote'
import {useCommonActions} from '@/components/NoteViews/use-common-actions'
import DialogGroupSelect from '@/components/NoteViews/Dialogs/DialogGroupSelect.vue'
import DialogEntryPreview from '@/components/NoteViews/Dialogs/DialogEntryPreview.vue'
import CalendarLite from '@/components/CanUI/packages/CalendarLite/index.vue'
import MiniList from '@/components/NoteViews/Calendar/MiniList.vue'
import LunarDay from '@/components/NoteViews/Calendar/LunarDay.vue'
import {useSettingsStore} from '@/store/settings'
import {useCnHoliday} from '@/components/NoteViews/Calendar/use-holiday'
import {pad2Num} from '@/utils'
import HolidayDisplay from '@/components/NoteViews/Calendar/HolidayDisplay.vue'
import {CalendarCheckmark20Regular} from '@vicons/fluent'
import DataVisualization from '@/components/NoteViews/DataVisualization/index.vue'
import moment from 'moment/moment'

export default defineComponent({
  name: 'CalendarView',
  components: {
    DataVisualization,
    CalendarCheckmark20Regular,
    HolidayDisplay,
    LunarDay,
    MiniList,
    CalendarLite,
    DialogGroupSelect,
    DialogEntryPreview,
  },
  setup() {
    const settingsStore = useSettingsStore()

    const calendarRef = ref()
    const calendarMm = ref<moment.Moment>(moment())

    const {calendarData, getEntryList, keeStore, groupUuid} = useKeeNoteEntryList({
      isCalendar: true,
      getCalendarParams: () => {
        const mm = calendarMm.value

        // 获取上一个月的第一天
        const firstDay = moment(mm).subtract(1, 'month').startOf('month')
        // 获取下一个月的最后一天和最后时刻
        const lastDay = moment(mm).add(1, 'month').endOf('month').endOf('day')

        return {
          startDate: firstDay.valueOf(),
          endDate: lastDay.valueOf(),
        }
      },
    })

    const getAttributes = (mm) => {
      try {
        const year = mm.year()
        const month = mm.month() + 1
        const date = mm.date()

        return calendarData.value[year][month][date]
      } catch (e) {
        // console.error(e)
      }
    }

    const handlePreview = (item) => {
      nodeAction(item, () => {
        isShowPreviewModal.value = true
      })
    }
    const handleItemContextMenu = (event: MouseEvent, item?) => {
      handleContextmenu(event, item)
    }

    const {
      editingNode,
      nodeAction,
      handleContextmenu,
      isShowGroupSelectModal,
      isShowPreviewModal,
      handleSelectGroup,
      getMenuOptions,
      ...contextMenuEtc
    } = useCommonActions({getEntryList})

    const {currentYearHolidayMap} = useCnHoliday(calendarMm)
    const handleCalendarDateChange = async (date: moment.Moment) => {
      calendarMm.value = date
      if (keeStore.isDbOpened) {
        await getEntryList()
      }
    }
    const getHoliday = (mm) => {
      try {
        if (!currentYearHolidayMap.value) {
          return null
        }
        const month = pad2Num(mm.month() + 1)
        const date = pad2Num(mm.date())
        if (currentYearHolidayMap.value[month]) {
          return currentYearHolidayMap.value[month][date]
        }
        return null
      } catch (e: any) {
        return e.message
      }
    }

    const isShowDataVisualization = ref(false)

    const handleSeriesClick = ({date}) => {
      // console.log(date)
      if (calendarRef.value) {
        calendarRef.value.goMonth(date)

        // 播放高亮动画
        setTimeout(() => {
          const calEl = calendarRef.value.$el
          const el = calEl.querySelector(`.day-wrap[data-date="${date}"]`)
          if (el) {
            el.classList.add('active')
            setTimeout(() => {
              el.classList.remove('active')
            }, 1500)
          }
        }, 200)
      }

      isShowDataVisualization.value = false
    }

    return {
      settingsStore,
      calendarRef,
      getAttributes,
      handlePreview,
      handleItemContextMenu,
      editingNode,
      nodeAction,
      handleContextmenu,
      isShowGroupSelectModal,
      isShowPreviewModal,
      handleSelectGroup,
      getMenuOptions,
      ...contextMenuEtc,
      groupUuid,
      calendarData,
      handleCalendarDateChange,
      getHoliday,
      isShowDataVisualization,
      handleSeriesClick,
    }
  },
})
</script>
<template>
  <div class="calendar-view-v2">
    <CalendarLite
      ref="calendarRef"
      v-show="!isShowDataVisualization"
      @dateChange="handleCalendarDateChange"
      @onDayContextMenu="({event, day}) => handleItemContextMenu(event, {day})"
    >
      <template #headerLeft>
        <n-icon
          size="24"
          class="cursor-pointer"
          title="Data Visualization"
          @click="isShowDataVisualization = true"
        >
          <CalendarCheckmark20Regular />
        </n-icon>
      </template>
      <template #day="{day}">
        <div class="mini-list-scroll">
          <MiniList
            :list="getAttributes(day)"
            @onItemClick="(item) => handlePreview(item)"
            @onItemContextMenu="({event, item}) => handleItemContextMenu(event, item)"
          />
        </div>
        <HolidayDisplay v-if="settingsStore.calendarShowLunar" :item="getHoliday(day)" />
        <span class="date-title">
          <LunarDay
            v-if="settingsStore.calendarShowLunar"
            :year="day.year()"
            :month="day.month() + 1"
            :day="day.date()"
            class="lunar-label"
          />
          {{ day.date() }}
        </span>
      </template>
    </CalendarLite>

    <DataVisualization
      :show="isShowDataVisualization"
      @onBack="isShowDataVisualization = false"
      @onSeriesClick="handleSeriesClick"
    />

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

    <DialogGroupSelect
      v-model:visible="isShowGroupSelectModal"
      :value="groupUuid"
      @onSubmit="handleSelectGroup"
    />

    <DialogEntryPreview
      v-model:visible="isShowPreviewModal"
      :uuid="editingNode && editingNode.uuid"
    />
  </div>
</template>

<style lang="scss">
.calendar-view-v2 {
  height: 100%;
  user-select: none;
  .mini-list-scroll {
    height: calc(100px - 30px);
    overflow-y: auto;
    position: relative;
    z-index: 2;
  }
  .holiday-display {
    position: absolute;
    left: 8px;
    bottom: 8px;
    @media screen and (max-width: 450px) {
      transform: scale(0.8);
      transform-origin: left bottom;
      left: unset;
      bottom: unset;
      top: 0;
      right: 0;
      z-index: 1;
    }
  }
}
</style>
