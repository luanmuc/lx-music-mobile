/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { log as writeLog } from '@/utils/log'

export default {
  r_info(...params: any[]) {
    writeLog.info(...params)
  },
  r_warn(...params: any[]) {
    writeLog.warn(...params)
  },
  r_error(...params: any[]) {
    writeLog.error(...params)
  },
  info(...params: any[]) {
    writeLog.info(...params)
  },
  warn(...params: any[]) {
    writeLog.warn(...params)
  },
  error(...params: any[]) {
    writeLog.error(...params)
  },
}
