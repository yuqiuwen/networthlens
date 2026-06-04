
import dayjs from 'dayjs';
import { differenceInDays, format, addDays, addMonths, addYears, addWeeks } from 'date-fns';
import { zhCN } from 'date-fns/locale';


export function formatTimestamp(ts?: number, format: string = 'YYYY-MM-DD HH:mm:ss') {
    if (!ts) {
        return '-';
    }
    return dayjs.unix(ts).format(format);
}


export function formatDate(date: string | Date, formatStr = 'yyyy年MM月dd日'): string {
    return format(new Date(date), formatStr, { locale: zhCN });
  }
  
  export function getDaysUntil(targetDate: string | Date): number {
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return differenceInDays(target, today);
  }
  
  export function getDaysSince(startDate: string | Date): number {
    const start = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    return differenceInDays(today, start);
  }
  
