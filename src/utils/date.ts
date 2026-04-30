const DAY_MS = 24 * 60 * 60 * 1000

export const toLocalDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const formatISODate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getTodayISO = () => formatISODate(new Date())

export const addDaysISO = (isoDate: string, days: number) => {
  const date = toLocalDate(isoDate)
  date.setDate(date.getDate() + days)
  return formatISODate(date)
}

export const diffDaysISO = (from: string, to: string) =>
  Math.round((toLocalDate(to).getTime() - toLocalDate(from).getTime()) / DAY_MS)

export const compareISO = (left: string, right: string) =>
  toLocalDate(left).getTime() - toLocalDate(right).getTime()

export const isAfterISO = (left: string, right: string) => compareISO(left, right) > 0

export const isBeforeISO = (left: string, right: string) =>
  compareISO(left, right) < 0

export const maxISO = (...dates: string[]) =>
  dates.reduce((max, date) => (isAfterISO(date, max) ? date : max))

export const startOfYearISO = (isoDate: string) => `${isoDate.slice(0, 4)}-01-01`

export const enumerateDates = (startDate: string, endDate: string) => {
  const dates: string[] = []
  let cursor = startDate

  while (compareISO(cursor, endDate) <= 0) {
    dates.push(cursor)
    cursor = addDaysISO(cursor, 1)
  }

  return dates
}

export const formatZhDate = (isoDate: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(toLocalDate(isoDate))
