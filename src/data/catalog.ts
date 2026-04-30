import type { MacroTask, SubjectDefinition, SubjectId } from '../types'

export const EXAM_DEADLINE = '2026-12-19'

export const SUBJECTS: SubjectDefinition[] = [
  {
    id: 'math',
    name: '数学一',
    shortName: 'Math',
    modules: [
      { id: 'gaoshu', subjectId: 'math', name: '高数' },
      { id: 'xiandai', subjectId: 'math', name: '线代' },
      { id: 'gailv', subjectId: 'math', name: '概率论' },
      { id: 'math-mock', subjectId: 'math', name: '套卷' },
    ],
  },
  {
    id: 'english',
    name: '英语一',
    shortName: 'EN',
    modules: [
      { id: 'reading', subjectId: 'english', name: '阅读' },
      { id: 'writing', subjectId: 'english', name: '写作' },
      { id: 'translation', subjectId: 'english', name: '翻译完形' },
      { id: 'vocabulary', subjectId: 'english', name: '词汇' },
    ],
  },
  {
    id: 'politics',
    name: '政治',
    shortName: 'POL',
    modules: [
      { id: 'marxism', subjectId: 'politics', name: '马原' },
      { id: 'history', subjectId: 'politics', name: '史纲' },
      { id: 'current', subjectId: 'politics', name: '时政' },
      { id: 'sprint', subjectId: 'politics', name: '冲刺背诵' },
    ],
  },
  {
    id: 'cs408',
    name: '408',
    shortName: '408',
    modules: [
      { id: 'data-structure', subjectId: 'cs408', name: '数据结构' },
      { id: 'computer-organization', subjectId: 'cs408', name: '计组' },
      { id: 'os', subjectId: 'cs408', name: '操作系统' },
      { id: 'network', subjectId: 'cs408', name: '计网' },
      { id: 'synthesis', subjectId: 'cs408', name: '综合套卷' },
    ],
  },
]

export const subjectById = SUBJECTS.reduce(
  (lookup, subject) => ({ ...lookup, [subject.id]: subject }),
  {} as Record<SubjectId, SubjectDefinition>,
)

export const moduleById = SUBJECTS.flatMap((subject) => subject.modules).reduce(
  (lookup, module) => ({ ...lookup, [module.id]: module }),
  {} as Record<string, SubjectDefinition['modules'][number]>,
)

export const getModulesForSubject = (subjectId: SubjectId) =>
  subjectById[subjectId].modules

export const splitMacroTaskText = (rawTitle: string) => {
  const normalizedTitle = rawTitle.trim().replace(/^\[[^\]]+\]\s*/, '')
  const detailMatch = normalizedTitle.match(/^(.*?)\s*[（(]([^()（）]+)[）)]\s*$/)

  if (!detailMatch) {
    return { title: normalizedTitle, detail: '' }
  }

  return {
    title: detailMatch[1].trim(),
    detail: detailMatch[2].trim(),
  }
}

type ImportedMacroTask = {
  id: string
  subject: 'Math'
  title: string
  estimatedDays: number
  order: number
}

export const importedMathMacroTasks: ImportedMacroTask[] = [
  {
    id: 'math-hs-01',
    subject: 'Math',
    title: '[高数] 极限计算综合 (等价替换/泰勒精度/七种未定式盲区扫描与错题归因)',
    estimatedDays: 4,
    order: 1,
  },
  {
    id: 'math-hs-02',
    subject: 'Math',
    title: '[高数] 数列极限专题 (夹逼构造/单调有界/定积分定义求极限套路归纳)',
    estimatedDays: 3,
    order: 2,
  },
  {
    id: 'math-hs-03',
    subject: 'Math',
    title:
      '[高数] 一元微分学概念与计算 (导数定义场景化试错/分段与绝对值可导性/高阶导数套路归纳)',
    estimatedDays: 4,
    order: 3,
  },
  {
    id: 'math-hs-04',
    subject: 'Math',
    title: '[高数] 微分学应用与函数形态 (极值拐点判别流程/渐近线/曲率公式/图像试错重构)',
    estimatedDays: 3,
    order: 4,
  },
  {
    id: 'math-hs-05',
    subject: 'Math',
    title: '[高数] 微分中值定理与证明题 (十大定理辅助函数构造/微分等式不等式套路归纳)',
    estimatedDays: 4,
    order: 5,
  },
  {
    id: 'math-hs-06',
    subject: 'Math',
    title:
      '[高数] 积分概念与反常积分 (原函数存在定理辨析/变限积分性质/反常积分敛散性判别试错)',
    estimatedDays: 3,
    order: 6,
  },
  {
    id: 'math-hs-07',
    subject: 'Math',
    title: '[高数] 积分计算综合 (凑微分换元分部积分/定积分奇偶周期华里士/变限积分硬算重构)',
    estimatedDays: 5,
    order: 7,
  },
  {
    id: 'math-hs-08',
    subject: 'Math',
    title: '[高数] 积分几何与物理应用 (面积体积弧长侧面积/物理做功压力微元法场景试错)',
    estimatedDays: 3,
    order: 8,
  },
  {
    id: 'math-hs-09',
    subject: 'Math',
    title:
      '[高数] 积分等式与不等式证明 (积分中值定理推广/常数变量化/拉格朗日泰勒放缩套路归纳)',
    estimatedDays: 3,
    order: 9,
  },
  {
    id: 'math-hs-10',
    subject: 'Math',
    title:
      '[高数] 微分方程 (一阶二阶分类识别/常系数非齐次待定系数与算子法/欧拉方程套路归纳)',
    estimatedDays: 3,
    order: 10,
  },
  {
    id: 'math-hs-11',
    subject: 'Math',
    title:
      '[高数] 无穷级数 (常数项判敛流程/幂级数收敛域与和函数/傅里叶级数系数与收敛定理试错)',
    estimatedDays: 4,
    order: 11,
  },
  {
    id: 'math-hs-12',
    subject: 'Math',
    title:
      '[高数] 多元函数微分学 (偏导全微分计算/链式求导与隐函数/极值最值与拉格朗日乘数法综合试错)',
    estimatedDays: 4,
    order: 12,
  },
  {
    id: 'math-hs-13',
    subject: 'Math',
    title: '[高数] 二重积分 (对称性识别/直角极坐标选择/换元法与积分次序交换试错重构)',
    estimatedDays: 3,
    order: 13,
  },
  {
    id: 'math-hs-14',
    subject: 'Math',
    title: '[高数] 空间解析几何 (向量运算/平面直线曲面/切平面法线/梯度方向导数公式硬算)',
    estimatedDays: 2,
    order: 14,
  },
  {
    id: 'math-hs-15',
    subject: 'Math',
    title:
      '[高数] 多元积分学 (三重积分对称性/第一型曲线曲面积分/格林高斯斯托克斯三大公式综合试错)',
    estimatedDays: 5,
    order: 15,
  },
  {
    id: 'math-la-01',
    subject: 'Math',
    title: '[线代] 行列式与矩阵运算 (行列式计算技巧/逆矩阵与伴随矩阵/初等变换与秩的关系综合试错)',
    estimatedDays: 4,
    order: 16,
  },
  {
    id: 'math-la-02',
    subject: 'Math',
    title: '[线代] 向量组与线性方程组 (线性相关性判定/极大无关组/方程组公共解同解套路归纳)',
    estimatedDays: 4,
    order: 17,
  },
  {
    id: 'math-la-03',
    subject: 'Math',
    title:
      '[线代] 特征值相似与二次型 (相似对角化流程/实对称矩阵正交化/二次型标准化与正定判别试错)',
    estimatedDays: 5,
    order: 18,
  },
  {
    id: 'math-pb-01',
    subject: 'Math',
    title: '[概率] 概率论基础与一维随机变量 (事件运算/古典几何概型/一维分布函数与随机变量函数试错)',
    estimatedDays: 3,
    order: 19,
  },
  {
    id: 'math-pb-02',
    subject: 'Math',
    title:
      '[概率] 多维随机变量与数字特征 (联合边缘条件分布/二维随机变量函数/协方差相关系数综合试错)',
    estimatedDays: 4,
    order: 20,
  },
  {
    id: 'math-pb-03',
    subject: 'Math',
    title: '[概率] 大数定律与数理统计 (三大分布识别/矩估计与最大似然估计/统计量分布套路归纳)',
    estimatedDays: 3,
    order: 21,
  },
]

const getSubjectIdFromImport = (subject: ImportedMacroTask['subject']): SubjectId => {
  if (subject === 'Math') return 'math'
  return 'math'
}

const getMathModuleIdFromTitle = (title: string) => {
  if (title.startsWith('[线代]')) return 'xiandai'
  if (title.startsWith('[概率]')) return 'gailv'
  return 'gaoshu'
}

export const createDefaultMacroTasks = (): MacroTask[] =>
  [...importedMathMacroTasks]
    .sort((left, right) => left.order - right.order)
    .map((task) => {
      const { title, detail } = splitMacroTaskText(task.title)

      return {
        id: task.id,
        subjectId: getSubjectIdFromImport(task.subject),
        moduleId: getMathModuleIdFromTitle(task.title),
        title,
        detail,
        estimatedDays: task.estimatedDays,
        order: task.order,
        completed: false,
        dependencies: [],
        createdAt: new Date().toISOString(),
      }
    })
