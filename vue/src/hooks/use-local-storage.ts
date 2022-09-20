import {Ref} from 'vue'

export const useLocalStorageBoolean = (key, defaultValue = false): Ref<boolean> => {
  const flag = ref<boolean>(
    defaultValue ? !Boolean(localStorage.getItem(key)) : Boolean(localStorage.getItem(key))
  )

  watch(flag, (val) => {
    if (!defaultValue) {
      val = !val
    }
    if (val) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, '1')
    }
  })

  return flag
}

export const useLocalStorageString = (key, defaultValue = ''): Ref<string> => {
  const val = ref<string>(localStorage.getItem(key) || defaultValue)
  watch(val, (val) => {
    if (val) {
      localStorage.setItem(key, val)
    } else {
      localStorage.removeItem(key)
    }
  })
  return val
}

export const useLocalStorageNumber = (key, defaultValue = 0): Ref<number> => {
  const val = ref<number>(Number(localStorage.getItem(key)) || defaultValue)
  watch(val, (val) => {
    if (val) {
      localStorage.setItem(key, String(val))
    } else {
      localStorage.removeItem(key)
    }
  })
  return val
}