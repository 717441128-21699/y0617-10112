import { useState, useEffect } from 'react'
import { statsApi } from '../api.js'
import dayjs from 'dayjs'

export default function Review() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const loadData = async () => {
    setLoading(true)
    try {
      const params = {}
      if (monthFilter) params.month = monthFilter
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter
      const { data } = await statsApi.getReview(params)
      setActivities(data.activities || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [monthFilter, statusFilter])

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = dayjs().month(i).format('YYYY-MM')
    return m
  })

  const statusMap = {
    pending: { label: '即将开始', color: 'blue' },
    ongoing: { label: '进行中', color: 'green' },
    completed: { label: '已结束', color: 'gray' },
  }

  const getStatusStyle = (status) => {
    const s = statusMap[status] || statusMap.completed
    return `bg-${s.color}-100 text-${s.color}-700`
  }

  if (loading) {
    return <div className="text-center py-12">加载中...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">活动复盘</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">月份：</label>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">全部月份</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">状态：</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">全部状态</option>
            <option value="pending">即将开始</option>
            <option value="ongoing">进行中</option>
            <option value="completed">已结束</option>
          </select>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">暂无符合条件的活动</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-lg truncate pr-2">{a.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium bg-white/20`}>
                    {statusMap[a.status]?.label || a.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-white/90">
                  <span>📍</span>
                  <span className="truncate">{a.location}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-white/90">
                  <span>📅</span>
                  <span>{dayjs(a.start_time).format('YYYY-MM-DD HH:mm')}</span>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{a.sign_up_rate || 0}%</p>
                    <p className="text-xs text-green-700">报名率</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{a.attendance_rate || '-'}%</p>
                    <p className="text-xs text-blue-700">出勤率</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">
                      {a.avg_rating ? `⭐ ${a.avg_rating}` : '-'}
                    </p>
                    <p className="text-xs text-yellow-700">满意度</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      ¥{a.per_person_expense || 0}
                    </p>
                    <p className="text-xs text-purple-700">人均费用</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 border-t pt-3">
                  <div className="flex justify-between">
                    <span>已报名</span>
                    <span className="font-medium">{a.confirmed_count} 人</span>
                  </div>
                  <div className="flex justify-between">
                    <span>候补</span>
                    <span className="font-medium">{a.waitlist_count} 人</span>
                  </div>
                  <div className="flex justify-between">
                    <span>已签到</span>
                    <span className="font-medium">{a.checked_in_count} 人</span>
                  </div>
                  {a.participation_rate && (
                    <div className="flex justify-between">
                      <span>参与率</span>
                      <span className="font-medium">{a.participation_rate}%</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>总费用</span>
                    <span className="font-medium">¥{a.total_expense?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
