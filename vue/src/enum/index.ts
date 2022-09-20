export const API_BASE_URL = import.meta.env.VITE_API_HOST || ''
export const API_PROXY_BASE = import.meta.env.VITE_PROXY_BASE || ''

export enum ThemeType {
  SYSTEM = 0,
  LIGHT = 1,
  DARK = 2,
}
export const getUserTheme = () => Number(localStorage.getItem(LS_KEY_THEME)) || ThemeType.SYSTEM
export const getMyCryptKey = () => localStorage.getItem(LS_KEY_MY_CRYPT_KEY)

export const LS_KEY_AUTHORIZATION = 'ck_keenote_authorization'
export const LS_KEY_THEME = 'ck_keenote_theme'
export const LS_KEY_MY_CRYPT_KEY = 'ck_keenote_MY_CRYPT_KEY'
export const LS_KEY_DONT_SAVE_HISTORY = 'ck_keenote_dont_save_history'
export const LS_KEY_HISTORY_LIST = 'ck_keenote_history_list'

export const getLocalStorageObject = (key, fallback?) => {
  const str = localStorage.getItem(key)
  if (str) {
    return JSON.parse(str)
  }
  return fallback
}
export const setLocalStorageObject = (key, obj) => {
  localStorage.setItem(key, JSON.stringify(obj))
}