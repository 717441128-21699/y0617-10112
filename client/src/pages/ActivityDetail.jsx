import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { activityApi, teamApi, expenseApi } from '../api.js'

const statusMap = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700' },
  published: { label: '报名中', color: 'bg-green-100 text-green-700' },
  ongoing: { label: '进行中', color: 'bg-blue-100 text-blue-700' },
  completed: { label: '已结束', color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
}

const feeTypeMap = {
  company: { label: '公司报销', icon: '🏢' },
  personal: { label: '个人自费', icon: '💳' },
  subsidy: { label: '部分补贴', icon: '💰' },
}

const groupingTypeMap = {
  none: '不分组',
  department: '按部门自动分组',
  free: '自由组队（先到先选）',
}

export default function ActivityDetail({ currentUser }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [registerStatus, setRegisterStatus] = useState(null)
  const [declineReason, setDeclineReason] = useState('')
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ item_name: '', amount: '', note: '' })
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const isHR = currentUser?.role === 'hr'

  const loadActivity = async () => {
    setLoading(true)
    try {
      const { data } = await activityApi.getById(id)
      setActivity(data)
      const myReg = data.registrations?.find((r) => r.user_id === currentUser.id)
      if (myReg) setRegisterStatus(myReg.status)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivity()
  }, [id])

  const handleRegister = async (status) => {
    if (status === 'declined') {
      setShowDeclineModal(true)
      return
    }
    try {
      await activityApi.register(id, { user_id: currentUser.id, status })
      setRegisterStatus(status)
      loadActivity()
    } catch (err) {
      alert(err.response?.data?.error || '操作失败')
    }
  }

  const confirmDecline = async () => {
    try {
      await activityApi.register(id, { user_id: currentUser.id, status: 'declined', decline_reason: declineReason })
      setRegisterStatus('declined')
      setShowDeclineModal(false)
      setDeclineReason('')
      loadActivity()
    } catch (err) {
      alert(err.response?.data?.error || '操作失败')
    }
  }

  const handleCheckin = async () => {
    try {
      await activityApi.checkin(id, { user_id: currentUser.id })
      loadActivity()
      alert('签到成功！')
    } catch (err) {
      alert(err.response?.data?.error || '签到失败')
    }
  }

  const handleJoinTeam = async (teamId) => {
    try {
      await teamApi.join(teamId, { user_id: currentUser.id })
      loadActivity()
    } catch (err) {
      alert(err.response?.data?.error || '加入失败')
    }
  }

  const handleAddExpense = async (e) => {
    e.preventDefault()
    if (!expenseForm.item_name || !expenseForm.amount) return
    try {
      await activityApi.addExpense(id, {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
      })
      setExpenseForm({ item_name: '', amount: '', note: '' })
      loadActivity()
    } catch (err) {
      alert('添加失败')
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('确定删除此项费用？')) return
    await expenseApi.delete(expenseId)
    loadActivity()
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    try {
      await activityApi.addReview(id, { user_id: currentUser.id, ...reviewForm })
      setReviewForm({ rating: 5, comment: '' })
      loadActivity()
      alert('评价提交成功！')
    } catch (err) {
      alert('提交失败')
    }
  }

  const handleDeleteActivity = async () => {
    if (!confirm('确定删除此活动？此操作不可恢复。')) return
    try {
      await activityApi.delete(id)
      navigate('/')
    } catch (err) {
      alert('删除失败')
    }
  }

  const hasCheckedIn = activity?.checkins?.some((c) => c.user_id === currentUser.id)
  const myReview = activity?.reviews?.find((r) => r.user_id === currentUser.id)
  const isDeadlinePassed = dayjs().isAfter(dayjs(activity?.deadline))

  if (loading) {
    return <div className="text-center py-12">加载中...</div>
  }

  if (!activity) {
    return <div className="text-center py-12 text-gray-500">活动不存在</div>
  }

  const confirmedRegistrations = activity.registrations.filter((r) => r.status === 'confirmed')
  const declinedRegistrations = activity.registrations.filter((r) => r.status === 'declined')

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 mb-4 flex items-center"
        >
          ← 返回列表
        </button>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{activity.title}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusMap[activity.status]?.color}`}>
                {statusMap[activity.status]?.label}
              </span>
            </div>
            {activity.description && (
              <p className="text-gray-600">{activity.description}</p>
            )}
          </div>
          {isHR && (
            <div className="flex gap-2">
              <Link
                to={`/edit/${activity.id}`}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                编辑
              </Link>
              <button
                onClick={handleDeleteActivity}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <span>📅</span> 活动时间
          </div>
          <p className="font-medium text-gray-900">
            {dayjs(activity.start_time).format('YYYY-MM-DD HH:mm')}
          </p>
          <p className="text-sm text-gray-500">
            至 {dayjs(activity.end_time).format('MM-DD HH:mm')}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <span>📍</span> 活动地点
          </div>
          <p className="font-medium text-gray-900">{activity.location}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <span>{feeTypeMap[activity.fee_type]?.icon}</span> 费用说明
          </div>
          <p className="font-medium text-gray-900">{feeTypeMap[activity.fee_type]?.label}</p>
          {activity.fee_description && (
            <p className="text-sm text-gray-500">{activity.fee_description}</p>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <span>⏰</span> 报名截止
          </div>
          <p className={`font-medium ${isDeadlinePassed ? 'text-red-500' : 'text-gray-900'}`}>
            {dayjs(activity.deadline).format('YYYY-MM-DD HH:mm')}
          </p>
          <p className="text-sm text-gray-500">
            {activity.registered_count}
            {activity.max_participants ? ` / ${activity.max_participants}` : ''} 人报名
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm mb-6 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            {registerStatus === 'confirmed' ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-medium text-green-700">您已确认参加本次活动</p>
                  <p className="text-sm text-gray-500">期待与您相见！</p>
                </div>
              </div>
            ) : registerStatus === 'declined' ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl">❌</span>
                <div>
                  <p className="font-medium text-gray-700">您已选择不参加</p>
                  <p className="text-sm text-gray-500">
                    原因：{activity.registrations.find((r) => r.user_id === currentUser.id)?.decline_reason || '未填写'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-medium text-gray-700">请选择是否参加本次活动</p>
                <p className="text-sm text-gray-500">请在截止时间前做出选择</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {registerStatus !== 'confirmed' && !isDeadlinePassed && (
              <button
                onClick={() => handleRegister('confirmed')}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
              >
                确认参加
              </button>
            )}
            {registerStatus !== 'declined' && !isDeadlinePassed && (
              <button
                onClick={() => handleRegister('declined')}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition"
              >
                无法参加
              </button>
            )}
            {activity.status === 'ongoing' && registerStatus === 'confirmed' && !hasCheckedIn && (
              <button
                onClick={handleCheckin}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                📱 签到
              </button>
            )}
            {hasCheckedIn && (
              <span className="px-6 py-2.5 bg-blue-100 text-blue-700 rounded-lg font-medium">
                ✓ 已签到
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex space-x-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {[
          { key: 'info', label: '详情信息' },
          { key: 'registrations', label: `报名情况 (${activity.registrations.length})` },
          { key: 'teams', label: '活动分组' },
          { key: 'checkin', label: `签到 (${activity.checkins.length})` },
          { key: 'expenses', label: `费用结算 (${activity.expenses.length})` },
          { key: 'reviews', label: `满意度评价 (${activity.reviews.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">分组方式</p>
                <p className="font-medium">{groupingTypeMap[activity.grouping_type]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">活动创建者</p>
                <p className="font-medium">{activity.creator_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">创建时间</p>
                <p className="font-medium">{dayjs(activity.created_at).format('YYYY-MM-DD HH:mm')}</p>
              </div>
              {activity.avgRating && (
                <div>
                  <p className="text-sm text-gray-500">平均满意度</p>
                  <p className="font-medium text-yellow-600">⭐ {activity.avgRating} / 5</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-green-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-green-600">{confirmedRegistrations.length}</p>
                <p className="text-sm text-green-700">确认参加</p>
              </div>
              <div className="flex-1 bg-red-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-red-600">{declinedRegistrations.length}</p>
                <p className="text-sm text-red-700">无法参加</p>
              </div>
            </div>
            <div className="space-y-3">
              {activity.registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{reg.avatar || '👤'}</span>
                    <div>
                      <p className="font-medium">{reg.user_name}</p>
                      <p className="text-sm text-gray-500">{reg.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      reg.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {reg.status === 'confirmed' ? '参加' : '不参加'}
                    </span>
                    {reg.decline_reason && (
                      <p className="text-xs text-gray-500 mt-1">{reg.decline_reason}</p>
                    )}
                  </div>
                </div>
              ))}
              {activity.registrations.length === 0 && (
                <p className="text-center text-gray-500 py-8">暂无报名记录</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div>
            {activity.grouping_type === 'none' ? (
              <p className="text-center text-gray-500 py-8">本活动未设置分组</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activity.teams.map((team) => {
                  const isMember = team.members.some((m) => m.user_id === currentUser.id)
                  const isFull = team.max_members && team.members.length >= team.max_members
                  return (
                    <div key={team.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-lg">{team.name}</h4>
                        <span className="text-sm text-gray-500">
                          {team.members.length}{team.max_members ? ` / ${team.max_members}` : ''} 人
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {team.members.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
                          >
                            <span>{m.avatar || '👤'}</span>
                            <span>{m.name}</span>
                          </div>
                        ))}
                        {team.members.length === 0 && (
                          <p className="text-gray-400 text-sm">暂无成员</p>
                        )}
                      </div>
                      {activity.grouping_type === 'free' && registerStatus === 'confirmed' && (
                        <button
                          onClick={() => handleJoinTeam(team.id)}
                          disabled={isFull && !isMember}
                          className={`w-full py-2 rounded-lg text-sm font-medium transition ${
                            isMember
                              ? 'bg-primary-100 text-primary-700'
                              : isFull
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-primary-600 hover:bg-primary-700 text-white'
                          }`}
                        >
                          {isMember ? '✓ 已加入' : isFull ? '队伍已满' : '加入队伍'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'checkin' && (
          <div>
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-blue-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-blue-600">{activity.checkins.length}</p>
                <p className="text-sm text-blue-700">已签到</p>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-gray-600">
                  {confirmedRegistrations.length - activity.checkins.length}
                </p>
                <p className="text-sm text-gray-700">未签到</p>
              </div>
            </div>
            <div className="space-y-2">
              {activity.checkins.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{c.avatar || '👤'}</span>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-gray-500">{c.department}</p>
                    </div>
                  </div>
                  <div className="text-sm text-green-600">
                    ✓ {dayjs(c.checked_in_at).format('HH:mm:ss')}
                  </div>
                </div>
              ))}
              {activity.checkins.length === 0 && (
                <p className="text-center text-gray-500 py-8">暂无签到记录</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div>
            {activity.expenses.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-yellow-700 mb-1">总费用</p>
                  <p className="text-3xl font-bold text-yellow-600">¥{activity.totalExpense.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700 mb-1">人均费用</p>
                  <p className="text-3xl font-bold text-green-600">¥{activity.perPersonExpense}</p>
                </div>
              </div>
            )}

            {isHR && (
              <form onSubmit={handleAddExpense} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">添加费用明细</h4>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <input
                      type="text"
                      placeholder="费用项目（如：餐饮费、场地费）"
                      value={expenseForm.item_name}
                      onChange={(e) => setExpenseForm({ ...expenseForm, item_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="金额 (¥)"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      placeholder="备注"
                      value={expenseForm.note}
                      onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                    >
                      添加
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">项目</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">备注</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-700">金额</th>
                    {isHR && <th className="px-4 py-3 w-16"></th>}
                  </tr>
                </thead>
                <tbody>
                  {activity.expenses.map((e) => (
                    <tr key={e.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">{e.item_name}</td>
                      <td className="px-4 py-3 text-gray-500">{e.note || '-'}</td>
                      <td className="px-4 py-3 text-right font-medium">¥{e.amount.toFixed(2)}</td>
                      {isHR && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            删除
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {activity.expenses.length === 0 && (
                    <tr>
                      <td colSpan={isHR ? 4 : 3} className="text-center text-gray-500 py-8">
                        暂无费用记录
                      </td>
                    </tr>
                  )}
                  {activity.expenses.length > 0 && (
                    <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                      <td className="px-4 py-3">合计</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right text-lg">¥{activity.totalExpense.toFixed(2)}</td>
                      {isHR && <td></td>}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {activity.avgRating && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg flex items-center gap-4">
                <div className="text-4xl">⭐</div>
                <div>
                  <p className="text-3xl font-bold text-yellow-600">{activity.avgRating}</p>
                  <p className="text-sm text-yellow-700">
                    平均满意度 · 共 {activity.reviews.length} 条评价
                  </p>
                </div>
              </div>
            )}

            {activity.status === 'completed' && registerStatus === 'confirmed' && !myReview && (
              <form onSubmit={handleSubmitReview} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">提交您的满意度评价</h4>
                <div className="mb-3">
                  <label className="block text-sm text-gray-600 mb-2">评分</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="text-3xl transition"
                      >
                        {star <= reviewForm.rating ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <textarea
                    placeholder="请留下您的建议和反馈..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  提交评价
                </button>
              </form>
            )}

            {myReview && (
              <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
                <p className="text-sm text-primary-700 mb-1">您的评价</p>
                <div className="flex items-center gap-2 mb-1">
                  {Array.from({ length: myReview.rating }).map((_, i) => (
                    <span key={i}>⭐</span>
                  ))}
                </div>
                {myReview.comment && <p className="text-gray-700">{myReview.comment}</p>}
              </div>
            )}

            <div className="space-y-4">
              {activity.reviews.map((r) => (
                <div key={r.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{r.avatar || '👤'}</span>
                      <span className="font-medium">{r.name}</span>
                    </div>
                    <div className="flex">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <span key={i}>⭐</span>
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="text-gray-600">{r.comment}</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    {dayjs(r.created_at).format('YYYY-MM-DD HH:mm')}
                  </p>
                </div>
              ))}
              {activity.reviews.length === 0 && (
                <p className="text-center text-gray-500 py-8">暂无评价</p>
              )}
            </div>
          </div>
        )}
      </div>

      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">请填写不参与原因</h3>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
              placeholder="请简要说明无法参加的原因..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={confirmDecline}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
