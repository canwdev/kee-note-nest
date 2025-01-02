<script lang="ts">
import {defineComponent} from 'vue'
import moment from 'moment/moment'

/*
// 如果在全局引用了，这里不需要重复引用
// 全局设置moment地区语言
import 'moment/min/locales'
const locale =
  navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language
moment.locale(locale)
*/

import {useSettingsStore} from '@/store/settings'
import MonthPicker from '@/components/CanUI/packages/CalendarLite/MonthPicker.vue'

export default defineComponent({
  name: 'CalendarLite',
  components: {MonthPicker},
  props: {
    initDate: {
      type: Date,
      default() {
        return new Date()
      },
    },
    showSwitch: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, {emit}) {
    const {initDate} = toRefs(props)
    const iDate = shallowRef<moment.Moment>(moment())

    watch(iDate, (val) => {
      emit('dateChange', val)
    })

    const settingsStore = useSettingsStore()
    watch(
      () => settingsStore.calendarWeekIndex,
      () => {
        setTimeout(() => {
          generateCalendar()
        })
      },
    )

    // 获取当前地区的周的第一天
    const firstDayOfWeek = computed(() => {
      return settingsStore.calendarWeekIndex < 0
        ? moment.localeData().firstDayOfWeek()
        : settingsStore.calendarWeekIndex
    })

    const daysOfWeek = computed((): string[] => {
      // 根据当前地区的周的第一天开始顺序生成的星期名称数组
      // 如：['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const weekdays: string[] = []
      for (let i = 0; i < 7; i++) {
        const dayIndex = (firstDayOfWeek.value + i) % 7 // 根据第一天开始顺序计算每个星期的索引
        weekdays.push(moment.weekdaysShort(dayIndex))
      }
      return weekdays
    })
    const monthWeeks = ref<moment.Moment[][]>([])
    const generateCalendar = () => {
      const d = iDate.value
      const startDate = moment(d).startOf('month').startOf('week')
      const endDate = moment(d).endOf('month').endOf('week')

      const currentDay = moment(d).date()
      const weeks: moment.Moment[][] = []
      let week: moment.Moment[] = []
      for (let day = startDate.clone(); day.isSameOrBefore(endDate); day.add(1, 'day')) {
        week.push(moment(day))

        if (day.weekday() === 6) {
          weeks.push(week)
          week = []
        }
      }
      monthWeeks.value = weeks
    }

    onBeforeMount(() => {
      iDate.value = moment(initDate.value)
      generateCalendar()
    })

    const isShowPopover = ref(false)
    const goMonth = (val) => {
      iDate.value = moment(val)
      generateCalendar()
    }

    const goPrevMonth = () => {
      iDate.value = moment(iDate.value).subtract(1, 'month')
      generateCalendar()
    }
    const goNextMonth = () => {
      iDate.value = moment(iDate.value).add(1, 'month')
      generateCalendar()
    }

    const getCellClass = (day) => {
      const d = iDate.value
      const cls: string[] = []
      if (moment(day).isSame(moment(), 'day')) {
        cls.push('current-day')
      } else if (moment(day).isBefore(moment(d).startOf('month'))) {
        cls.push('previous-month-day')
      } else if (moment(day).isAfter(moment(d).endOf('month'))) {
        cls.push('next-month-day')
      }

      // 星期数
      const wDay = day.day()
      if (wDay === 6 || wDay === 0) {
        cls.push('day-weekend')
      }
      cls.push(`d-${wDay}`)

      return cls
    }

    return {
      titleDisplay: computed(() => {
        return iDate.value.format('MMMM YYYY')
      }),
      iDate,
      isShowPopover,
      goMonth,
      goPrevMonth,
      goNextMonth,
      daysOfWeek,
      monthWeeks,
      getCellClass,
    }
  },
})
</script>

<template>
  <div class="calendar-wrap">
    <div class="cal-header">
      <div class="h-left">
        <slot name="headerLeft"></slot>
        <span class="cal-title">
          {{ titleDisplay }}
        </span>
      </div>
      <div class="h-right">
        <div class="flex-row-center-gap" v-if="showSwitch">
          <button class="btn-no-style" @click="goPrevMonth">
            <span class="mdi mdi-chevron-left"></span>
          </button>

          <MonthPicker :model-value="iDate" @update:model-value="(val) => goMonth(val)" />

          <button class="btn-no-style" @click="goNextMonth">
            <span class="mdi mdi-chevron-right"></span>
          </button>
        </div>
      </div>
    </div>
    <div class="cal-main-wrap">
      <div class="cal-main">
        <div class="cal-weekdays">
          <div v-for="day in daysOfWeek" :key="day" class="week-col week-day-title">{{ day }}</div>
        </div>
        <div v-for="(week, index) in monthWeeks" :key="index" class="cal-weekdays">
          <div
            v-for="(day, di) in week"
            :key="di"
            class="week-col day-wrap"
            @contextmenu="$emit('onDayContextMenu', {event: $event, day})"
            :class="getCellClass(day)"
            :data-date="day.format('YYYY-MM-DD')"
          >
            <slot name="day" :day="day">
              <span class="date-title">{{ day.date() }}</span>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.calendar-wrap {
  display: flex;
  flex-direction: column;
  min-width: 300px;
  min-height: 300px;
  height: 100%;
  max-width: 1200px;

  .btn-no-style {
    .mdi {
      font-size: 20px;
    }
  }

  .cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    .cal-title {
      font-weight: bold;
      font-size: 18px;
    }

    .h-left,
    .h-right {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .cal-main-wrap {
    padding: 0 16px;
    flex: 1;
  }

  .cal-main {
    border-right: 1px solid $color_border;
    border-bottom: 1px solid $color_border;

    .cal-weekdays {
      display: flex;
      align-items: center;
      .week-col {
        flex: 1;
        text-align: center;
        border-top: 1px solid $color_border;
        border-left: 1px solid $color_border;
        position: relative;
        transition: background-color 0.5s;
        overflow: hidden;

        .date-title {
          position: absolute;
          right: 8px;
          bottom: 8px;
          font-size: 16px;
          line-height: 1;
          font-weight: 500;

          @media screen and (max-width: 900px) {
            font-size: 12px;
          }
        }
        .lunar-day {
          font-size: 14px;
          font-weight: 400;
          @media screen and (max-width: 900px) {
            font-size: 10px;
          }
        }

        &.week-day-title {
          font-weight: 600;
        }

        &.day-wrap {
          height: 100px;
        }

        &.day-weekend {
          color: $primary_alt;
        }

        &:hover {
          background-color: rgba(91, 85, 85, 0.05);
          transition: background-color 0s;
        }

        &.active {
          background-color: $primary_opacity !important;
          transition: background-color 0.5s !important;
        }
      }

      .current-day {
        background-color: rgba($primary, 0.1);

        &:after {
          content: ' ';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: $primary;
        }
      }

      .previous-month-day,
      .next-month-day {
        .date-title {
          opacity: 0.5;
          font-weight: 400;
        }
      }
    }
  }
}
</style>
