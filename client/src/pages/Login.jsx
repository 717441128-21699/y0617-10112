import { useState } from 'react'
import { userApi } from '../api.js'

export default function Login({ onLogin }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [users] = useState([
    { name: '张管理', role: 'HR管理员' },
    { name: '李经理', role: 'HR管理员' },
    { name: '王开发', role: '普通员工' },
    { name: '赵设计', role: '普通员工' },
    { name: '陈测试', role: '普通员工' },
  ])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('请输入姓名')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await userApi.login(name.trim())
      onLogin(data)
    } catch (err) {
      setError('登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (userName) => {
    setName(userName)
    setLoading(true)
    try {
      const { data } = await userApi.login(userName)
      onLogin(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900">企业团建活动管理系统</h1>
          <p className="text-gray-500 mt-2">请登录后继续</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              姓名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入您的姓名"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white font-medium rounded-lg transition"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-8">
          <p className="text-sm text-gray-500 text-center mb-4">快速登录（测试账号）</p>
          <div className="grid grid-cols-2 gap-2">
            {users.map((u) => (
              <button
                key={u.name}
                onClick={() => quickLogin(u.name)}
                className="px-3 py-2 text-sm border border-gray-200 hover:border-primary-400 hover:bg-primary-50 rounded-lg transition flex items-center justify-between"
              >
                <span>{u.name}</span>
                <span className="text-xs text-gray-400">{u.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
