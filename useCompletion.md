# useCompletion 前后端开发规范

基于当前项目的实际实现，总结 `useCompletion` 的前后端开发规范和最佳实践。

## 1. 前端 useCompletion 使用规范

### 1.1 基本配置结构

```typescript
import { useCompletion } from "@ai-sdk/react";

// 这个useCompletion中的completion是一个string的state，会像打字机一样的生成
const { completion, complete, isLoading, error, stop, setCompletion } = useCompletion({
  api: '/api/your-endpoint',
  body: {
    // 静态参数
    worldviewId: worldviewId,
    episodeRange: getNextEpisodeRange(episodeStep),
  },
  experimental_throttle: 50,
  onFinish: async (_prompt, completion) => {
    // 完成后的处理逻辑
  },
  onError: (err) => {
    console.error('生成失败:', err);
  },
});
```

### 1.2 必需的状态管理

```typescript
// 基础状态
const [editableTitle, setEditableTitle] = useState('');
const [editableContent, setEditableContent] = useState('');

// 业务逻辑状态
const [episodeStep, setEpisodeStep] = useState(defaultEpisodeStep);
```

### 1.3 onFinish 回调最佳实践

```typescript
onFinish: async (_prompt, completion) => {
  // 1. 计算业务数据
  const episodeRange = getNextEpisodeRange(episodeStep);
  const nextIndex = outlinesCount > 0 ? Math.max(...Array.from({length: outlinesCount}, (_, i) => i)) + 1 : 0;
  const title = `第${episodeRange}集大纲`;
  
  // 2. 调用保存 API
  try {
    const saveResponse = await fetch('/api/outline/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        content: completion.trim(), // 注意 trim()
        worldviewId: worldviewId,
        index: nextIndex,
        // 其他业务字段...
      }),
    });

    if (saveResponse.ok) {
      const saved = await saveResponse.json();
      onOutlineGenerated({ ...saved.outline, chapters: [] });
      // 3. 清理状态
      setEditableTitle('');
      setEditableContent('');
      setCompletion('');
    } else {
      alert('保存失败');
    }
  } catch (error) {
    console.error('Save error:', error);
    alert('保存失败');
  }
},
```

### 1.4 错误处理规范

```typescript
onError: (err) => {
  console.error('生成大纲失败:', err);
},

// 在组件中显示错误
{error && (
  <div className="text-red-500 text-sm">
    生成失败：{error.message}
  </div>
)}
```

### 1.5 complete() 函数使用规范

```typescript
// 1. 使用 complete() 直接触发生成（推荐方式）
const handleGenerate = async () => {
  try {
    // 清空之前的内容
    setCompletion('');
    
    // 方式1: 使用描述性提示词
    await complete('请生成大纲内容');
    
    // 方式2: 使用空字符串（当API端点已有完整上下文）
    await complete('');
    
    // 方式3: 使用JSON数据作为提示词
    const config = { type: 'outline', episodes: episodeRange };
    await complete(JSON.stringify(config));
    
    // 方式4: 使用body参数传递额外数据
    await complete('生成提示', { 
      body: { 
        customData: 'additional context' 
      } 
    });
    
  } catch (error) {
    console.error('生成失败:', error);
  }
};

// UI 交互
<div className="space-y-4">
  <div className="flex items-center gap-3">
    <Button 
      onClick={handleGenerate} 
      disabled={isLoading}
    >
      {isLoading ? `生成中...\n\n内容：${completion}` : '开始生成'}
    </Button>
    {isLoading && (
      <Button variant="outline" onClick={stop}>
        停止
      </Button>
    )}
  </div>
  
  {/* 自动触发场景示例 */}
  <Button 
    onClick={() => complete('请生成模拟沟通建议')}
    disabled={isLoading}
  >
    生成沟通建议
  </Button>
</div>

// 实时预览
{isLoading && completion && (
  <div className="mt-4">
    <label className="block text-sm font-medium mb-2">生成预览</label>
    <div className="max-h-60 overflow-y-auto border rounded-lg p-3 bg-muted">
      <div className="prose max-w-none text-sm">
        <MarkdownRenderer content={completion} />
      </div>
    </div>
  </div>
)}
```

## 2. 后端 API 开发规范

### 2.1 路由结构规范

```typescript

import { streamText } from 'ai';

export async function POST(req: Request) {
    
    const { prompt, userHistory = [] } = await req.json();

    const systemPrompt = `你是PitchLab的销售培训AI教练，目标是通过3-5个精准问题理解用户的核心痛点，从而展示PitchLab的价值。

【你的角色定位】
- 不是通用的销售顾问，而是"痛点诊断师"
- 每个问题都要逐层深入：表面需求 → 真实困境 → 转化机会

【问题设计原则】
1. 一次只问一个问题（高效），用Markdown简洁呈现
2. 基于用户的历史回答做出调整（避免重复）
3. 优先级：行业类型 → 销售流程瓶颈 → 团队规模 → 现有工具痛点 → PitchLab解决的具体问题

【问题库映射】
- 如果用户是B2B销售：问"你的销售周期最长的环节在哪？"
- 如果用户是初创团队：问"现在靠什么方式让新销售快速上手？"
- 如果用户提到"话术"："现在的话术是怎么积累和共享的？"
- 如果用户提到"成交率"："你怎么判断一个销售员是否有改进空间？"

【输出格式】
只输出**纯Markdown**，结构如下：
\`\`\`
## [问题序号/用户阶段识别]

你的问题文本（简洁，1-2句）

---
💡 **为什么问这个？** （1句话说明这个问题能帮助诊断什么痛点）
\`\`\`

不要加工具建议、长段落、或多个问题。`;

    try {
        const result = streamText({
            model: litellm.chat('deepseek-chat'),
            system: systemPrompt,
            prompt: `
用户的历史回答：
${userHistory.map((item: { question: string; answer: string }, i: number) => `Q${i + 1}: ${item.question}\nA: ${item.answer}`).join('\n\n')}

当前用户输入：
${prompt}

请根据用户的回答进程，生成下一个诊断问题。
            `,
        });

        //注意接口要是result.toUIMessageStreamResponse();，才是流式的
        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error('后台生成失败:', error);
        return new Response('后台生成失败', { status: 500 });
    }
}
```