<script setup lang="ts">
import {ref, watch, computed, onMounted} from 'vue'

const props = defineProps<{
  modelValue: any
}>()
const emit = defineEmits(['update:modelValue'])

const monthInputRef = ref()
const internalDateString = ref('')

const dateString = computed({
  get: () => {
    if (!props.modelValue) return ''
    const date = new Date(props.modelValue)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  },
  set: (value) => {
    if (!value) return
    const [year, month] = value.split('-').map(Number)
    const newDate = new Date(year, month - 1)
    emit('update:modelValue', newDate)
  },
})
watch(
  () => props.modelValue,
  () => {
    internalDateString.value = dateString.value
  },
  {
    immediate: true,
  },
)

const showPicker = () => {
  setTimeout(() => {
    if (monthInputRef.value) {
      monthInputRef.value.showPicker()
    }
  })
}
</script>

<template>
  <div class="month-picker">
    <button class="btn-no-style" @click="showPicker">
      <span class="mdi mdi-calendar"></span>
    </button>
    <input
      type="month"
      ref="monthInputRef"
      :value="internalDateString"
      @input="dateString = ($event.target as HTMLInputElement).value"
    />
  </div>
</template>

<style lang="scss" scoped>
.month-picker {
  width: 20px;
  height: 20px;
  position: relative;
  .button {
    width: 100%;
    height: 100%;
    .mdi {
      font-size: 20px;
      line-height: 1;
    }
  }
  input {
    border: 1px solid #ccc;
    padding: 8px;
    border-radius: 4px;
    visibility: hidden;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
</style>
