# 💬 LLM Prompt Editor

An interactive web app for building, editing, and testing conversations with Large Language Models (LLMs). Perfect for crafting prompts, testing tool integrations, and designing complex chat flows.

## ✨ Features

- **Visual Conversation Builder**: Drag-and-drop interface for creating structured conversations
- **Multi-Role Support**: System, User, Assistant, and Tool messages
- **Tool Call Integration**: Full support for function calling with JSON arguments and responses
- **Auto-Save**: Conversations automatically saved to local browser storage
- **Import/Export**: JSON export/import for easy sharing and backup
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Smooth Animations**: Powered by Framer Motion for a polished UX

## 🚀 Live Demo

Check out the live application at: [**weberjulian.github.io/LLM-prompt-editor**](https://weberjulian.github.io/LLM-prompt-editor)

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Deployment**: GitHub Pages with custom SPA routing

## 📋 Prerequisites

- Node.js 18+ and npm
- Modern web browser with ES2015+ support

## 🏃‍♂️ Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/WeberJulian/LLM-prompt-editor.git
   cd LLM-prompt-editor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

## 📝 Usage

### Creating Conversations

1. **New Conversation**: Click "New" in the sidebar to create a blank conversation
2. **Add Messages**: Use the "Add" buttons to insert system, user, assistant, or tool messages
3. **Insert Anywhere**: Hover between messages to insert at specific positions
4. **Edit Content**: Click on any message to edit its content
5. **Reorder**: Use the up/down arrows to rearrange messages

### Tool Integration

1. **Define Tools**: Edit the JSON tools section with function definitions
2. **Create Tool Calls**: For assistant messages, add tool calls with function names and arguments
3. **Add Tool Responses**: Insert tool messages with corresponding `tool_call_id`

### Advanced Features

- **Prettify JSON**: Use the magic wand button to format JSON content
- **Duplicate Conversations**: Copy existing conversations as starting points
- **Search Tool IDs**: Auto-complete available tool call IDs for tool responses

## 📋 API Format

The app exports conversations as a clean JSON array of messages (OpenAI-compatible):

```json
[
  {"role": "system", "content": "You are a helpful assistant."},
  {"role": "user", "content": "What's the weather?"},
  {"role": "assistant", "tool_calls": [
    {"id": "call_123", "type": "function", "function": {"name": "get_weather", "arguments": "{\"location\": \"Paris\"}"}}
  ]},
  {"role": "tool", "tool_call_id": "call_123", "content": "{...}"}
]
```

> **Note**: Import supports both the new direct array format and legacy wrapped format with `{messages: [...], tools: [...]}`

## 🚀 Deployment

The app is automatically deployed to GitHub Pages on each push to main.

### Manual Deployment

```bash
npm run build
npm run deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - The web framework
- [Vite](https://vitejs.dev/) - Fast development and building
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Lucide](https://lucide.dev/) - Beautiful icons
