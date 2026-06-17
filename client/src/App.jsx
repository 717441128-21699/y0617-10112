import { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import ActivityList from './pages/ActivityList.jsx'
import ActivityDetail from './pages/ActivityDetail.jsx'
import CreateActivity from './pages/CreateActivity.jsx'
import Statistics from './pages/Statistics.jsx'
import Review from './pages/Review.jsx'
import Login from './pages/Login.jsx'

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const saved = localStorage.getItem('currentUser')
    if (saved) {
      setCurrentUser(JSON.parse(saved))
    } else if (location.pathname !== '/login') {
      navigate('/login')
    }
  }, [])

  const handleLogin = (user) => {
    setCurrentUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
    navigate('/')
  }

  const handleLogout = () => {
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
    navigate('/login')
  }

  if (!currentUser && location.pathname !== '/login') {
    return <Login onLogin={handleLogin} />
  }

  const isHR = currentUser?.role === 'hr'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <span className="text-2xl">🎉</span>
                <span className="text-xl font-bold text-primary-600">团建活动管理系统</span>
              </Link>
              <div className="hidden md:flex space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  活动列表
                </Link>
                {isHR && (
                  <Link
                    to="/create"
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === '/create'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    创建活动
                  </Link>
                )}
                <Link
                  to="/statistics"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/statistics'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  数据统计
                </Link>
                <Link
                  to="/review"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/review'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  活动复盘
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">{currentUser?.avatar || '👤'}</span>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{currentUser?.name}</p>
                  <p className="text-xs text-gray-500">
                    {currentUser?.department} · {isHR ? '管理员' : '员工'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/" element={<ActivityList currentUser={currentUser} />} />
          <Route path="/activity/:id" element={<ActivityDetail currentUser={currentUser} />} />
          <Route path="/create" element={<CreateActivity currentUser={currentUser} />} />
          <Route path="/edit/:id" element={<CreateActivity currentUser={currentUser} isEdit />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/review" element={<Review />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
