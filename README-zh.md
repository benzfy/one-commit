# One-Commit

🚀 AI驱动的自动commit message生成器，使用OpenAI分析你的git diff并生成有意义的提交信息。

[English](./README.md) | [中文文档](./README-zh.md)

## 功能特性

- 🤖 **AI生成提交信息** - 使用OpenAI分析你的代码变更并生成描述性的commit message
- 📁 **选择性文件暂存** - 选择特定文件进行暂存和提交，支持全选/取消全选
- 🎯 **规范化提交** - 遵循conventional commits格式 (feat:, fix:, docs:等)
- ⚙️ **可配置** - 支持自定义OpenAI API密钥和基础URL
- 🔄 **交互式体验** - 在提交前可以审查、编辑或重新生成commit message
- 📦 **开箱即用** - 简单的npx命令，无需安装

## 快速开始

```bash
# 使用npx直接运行（无需安装）
npx one-commit

# 或者全局安装
npm install -g one-commit
one-commit
```

## 首次配置

第一次运行`one-commit`时，系统会提示你配置OpenAI设置：

```bash
npx one-commit --config
```

你需要提供：
- **OpenAI API密钥** (必需)
- **基础URL** (可选，默认为 https://api.openai.com/v1)
- **模型** (可选，默认为 gpt-4o-mini)

## 使用方法

### 基本用法

在你的git仓库中运行：

```bash
npx one-commit
```

工具会：
1. 检查是否有已暂存的更改
2. 如果没有暂存更改，询问是否要暂存所有更改
3. 使用AI生成commit message
4. 显示生成的信息供你审查
5. 允许你提交、编辑、重新生成或取消

### 配置选项

```bash
# 配置OpenAI设置
npx one-commit --config

# 显示帮助
npx one-commit --help
```

### 环境变量

你也可以通过环境变量设置配置：

```bash
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://api.openai.com/v1"  # 可选
```

## 示例

### 生成的Commit消息示例

AI会生成遵循conventional commit格式的提交信息：

- `feat: 添加用户认证系统`
- `fix: 修复数据处理器中的内存泄漏`
- `docs: 更新API文档`
- `refactor: 简化错误处理逻辑`
- `style: 使用prettier格式化代码`

### 交互式流程

```
🚀 One-Commit

✨ 生成的提交信息:
┌─────────────────────────────────────────────────┐
│ feat: 使用JWT令牌添加用户认证功能               │
└─────────────────────────────────────────────────┘

文件: src/auth.ts, src/middleware.ts (+127 -23)

你想要做什么？
✅ 使用此信息提交
✏️  编辑信息
🔄 重新生成信息
❌ 取消
```

## 系统要求

- Node.js 18+
- Git仓库
- OpenAI API密钥

## 配置存储

配置使用`conf`包在本地存储：
- macOS: `~/Library/Preferences/one-commit/config.json`
- Linux: `~/.config/one-commit/config.json`
- Windows: `%APPDATA%\one-commit\config.json`

## 开发

```bash
# 克隆仓库
git clone <repository-url>
cd one-commit

# 安装依赖
npm install

# 构建
npm run build

# 开发模式运行
npm run dev
```

## 支持的OpenAI接口

本工具支持任何兼容OpenAI API的服务，包括：
- OpenAI官方API
- Azure OpenAI
- 各种本地部署的LLM服务
- 其他兼容OpenAI格式的API服务

只需在配置中设置正确的`baseUrl`即可。

## 许可证

MIT

## 贡献

1. Fork本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开Pull Request

## 常见问题

### 如何获取OpenAI API密钥？
1. 访问 [OpenAI官网](https://platform.openai.com/api-keys)
2. 登录或注册账户
3. 创建新的API密钥
4. 复制密钥并在配置中使用

### 支持其他语言的commit message吗？
目前AI会根据你的代码变更上下文自动生成英文commit message。如需中文commit message，可以在生成后进行手动编辑。

### 如何使用自己部署的AI模型？
在配置时设置`baseUrl`为你的AI服务地址，确保API接口兼容OpenAI格式即可。

---

为想要更好提交信息而不想麻烦的开发者们用❤️制作。