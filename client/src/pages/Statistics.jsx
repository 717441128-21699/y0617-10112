import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { statsApi } from '../api.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function Statistics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    setLoading(true)
    try {
      const { data } = await statsApi.getSummary()
      setStats(data)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">加载中...</div>
  }

  const participationData = {
    labels: stats.activities.map((a) => dayjs(a.start_time).format('MM-DD')),
    datasets: [
      {
        label: '报名人数',
        data: stats.activities.map((a) => a.registered),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: '签到人数',
        data: stats.activities.map((a) => a.checked_in),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  }

  const ratingData = {
    labels: stats.activities.filter((a) => a.review_count > 0).map((a) =>
      dayjs(a.start_time).format('MM-DD')
    ),
    datasets: [
      {
        label: '平均满意度',
        data: stats.activities.filter((a) => a.review_count > 0).map((a) => a.avg_rating),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  }

  const departmentData = {
    labels: stats.departmentStats.map((d) => d.department || '未设置'),
    datasets: [
      {
        label: '参与人次',
        data: stats.departmentStats.map((d) => d.participants),
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#ec4899',
          '#06b6d4',
        ],
      },
    ],
  }

  const attendanceRates = stats.activities
    .filter((a) => a.registered > 0)
    .map((a) => ({
      name: a.title,
      rate: ((a.checked_in / a.registered) * 100).toFixed(1),
    }))

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  const lineOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
      },
    },
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">数据统计</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">总活动数</p>
          <p className="text-3xl font-bold text-primary-600">{stats.totalActivities}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">总报名人次</p>
          <p className="text-3xl font-bold text-green-600">{stats.totalRegistrations}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">总签到人次</p>
          <p className="text-3xl font-bold text-blue-600">{stats.totalCheckins}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">总费用支出</p>
          <p className="text-3xl font-bold text-yellow-600">¥{stats.totalExpense.toFixed(0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">参与与签到趋势</h3>
          <div className="h-64">
            {stats.activities.length > 0 ? (
              <Line data={participationData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">暂无数据</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">满意度变化趋势</h3>
          <div className="h-64">
            {stats.activities.filter((a) => a.review_count > 0).length > 0 ? (
              <Line data={ratingData} options={lineOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">暂无评价数据</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">各部门参与情况</h3>
          <div className="h-64">
            {stats.departmentStats.length > 0 ? (
              <Bar data={departmentData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">暂无数据</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">各活动出勤率</h3>
          <div className="space-y-3">
            {attendanceRates.length > 0 ? (
              attendanceRates.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate mr-2">{item.name}</span>
                    <span className="font-medium text-gray-900">{item.rate}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(item.rate, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">暂无数据</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm mt-6">
        <h3 className="font-semibold text-gray-900 mb-4">历史活动归档</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">活动名称</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">时间</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">报名</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">签到</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">出勤率</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">满意度</th>
              </tr>
            </thead>
            <tbody>
              {stats.activities.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{a.title}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {dayjs(a.start_time).format('YYYY-MM-DD')}
                  </td>
                  <td className="py-3 px-4 text-center">{a.registered}</td>
                  <td className="py-3 px-4 text-center">{a.checked_in}</td>
                  <td className="py-3 px-4 text-center">
                    {a.registered > 0
                      ? <span className="text-green-600">{((a.checked_in / a.registered) * 100).toFixed(1)}%</span>
                      : '-'
                    }
                  </td>
                  <td className="py-3 px-4 text-center">
                    {a.review_count > 0
                      ? <span className="text-yellow-600">⭐ {a.avg_rating.toFixed(1)}</span>
                      : '-'
                    }
                  </td>
                </tr>
              ))}
              {stats.activities.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    暂无活动记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
