import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { activityApi } from '../api.js'

const feeTypes = [
  { value: 'company', label: '公司报销' },
  { value: 'personal', label: '个人自费' },
  { value: 'subsidy', label: '部分补贴' },
]

const groupingTypes = [
  { value: 'none', label: '不分组' },
  { value: 'department', label: '按部门自动分组' },
  { value: 'free', label: '自由组队（先到先选）' },
]

const statuses = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '发布（接受报名）' },
  { value: 'ongoing', label: '进行中' },
  { value: 'completed', label: '已结束' },
  { value: 'cancelled', label: '已取消' },
]

export default function CreateActivity({ currentUser, isEdit }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    start_time: dayjs().add(7, 'day').format('YYYY-MM-DDTHH:mm'),
    end_time: dayjs().add(7, 'day').hour(18).format('YYYY-MM-DDTHH:mm'),
    deadline: dayjs().add(5, 'day').format('YYYY-MM-DDTHH:mm'),
    max_participants: '',
    fee_type: 'company',
    fee_description: '',
    grouping_type: 'none',
    status: 'published',
  })

  useEffect(() => {
    if (isEdit && id) {
      loadActivity()
    }
  }, [isEdit, id])

  const loadActivity = async () => {
    setLoading(true)
    try {
      const { data } = await activityApi.getById(id)
      setFormData({
        title: data.title,
        description: data.description || '',
        location: data.location,
        start_time: dayjs(data.start_time).format('YYYY-MM-DDTHH:mm'),
        end_time: dayjs(data.end_time).format('YYYY-MM-DDTHH:mm'),
        deadline: dayjs(data.deadline).format('YYYY-MM-DDTHH:mm'),
        max_participants: data.max_participants || '',
        fee_type: data.fee_type,
        fee_description: data.fee_description || '',
        grouping_type: data.grouping_type,
        status: data.status,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.location.trim()) {
      alert('请填写活动主题和地点')
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...formData,
        max_participants: formData.max_participants ? Number(formData.max_participants) : null,
        created_by: currentUser.id,
      }
      if (isEdit) {
        await activityApi.update(id, payload)
      } else {
        await activityApi.create(payload)
      }
      navigate('/')
    } catch (err) {
      alert('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (loading && isEdit) {
    return <div className="text-center py-12">加载中...</div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? '编辑活动' : '创建团建活动'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            活动主题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="如：2024年秋季户外团建"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            活动描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            placeholder="请简要描述活动内容和安排"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            活动地点 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="如：XX度假酒店 / 城市公园"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => handleChange('start_time', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
            <input
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => handleChange('end_time', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">报名截止</label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => handleChange('deadline', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            参与名额（留空表示不限制）
          </label>
          <input
            type="number"
            value={formData.max_participants}
            onChange={(e) => handleChange('max_participants', e.target.value)}
            placeholder="如：50"
            min="1"
            className="w-full md:w-1/3 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">费用说明</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {feeTypes.map((t) => (
              <label
                key={t.value}
                className={`flex items-center px-4 py-3 border rounded-lg cursor-pointer transition ${
                  formData.fee_type === t.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="fee_type"
                  value={t.value}
                  checked={formData.fee_type === t.value}
                  onChange={(e) => handleChange('fee_type', e.target.value)}
                  className="mr-2"
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
          <input
            type="text"
            value={formData.fee_description}
            onChange={(e) => handleChange('fee_description', e.target.value)}
            placeholder="补充说明（如：公司补贴80%，个人承担20%）"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">活动分组</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {groupingTypes.map((t) => (
              <label
                key={t.value}
                className={`flex items-center px-4 py-3 border rounded-lg cursor-pointer transition ${
                  formData.grouping_type === t.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="grouping_type"
                  value={t.value}
                  checked={formData.grouping_type === t.value}
                  onChange={(e) => handleChange('grouping_type', e.target.value)}
                  className="mr-2"
                />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">活动状态</label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full md:w-1/3 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white rounded-lg font-medium transition"
          >
            {loading ? '保存中...' : isEdit ? '保存修改' : '创建活动'}
          </button>
        </div>
      </form>
    </div>
  )
}
