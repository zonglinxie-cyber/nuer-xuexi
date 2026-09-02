import { useState } from 'react'
import { Link } from 'react-router-dom'
import MathView from './MathView'

type SubjectTab = 'math' | 'chinese' | 'english'

interface KnowledgeCard {
  id: string
  title: string
  unit: string
  keyPoints: string[]
  formulas?: string[]
  pitfalls: string[]
  wrongBookQuery?: string
}

const MATH_HANDBOOK: KnowledgeCard[] = [
  {
    id: 'math-u1',
    title: '第一单元：大数的认识与面积单位',
    unit: '数与代数 / 空间与几何',
    keyPoints: [
      '数位顺序表：从右往左每 4 位为一级（个级、万级、亿级）。',
      '读数法则：从高位读起，每级末尾的 0 都不读，中间连续几个 0 只读一个零。',
      '改写与求近似数：整万数去掉 4 个 0 换成“万”，整亿数去掉 8 个 0 换成“亿”；四舍五入看省略尾数最高位。',
      '常用单位换算：$1\\text{公顷} = 10000\\text{平方米}$，$1\\text{平方千米} = 100\\text{公顷} = 1000000\\text{平方米}$。',
    ],
    formulas: [
      '1\\text{公顷} = 10000\\text{m}^2 \\quad (100\\text{m} \\times 100\\text{m})',
      '1\\text{km}^2 = 100\\text{公顷} = 10^6\\text{m}^2',
    ],
    pitfalls: [
      '读数时漏读中间的零，或多读了级末尾的零。',
      '改写后忘记写“万”或“亿”字（如把 50000 改写为 5 属于严重扣分）。',
      '公顷换算平方米时多写或漏写 0（进率是 10000）。',
    ],
    wrongBookQuery: '大数的认识',
  },
  {
    id: 'math-u2',
    title: '第二单元：角的度量',
    unit: '图形与几何',
    keyPoints: [
      '线段有两个端点可度量；射线有1个端点不可度量；直线无端点不可度量。',
      '角的大小与两条边张开的大小有关，与边的长短无关。',
      '角的大小关系：锐角 ($<90^\\circ$) < 直角 ($=90^\\circ$) < 钝角 ($90^\\circ<\\theta<180^\\circ$) < 平角 ($=180^\\circ$) < 周角 ($=360^\\circ$)。',
    ],
    formulas: [
      '1\\text{周角} = 2\\text{平角} = 4\\text{直角} = 360^\\circ',
    ],
    pitfalls: [
      '量角器读数时看错内圈与外圈刻度（找准 0 刻度线所在的圈）。',
      '误认为平角就是一条直线、周角就是一条射线（角由顶点和两条边组成）。',
    ],
    wrongBookQuery: '角的度量',
  },
  {
    id: 'math-u3',
    title: '第三单元：三位数乘两位数',
    unit: '数与代数',
    keyPoints: [
      '笔算乘法：先用两位数个位去乘三位数，再用十位去乘（积的末尾与十位对齐），最后将两次结果相加。',
      '因数末尾有 0 的简便计算：先把 0 前面的数相乘，再看因数末尾一共有几个 0，就在积的末尾添上几个 0。',
      '常用数量关系：速度 × 时间 = 路程；单价 × 数量 = 总价；工作效率 × 时间 = 工作总量。',
    ],
    formulas: [
      '\\text{速度} \\times \\text{时间} = \\text{路程}',
      '\\text{积的变化规律：} a \\times b = c \\implies (a \\times k) \\times b = c \\times k',
    ],
    pitfalls: [
      '用十位上的数字乘三位数时，积的末位没有和十位对齐。',
      '因数中间有 0 时忘记乘 0 加上进位数。',
    ],
    wrongBookQuery: '三位数乘两位数',
  },
  {
    id: 'math-u4',
    title: '第四单元：平行四边形和梯形',
    unit: '图形与几何',
    keyPoints: [
      '在同一平面内不相交的两条直线叫做平行线；相交成直角的两条直线互相垂直。',
      '平行四边形：两组对边分别平行且相等，容易变形（不稳定性），有无数条高。',
      '梯形：只有一组对边平行的四边形；两腰相等的叫等腰梯形；有一个角是直角的叫直角梯形。',
    ],
    pitfalls: [
      '画高时忘记在垂足处标出垂直符号（直角直角标）。',
      '平行线定义遗漏“在同一平面内”这个前提条件。',
    ],
    wrongBookQuery: '平行四边形和梯形',
  },
  {
    id: 'math-u5',
    title: '第五单元：除数是两位数的除法',
    unit: '数与代数',
    keyPoints: [
      '试商方法：“四舍”法把除数看作整十数，初商容易偏大需调小；“五入”法初商容易偏小需调大。',
      '商不变性质：被除数和除数同时乘或除以相同的数（0除外），商不变，但余数也会跟着乘或除以相同的数！',
      '判断商的位数：被除数前两位 $\\ge$ 除数，商是两位数；被除数前两位 $<$ 除数，商是一位数。',
    ],
    formulas: [
      '\\text{被除数} = \\text{除数} \\times \\text{商} + \\text{余数} \\quad (\\text{余数} < \\text{除数})',
    ],
    pitfalls: [
      '带余数简便除法计算时（如 $800 \\div 30 = 26\\cdots20$），余数误写成 2（实际被除数和除数缩小了 10 倍，余数要还原）。',
      '不够除时忘记在商的相应数位上商 0 占位。',
    ],
    wrongBookQuery: '除数是两位数的除法',
  },
  {
    id: 'math-u6',
    title: '第六单元与数学广角：统计与优化思想',
    unit: '统计与概率 / 综合实践',
    keyPoints: [
      '条形统计图：能直观清楚地表示出数量的多少；根据数据大小合理确定 1 格代表几（1、2、5 或 10）。',
      '烙饼优化：烙 3 张饼（每次最多烙2张，每面3分钟），最佳策略是交替轮换烙，用时 $3 \\times 3 = 9$ 分钟。',
      '沏茶优化：洗茶壶(1分) → 烧水(8分，期间洗茶杯、拿茶叶) → 沏茶(1分)，统筹安排能同时做的事。',
      '田忌赛马对策：下等马对上等马、上等马对中等马、中等马对下等马，以 2:1 取胜。',
    ],
    pitfalls: [
      '做统筹沏茶题时，把不能同时进行的事情强行合并（如烧水前不能先沏茶）。',
      '条形统计图制图时没标清横纵坐标和单位。',
    ],
    wrongBookQuery: '数学广角',
  },
]

const CHINESE_HANDBOOK: KnowledgeCard[] = [
  {
    id: 'zh-u1',
    title: '字词积累与易错多音字',
    unit: '识字与写字 / 词语积累',
    keyPoints: [
      '常考多音字：降（jiàng 降落 / xiáng 投降）、曲（qū 弯曲 / qǔ 歌曲）、宁（níng 安宁 / nìng 宁可）、扒（bā 扒开 / pá 扒手）。',
      '四字成语搭配：横七竖八、腾云驾雾、随遇而安、精疲力竭、无可奈何、铁面无私、秉公执法。',
      '近反义词辨析：茂密—稀疏、柔弱—刚强、慎重—谨慎、违抗—服从。',
    ],
    pitfalls: [
      '形近字混淆（如：“暮”与“幕”、“拔”与“拨”、“辨”与“辩”）。',
      '“的、地、得”用法混淆：美丽的(名)花朵、飞快地(动)奔跑、跑得(形)飞快。',
    ],
    wrongBookQuery: '拼音与字音',
  },
  {
    id: 'zh-u2',
    title: '句式变换与修辞手法',
    unit: '句子运用',
    keyPoints: [
      '修辞手法：比喻（打比方）、拟人（把物当人写）、排比（结构相同的三个及以上分句）、反问（无疑而问，加强语气）。',
      '直述句改转述句要点：① 去冒号引号，换成逗号；② 换人称（第一人称“我”改第三人称“他/她”）；③ 检查语句通顺。',
      '修改病句四步法：读句子找毛病 → 对症下药（增/删/调/换） → 复读检查。',
    ],
    pitfalls: [
      '转述句转换时忘记修改人称代词，或遗留引号。',
      '比喻句误把“好像/仿佛”当唯一标志（如“他长得像他爸爸”不是比喻句）。',
    ],
    wrongBookQuery: '句子运用',
  },
  {
    id: 'zh-u3',
    title: '古诗必背与阅读理解要点',
    unit: '阅读与鉴赏',
    keyPoints: [
      '必背名篇：《暮江吟》（白居易）、《题西林壁》（苏轼）、《雪梅》（卢钺）、《出塞》（王昌龄）、《凉州词》（王翰）。',
      '哲理名句：“不识庐山真面目，只缘身在此山中”（当局者迷，多角度看问题）；“梅须逊雪三分白，雪却输梅一段香”（各有所长）。',
      '现代文概括方法：写事文章抓“六要素”（时间、地点、人物、起因、经过、结果）；写景文章抓游览顺序与景物特点。',
    ],
    pitfalls: [
      '古诗默写错别字（如“缘”字右半部分误写、“题”字书写错误）。',
      '阅读理解答题不完整，脱离原文主观臆断。',
    ],
    wrongBookQuery: '古诗诵读与默写',
  },
]

const ENGLISH_HANDBOOK: KnowledgeCard[] = [
  {
    id: 'en-u1',
    title: 'Unit 1-3: 学校设施、文具与外貌描述',
    unit: 'My Classroom / My Schoolbag / My Friends',
    keyPoints: [
      '核心词汇：classroom, blackboard, light, desk, chair, schoolbag, maths book, storybook, candy, key, friendly, glasses, shoes.',
      '位置介词：in (在里面), on (在上面), under (在下面), near (在旁边).',
      '人物特征句型：He/She is tall and strong. He has short hair and big eyes. His/Her shoes are blue.',
    ],
    pitfalls: [
      '单复数混淆：glasses, shoes, chopsticks 常用复数，be动词用 are。',
      '物主代词误用：男他用 his，女她用 her，容易张冠李戴。',
    ],
    wrongBookQuery: '单词拼写',
  },
  {
    id: 'en-u2',
    title: 'Unit 4-6: 家居生活、餐饮与职业',
    unit: 'My Home / Dinner / Meet My Family',
    keyPoints: [
      '家居与饮食：living room, bedroom, kitchen, bathroom, beef, chicken, noodles, soup, vegetables, spoon, fork, chopsticks.',
      '职业询问：What\'s your father\'s job? He is a doctor/cook/driver/teacher/farmer.',
      '点餐意愿：What would you like for dinner? I\'d like some soup and bread, please.',
    ],
    pitfalls: [
      '不可数名词误加 -s（soup, beef, rice, milk 不可数，不能加 s）。',
      'a / an 混用：辅音音素开头用 a (a doctor)，元音音素开头用 an (an English teacher, an apple)。',
    ],
    wrongBookQuery: '核心句型',
  },
]

export default function KnowledgeHandbook() {
  const [activeTab, setActiveTab] = useState<SubjectTab>('math')
  const [expandedId, setExpandedId] = useState<string>('math-u1')

  const list = activeTab === 'math' ? MATH_HANDBOOK : activeTab === 'chinese' ? CHINESE_HANDBOOK : ENGLISH_HANDBOOK

  return (
    <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8]">
      {/* 头部标题与切换 Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0ece1] pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg">📚</span>
            <h2 className="text-sm sm:text-base font-bold text-[#243026]">
              四年级全科考点手册
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[#66756c]">
            人教版/统编版单元知识结构 · 核心公式与易错避坑
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#fbfaf5] p-1 rounded-xl border border-[#eee7d8] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('math')
              setExpandedId('math-u1')
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              activeTab === 'math'
                ? 'bg-[#2f5d50] text-white shadow-xs'
                : 'text-[#66756c] hover:text-[#243026]'
            }`}
          >
            📐 数学 ({MATH_HANDBOOK.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('chinese')
              setExpandedId('zh-u1')
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              activeTab === 'chinese'
                ? 'bg-[#8c5e3c] text-white shadow-xs'
                : 'text-[#66756c] hover:text-[#243026]'
            }`}
          >
            📖 语文 ({CHINESE_HANDBOOK.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('english')
              setExpandedId('en-u1')
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              activeTab === 'english'
                ? 'bg-[#3f5f8a] text-white shadow-xs'
                : 'text-[#66756c] hover:text-[#243026]'
            }`}
          >
            🔤 英语 ({ENGLISH_HANDBOOK.length})
          </button>
        </div>
      </div>

      {/* 知识点卡片列表（可折叠式） */}
      <div className="mt-3 space-y-2.5">
        {list.map((card) => {
          const isExpanded = expandedId === card.id
          return (
            <div
              key={card.id}
              className={`rounded-xl border transition-all ${
                isExpanded
                  ? 'border-[#2f5d50]/40 bg-[#fdfdfb] shadow-xs'
                  : 'border-[#eee7d8] bg-[#fbfaf5] hover:border-[#d9d2c3]'
              }`}
            >
              {/* 卡片头部（点击展开/折叠） */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? '' : card.id)}
                className="w-full flex items-center justify-between p-3 text-left"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${
                      activeTab === 'math'
                        ? 'bg-[#2f5d50]/10 text-[#2f5d50]'
                        : activeTab === 'chinese'
                          ? 'bg-[#8c5e3c]/10 text-[#8c5e3c]'
                          : 'bg-[#3f5f8a]/10 text-[#3f5f8a]'
                    }`}
                  >
                    {card.unit}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-[#243026] truncate">
                    {card.title}
                  </h3>
                </div>
                <span className="text-xs text-[#8c9c93] shrink-0 font-mono">
                  {isExpanded ? '▲ 收起' : '▼ 展开'}
                </span>
              </button>

              {/* 展开后的详细内容 */}
              {isExpanded && (
                <div className="border-t border-[#f0ece1] p-3 space-y-3 text-xs leading-relaxed text-[#4a5850]">
                  {/* 核心公式 */}
                  {card.formulas && card.formulas.length > 0 && (
                    <div className="rounded-lg bg-emerald-50/70 p-2.5 border border-emerald-200/80">
                      <span className="font-bold text-emerald-900 text-[11px] block mb-1">
                        📐 核心公式与定律：
                      </span>
                      <div className="space-y-1 text-emerald-950 font-medium">
                        {card.formulas.map((formula, idx) => (
                          <div key={idx} className="bg-white/80 rounded px-2 py-1">
                            <MathView text={`$${formula}$`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 必考概念精讲 */}
                  <div className="space-y-1">
                    <span className="font-bold text-[#243026] text-[11px] block">
                      📌 核心概念与必背法则：
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#55655c]">
                      {card.keyPoints.map((point, idx) => (
                        <li key={idx}>
                          <MathView text={point} as="span" />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 常见易错避坑 */}
                  <div className="rounded-lg bg-rose-50/70 p-2.5 border border-rose-200/70 text-xs">
                    <span className="font-bold text-rose-900 text-[11px] block mb-1">
                      ⚠️ 高频丢分坑点与考场提醒：
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-rose-800">
                      {card.pitfalls.map((pitfall, idx) => (
                        <li key={idx}>{pitfall}</li>
                      ))}
                    </ul>
                  </div>

                  {/* 错题本联动快捷入口 */}
                  <div className="flex justify-end pt-1">
                    <Link
                      to={`/wrong-book?filter=all`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2f5d50] hover:underline"
                    >
                      📕 去错题本复习该单元错题 →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
