import * as kdbxweb from 'kdbxweb'
import {Kdbx} from 'kdbxweb'

import {CalendarData, EntryItem, GroupItem} from './entry'

import {
  getFieldString,
  getMapValue,
  readFileAsArrayBuffer,
  saveFileFromArrayBuffer,
  setValDot,
} from '../utils'
import {argon2} from './support/argon2/argon2'
import {KdbxGroup} from 'kdbxweb/dist/types/format/kdbx-group'
import {KdbxEntry} from 'kdbxweb/dist/types/format/kdbx-entry'

kdbxweb.CryptoEngine.setArgon2Impl(argon2)

/**
 * 递归遍历数据库 groups
 * usage: traverseGroupTree(db.groups)
 * return: customized group list
 */
function traverseGroupTree(groups: KdbxGroup[], counter = 0): GroupItem[] {
  const list = []
  if (!groups || groups.length === 0) return list

  groups.forEach((group) => {
    const children = group.groups

    list.push(new GroupItem(group, traverseGroupTree(children, counter + 1)))
  })
  return list
}

function traverseGroupSearch(
  groups: KdbxGroup[],
  searchFn: (entry: KdbxEntry) => boolean,
): KdbxEntry[] {
  const list: KdbxEntry[] = []
  if (!groups || groups.length === 0) return list

  groups.forEach((group) => {
    group.entries.forEach((entry) => {
      if (searchFn(entry)) {
        list.push(entry)
      }
    })

    traverseGroupTree(group.groups)
  })
  return list
}

export interface KdbxOpenOptions {
  dbPath: string
  password: string
  keyPath: string
  name?: string
}

export class KdbxHelper {
  // Kdbx 数据库实例
  db: null | Kdbx
  // 数据库路径
  dbPath: null | string
  // 由于 kdbxweb 不能直接查询 entry，需要保存打开的 entry map
  private curEntryMap: object
  // 数据库是否修改并且没有保存
  isNotSave: boolean

  constructor() {
    this.resetInstance()
  }

  resetInstance() {
    this.db = null
    this.dbPath = null
    this.curEntryMap = {}
    this.isNotSave = false
  }

  // 打开数据库
  async open(options: KdbxOpenOptions) {
    const {dbPath, password, keyPath} = options || {}
    if (!dbPath) {
      throw new Error('[db] dbPath is required!')
    }
    const dbArrayBuffer = await readFileAsArrayBuffer(dbPath)
    let keyFileArrayBuffer
    if (keyPath) {
      keyFileArrayBuffer = await readFileAsArrayBuffer(keyPath)
    }

    const credentials = new kdbxweb.Credentials(
      kdbxweb.ProtectedValue.fromString(password),
      keyFileArrayBuffer,
    )

    const db = await kdbxweb.Kdbx.load(dbArrayBuffer, credentials)

    this.dbPath = dbPath
    this.db = db
    console.log('[db] open success')
    // console.log(db)
  }

  // 创建数据库
  async createDatabase(options: KdbxOpenOptions) {
    const {dbPath, password, keyPath, name} = options || {}
    if (!dbPath) {
      throw new Error('[db] dbPath is required!')
    }
    let keyFileArrayBuffer
    if (keyPath) {
      keyFileArrayBuffer = await readFileAsArrayBuffer(keyPath)
    }

    const credentials = new kdbxweb.Credentials(
      kdbxweb.ProtectedValue.fromString(password),
      keyFileArrayBuffer,
    )

    const db = kdbxweb.Kdbx.create(credentials, name || 'My new db')
    // if KDBX4: Error invoking remote method 'create-database': KdbxError: Error NotImplemented: argon2 not implemented
    // downgrade to KDBX3
    // db.setVersion(3)
    const buffer = await db.save()
    await saveFileFromArrayBuffer(dbPath, buffer)
    console.log('[db] create success', dbPath)
  }

  // 关闭数据库
  close() {
    console.log('[db] closing database...')
    // this.db.close()
    this.resetInstance()
    console.log('[db] database closed')
  }

  // 更改数据库密码和key
  async changeCredentials(params: any = {}) {
    const {password, keyPath} = params
    if (!this.db) {
      throw new Error('[db] instance is not exist')
    }

    if (password) {
      console.log('changing password')
      await this.db.credentials.setPassword(kdbxweb.ProtectedValue.fromString(password))
    }

    if (keyPath) {
      console.log('changing keyPath', keyPath)
      const randomKeyFile = await kdbxweb.Credentials.createRandomKeyFile()
      console.log('[randomKeyFile]', randomKeyFile)
      const keyFileArrayBuffer = await readFileAsArrayBuffer(keyPath)
      console.log('[keyFileArrayBuffer]', keyFileArrayBuffer)
      // Uint8Array
      await this.db.credentials.setKeyFile(keyFileArrayBuffer)
    }

    if (password || keyPath) {
      await this.save()
      console.log('[db] change credentials success')
    }
  }

  // 创建随机密钥
  async createCredentialKey(params: any = {}) {
    const {keyPath} = params

    const randomKeyFile = await kdbxweb.Credentials.createRandomKeyFile()

    // write to key file
    if (!keyPath) {
      throw new Error('[keyPath] is required')
    }
    await saveFileFromArrayBuffer(keyPath, randomKeyFile)
    console.log('[db] key file created', keyPath)
  }

  // 维护数据库
  async maintenanceDatabase(params: any = {}) {
    if (!this.db) {
      throw new Error('[db] instance is not exist')
    }

    const {cleanup = false, upgrade = false, setVersion = null} = params
    if (upgrade) {
      console.log('[db] maintenance: upgrade to latest')
      // upgrade the db to latest version (currently KDBX4)
      this.db.upgrade()
    } else if (setVersion) {
      console.log(`[db] maintenance: setVersion to ${setVersion}`)
      // downgrade to KDBX3 (setVersion=3)
      this.db.setVersion(setVersion)
    }
    if (cleanup) {
      console.log(`[db] maintenance: cleanup`)
      this.db.cleanup({
        historyRules: true,
        customIcons: true,
        binaries: true,
      })
    }
    await this.save()
    console.log('[db] maintenance: save success')
  }

  async save() {
    if (!this.db) {
      throw new Error('[db] instance is not exist')
    }

    console.log('[db] saving database...')
    const buffer = await this.db.save()
    await saveFileFromArrayBuffer(this.dbPath, buffer)
    this.isNotSave = false
    console.log('[db] database saved')
  }

  getGroupTree(groupUuid) {
    if (!this.db) {
      throw new Error('Database may not be open')
    }

    const group = groupUuid ? [this.db.getGroup(groupUuid)] : this.db.groups

    return traverseGroupTree(group)
  }

  /**
   * 获取某群组的条目列表
   * @param groupUuid 群组 Uuid
   * @return {[]}
   */
  getGroupEntries(groupUuid) {
    if (!(this.db && groupUuid)) {
      throw new Error('Invalid db or groupUuid')
    }

    const list = []
    this.curEntryMap = {}
    const group = this.db.getGroup(groupUuid)

    if (group) {
      for (let i = group.entries.length - 1; i >= 0; i--) {
        const entry = group.entries[i]
        this.curEntryMap[entry.uuid.id] = entry
        list.push(new EntryItem(entry))
      }
    }

    return list
  }

  getGroupEntriesDeep(params) {
    const {
      groupUuid,
      // enable isDayMapped for calendar view
      isDayMapped,
      // optional filter of start and end date, format: timestamp
      startDate,
      endDate,
    } = params || {}
    if (!(this.db && groupUuid)) {
      throw new Error('Invalid db or groupUuid')
    }
    this.curEntryMap = {}
    const group: any = this.db.getGroup(groupUuid)
    if (!group) {
      throw new Error(`group ${groupUuid} not found`)
    }

    const list = []

    const dayMap: CalendarData = {}
    let creationTime, year, month, date
    const traverse = (node) => {
      if (!node) return

      node.entries.forEach((entry) => {
        creationTime = entry.times.creationTime
        // filter
        if (startDate) {
          if (startDate && creationTime < startDate) return
        }
        if (endDate) {
          if (endDate && creationTime > endDate) return
        }

        if (isDayMapped) {
          year = creationTime.getFullYear()
          month = creationTime.getMonth() + 1
          date = creationTime.getDate()

          // init map
          if (!dayMap[year]) dayMap[year] = {}
          if (!dayMap[year][month]) dayMap[year][month] = {}
          if (!dayMap[year][month][date]) dayMap[year][month][date] = []

          dayMap[year][month][date].push(new EntryItem(entry))
        } else {
          list.push(new EntryItem(entry))
        }

        this.curEntryMap[entry.uuid.id] = entry
      })

      node.groups.forEach((group) => {
        traverse(group)
      })
    }
    traverse(group)
    if (isDayMapped) {
      return dayMap
    }
    return list
  }

  /**
   * 在 curEntryMap 中获取 entry
   * @param uuid
   * @returns {*}
   */
  getEntry(uuid) {
    console.log(`[db] getEntry ${uuid}`)
    if (!uuid) {
      throw new Error('uuid is required!')
    }

    if (!this.curEntryMap[uuid]) {
      throw new Error(`entry ${uuid} not found in current map (Have you open the entry list?)`)
    }
    return this.curEntryMap[uuid]
  }

  /**
   * 获取 entry 详情
   * @param uuid
   * @returns {EntryItem}
   */
  getEntryDetail(uuid) {
    const entry = this.getEntry(uuid)
    if (!entry) {
      throw new Error(`entry ${uuid} not found`)
    }
    return new EntryItem(entry, true)
  }

  /**
   * 更新一个 entry 对象
   * @returns {EntryItem}
   */
  updateEntry(params) {
    const {
      uuid,
      updates, // 数组
    } = params || {}
    if (!updates) {
      throw new Error('updates is required!')
    }
    console.log(`[db] updateEntry ${uuid}`)
    const entry = this.getEntry(uuid)
    let isAutoUpdateTime = true
    updates.forEach((obj) => {
      // eslint-disable-next-line prefer-const
      let {path, value} = obj
      if (path === 'times.creationTime') {
        // need convert time format to Date!
        value = new Date(value)
      }
      if (path === 'times.lastModTime') {
        value = new Date(value)
        isAutoUpdateTime = false
      }
      setValDot(entry, path, value)
    })
    if (isAutoUpdateTime) {
      entry.times.update()
    }
    this.isNotSave = true
    return new EntryItem(entry, true)
  }

  updateGroup(params) {
    const {
      uuid,
      updates, // 数组
    } = params || {}
    const group = this.db.getGroup(uuid)
    updates.forEach((obj) => {
      const {path, value} = obj
      setValDot(group, path, value)
    })
    this.isNotSave = true
    return new GroupItem(group)
  }

  /**
   * 向群组内添加条目
   * @param params
   * @returns {EntryItem}
   */
  createEntry(params) {
    const {groupUuid, config} = params || {}
    console.log(`[db] createEntry uuid=${groupUuid}`)

    if (!groupUuid) {
      throw new Error('groupUuid and config is required!')
    }

    const {title = 'New Entry', icon, bgColor, fgColor, creationTime, lastModTime} = config || {}

    const group = this.db.getGroup(groupUuid)
    const entry = this.db.createEntry(group)

    entry.fields.set('Title', title)

    // 如果群组是文件夹图标，则设置默认entry为文件图标
    // 48,49 is folder icon, 0 is entry icon, 44 is note icon
    console.log('fix', icon, group.icon)
    entry.icon =
      icon === undefined ? (group.icon === 48 || group.icon === 49 ? 44 : group.icon) : icon

    if (bgColor) {
      entry.bgColor = bgColor
    }
    if (fgColor) {
      entry.fgColor = fgColor
    }
    if (creationTime) {
      entry.times.creationTime = new Date(creationTime)
    }
    if (lastModTime) {
      entry.times.lastModTime = new Date(lastModTime)
    }

    this.isNotSave = true

    this.curEntryMap[entry.uuid.id] = entry

    return new EntryItem(entry)
  }

  /**
   * 向群组内添加群组
   * @param params
   */
  createGroup(params) {
    const {groupUuid, name = 'New Group'} = params || {}

    const group = this.db.getGroup(groupUuid)
    const newGroup = this.db.createGroup(group, name)
    this.isNotSave = true

    return new GroupItem(newGroup)
  }

  /**
   * 删除多条(entry|group)，如果有回收站则移动至回收站
   * @param items entries[] or groups[]
   */
  removeItems(items) {
    if (Array.isArray(items)) {
      items.forEach((items) => {
        this.db.remove(items)
      })
    } else {
      this.db.remove(items)
    }
    this.isNotSave = true
  }

  /**
   * 移动多条(entry|group)
   */
  moveItems(params) {
    const {
      groupUuid, // 群组 Uuid
      items, // entries[] or groups[]
    } = params || {}

    const checkIllegal = (item) => {
      if (item.uuid.id === groupUuid) {
        throw new Error('Moving to the group itself is not allowed')
      }
    }

    // if groupUuid is empty, delete permanently
    const target = groupUuid ? this.db.getGroup(groupUuid) : null
    if (Array.isArray(items)) {
      items.forEach((item) => {
        checkIllegal(item)
        this.db.move(item, target)
      })
    } else {
      checkIllegal(items)
      this.db.move(items, target)
    }
    this.isNotSave = true
  }

  /**
   * 删除 group
   */
  removeGroup(params) {
    const {groupUuid} = params || {}
    const group = this.db.getGroup(groupUuid)
    return this.removeItems(group)
  }

  /**
   * 删除 entry
   */
  removeEntry(params) {
    const {uuid} = params || {}
    this.removeItems(
      Array.isArray(uuid) ? uuid.map((id) => this.getEntry(id)) : this.getEntry(uuid),
    )
  }

  /**
   * 移动 group
   */
  moveGroup(params) {
    const {uuid, targetUuid} = params || {}
    const group = this.db.getGroup(uuid)
    return this.moveItems({
      groupUuid: targetUuid,
      items: group,
    })
  }

  /**
   * 移动 entry
   */
  moveEntry(params) {
    const {uuid, groupUuid} = params || {}

    this.moveItems({
      groupUuid,
      items: Array.isArray(uuid) ? uuid.map((id) => this.getEntry(id)) : this.getEntry(uuid),
    })
  }

  // 数据库是否开启
  get isOpen() {
    return !!this.db
  }

  getMeta() {
    const meta: any = (this.db && this.db.meta) || {}
    const header: any = (this.db && this.db.header) || {}
    return {
      isNotSave: this.isNotSave,
      header: {
        compression: header.compression,
        crsAlgorithm: header.crsAlgorithm,
        endPos: header.endPos,
        versionMajor: header.versionMajor,
        versionMinor: header.versionMinor,
      },
      dbPath: this.dbPath.replace(/\\/g, '/'),
      meta: {
        name: meta.name,
        recycleBinEnabled: meta.recycleBinEnabled,
        recycleBinUuid: meta.recycleBinUuid,
      },
    }
  }

  /**
   * 获取附件
   * @param params
   *    uuid: entry uuid
   *    filename: 文件名
   */
  getAttachment(params) {
    const {uuid, filename} = params || {}
    const entry = this.getEntry(uuid)
    const file = entry.binaries.get(filename)
    if (!file) {
      throw new Error('file not found')
    }
    return file
  }

  removeAttachment(params) {
    const {uuid, filename} = params || {}
    const entry = this.getEntry(uuid)
    const file = entry.binaries.get(filename)
    if (!file) {
      throw new Error('file not found')
    }
    entry.binaries.delete(filename)
  }

  async setAttachment(params) {
    const {uuid, filename, buffer} = params || {}
    const entry = this.getEntry(uuid)

    const binaryRef = await this.db.createBinary(buffer)

    entry.binaries.set(filename, binaryRef)
  }

  async renameAttachment(params) {
    const {uuid, filename, newFilename} = params || {}
    const entry = this.getEntry(uuid)

    const file = entry.binaries.get(filename)
    if (!file) {
      throw new Error('file not found')
    }
    entry.binaries.set(newFilename, file)
    entry.binaries.delete(filename)
  }

  async searchDatabase(params) {
    const {keyword, groupUuid} = params || {}

    let groups = this.db.groups
    if (groupUuid) {
      const group = this.db.getGroup(groupUuid)
      groups = [group]
    }

    const entries = traverseGroupSearch(groups, (entry) => {
      const title = getMapValue(entry.fields, 'Title') || ''
      const notes = getFieldString(entry, 'Notes') || ''
      return title.indexOf(keyword) !== -1 || notes.indexOf(keyword) !== -1
    })

    const list = []
    entries.forEach((entry) => {
      this.curEntryMap[entry.uuid.id] = entry
      list.push(new EntryItem(entry))
    })

    return list
  }
}
