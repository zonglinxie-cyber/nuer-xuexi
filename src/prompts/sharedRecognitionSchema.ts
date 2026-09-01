export const SHARED_RECOGNITION_JSON_SCHEMA = `{
  "is_multi": false,
  "detected_subject": "math | chinese | english（根据图片实际内容判断的学科）",
  "overall_notes": "若图片中学科与用户选择不一致，请在此简要说明，如：检测到本页包含英语题目",
  "questions": [
    {
      "subject": "math | chinese | english",
      "recognized_text": "识别出的题目完整文本，包含题号与题干",
      "confidence_level": "高 | 中 | 低",
      "question_type": "题型（必须从本学科允许的题型中选）",
      "knowledge_point": "最匹配的一个知识点（尽量从对应学科知识点列表匹配）",
      "knowledge_points": ["相关知识点"],
      "textbook_unit": "对应教材章节或能力板块",
      "student_answer": "图片中若有学生手写或答题笔迹则提取，没有则留空字符串",
      "ai_answer": "参考正确答案或可接受要点，主观题写参考说法",
      "is_correct": "正确 | 错误 | 部分正确 | 无法判断 | 需家长确认",
      "explanation": "面向 9 岁孩子的启发式讲解：先说这题在问什么，再说怎么想",
      "step_by_step": ["点拨1：...", "点拨2：..."],
      "hints": ["启发孩子思考的提示问题1", "提示2"],
      "known_conditions": ["材料、原句或题目要求，没有则空数组"],
      "asked_question": "这道题要求孩子完成的核心任务",
      "need_human_check": false,
      "warning": ""
    }
  ]
}`
