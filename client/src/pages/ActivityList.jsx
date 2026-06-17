import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { activityApi } from '../api.js'

const statusMap = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  published: { label: '报名中', color: 'bg-green-100 text-green-700' },
  ongoing: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '已结束', color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
}

const feeTypeMap = {
  company: '公司报销',
  personal: '个人自费',
  subsidy: '部分补贴',
}

export default function ActivityList({ currentUser }) {
  const [activities, setActivities] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const isHR = currentUser?.role === 'hr'

  const loadActivities = async () => {
    setLoading(true)
    try {
      const { data } = await activityApi.getAll()
      setActivities(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivities()
  }, [])

  const filtered = activities.filter((a) => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return ['draft', 'published'].includes(a.status)
    if (filter === 'ongoing') return a.status === 'ongoing'
    if (filter === 'completed') return a.status === 'completed'
    return a.status === filter
  })

  if (loading) {
    return <div className="text-center py-12 text-gray-500">加载中...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">团建活动</h1>
          <p className="text-gray-500 mt-1">共 {activities.length} 个活动</p>
        </div>
        {isHR && (
          <Link
            to="/create"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition"
          >
            + 创建新活动
          </Link>
        )}
      </div>

      <div className="flex space-x-2 mb-6">
        {[
          { key: 'all', label: '全部' },
          { key: 'upcoming', label: '即将开始' },
          { key: 'ongoing', label: '进行中' },
          { key: 'completed', label: '已结束' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === t.key
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-500">暂无活动</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((act) => (
            <Link
              key={act.id}
              to={`/activity/${act.id}`}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 border border-gray-100 block"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{act.title}</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusMap[act.status]?.color || 'bg-gray-100'}`}>
                  {statusMap[act.status]?.label || act.status}
                </span>
              </div>
              {act.description && (
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{act.description}</p>
              )}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="w-5 mr-2">📅</span>
                  <span>{dayjs(act.start_time).format('YYYY-MM-DD HH:mm')}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-5 mr-2">📍</span>
                  <span className="line-clamp-1">{act.location}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-5 mr-2">💰</span>
                  <span>{feeTypeMap[act.fee_type] || act.fee_type}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center">
                    <span className="w-5 mr-2">👥</span>
                    <span>
                      {act.registered_count || 0}
                      {act.max_participants ? ` / ${act.max_participants}` : ''} 人报名
                    </span>
                  </div>
                  {act.checked_in_count > 0 && (
                    <div className="flex items-center text-green-600">
                      <span className="w-5 mr-1">✓</span>
                      <span>{act.checked_in_count} 人签到</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
