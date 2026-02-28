# Oman Demo Claude — Feature List

## 1. Authentication & User Management

- **Google OAuth Sign-In** — One-click authentication via Google account
- **Email/Password Authentication** — Sign up with email confirmation, sign in with existing account (min 6-char password)
- **Persistent Sessions** — Auto-refresh via Supabase Auth; authenticated users skip login, unauthenticated users are redirected
- **Sign Out** — Logout button in header with redirect to login page
- **User Avatar** — Circular badge showing first letter of name/email

---

## 2. Multi-Provider AI Chat

### Supported LLM Providers
| Provider | Auth | Features |
|----------|------|----------|
| **OpenAI** | API key | Model listing, streaming |
| **Anthropic** (Claude) | API key | Streaming, system prompt separation |
| **Google Gemini** | API key | Streaming, role mapping |
| **Groq** | API key | OpenAI-compatible streaming |
| **Ollama** | Optional (local) | Custom base URL, local models |

### Chat Interface
- **Real-time Token Streaming** — Messages appear token-by-token via Server-Sent Events (SSE)
- **Pulsing Cursor** — Animated blinking cursor during generation
- **Three-dot Loader** — Animated dots while waiting for first tokens
- **Stop Generation** — Red stop button to abort mid-stream
- **Auto-expanding Textarea** — Grows up to 6 lines; Enter to send, Shift+Enter for newline
- **Model Selector Dropdown** — Choose provider + model from bottom toolbar; shows only connected providers
- **Markdown Rendering** — Full GitHub-flavored markdown with syntax-highlighted code blocks, tables, lists, links
- **Copy to Clipboard** — Button on assistant messages to copy content
- **Auto-scroll** — Smooth scroll to bottom as messages stream in

### Progress Indicators (Perplexity-style)
Step-by-step progress shown during processing:
- Reading uploaded files
- Analyzing file data
- Searching the web
- Generating response
- Creating visualization

Each step has status icons (pending → in progress → completed) with detail text.

### Empty State
- Welcome illustration with animated sparkle
- Suggestion chips: "Summarize a document", "Write a Python script", "Explain a concept", "Analyze data"

---

## 3. File Upload & Document Analysis

### Supported Formats
| Category | Extensions |
|----------|-----------|
| **PDF** | `.pdf` |
| **Word** | `.docx` |
| **Spreadsheet** | `.xlsx`, `.xls`, `.csv`, `.tsv` |
| **Code** | `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.json`, `.yaml`, `.yml`, `.xml`, `.html`, `.css`, `.go`, `.rs`, `.java`, `.c`, `.cpp`, `.h`, `.sh`, `.sql`, `.toml`, `.ini`, `.cfg`, `.env`, `.rb`, `.php`, `.swift`, `.kt`, `.scala`, `.r`, `.lua`, `.dart` |
| **Text** | `.txt`, `.md`, `.log` |

### Upload Features
- **Max file size**: 50 MB
- **Multi-file upload** in a single action
- **File preview chips** showing filename and size with remove button
- **Parsed content** stored in database and injected into LLM context
- **Content truncation**: First 50,000 characters with truncation notice
- **Supabase Storage**: Files stored in private `uploads/` bucket scoped to user

---

## 4. Data Visualization (Recharts)

### Chart Types
| Type | Description |
|------|------------|
| **Bar** | Vertical bar chart with rounded corners |
| **Horizontal Bar** | Horizontal layout for long category names |
| **Stacked Bar** | Grouped bars with shared axis |
| **Line** | Time-series with dot markers |
| **Area** | Filled line chart with opacity |
| **Pie** | Circular distribution with percentage labels |
| **Donut** | Pie with center cutout |
| **Scatter** | XY point distribution |

### Chart Features
- **8-color palette**: Indigo, amber, red, green, blue, pink, purple, teal
- **Dark-themed** tooltips, axes, and grid lines
- **Interactive tooltips** on hover
- **Color-coded legend** for multi-dataset charts
- **SVG download** button on each chart
- **Responsive** container that adapts to width
- **Live rendering** — Charts appear during streaming as `visualization` blocks are parsed

---

## 5. Web Search Integration

### Supported Search Providers
| Provider | Endpoint |
|----------|---------|
| **Tavily** | `api.tavily.com/search` |
| **Serper** | `google.serper.dev/search` |
| **Brave** | `api.search.brave.com/res/v1/web/search` |

### Search Features
- **Toggle button** (globe icon) in chat input to enable/disable
- **Visual indicator** when enabled ("Web search on" badge)
- **Up to 5 results** per query
- **Result cards** — Horizontally scrollable list showing:
  - Numbered badge
  - Domain favicon and name
  - Result title (max 2 lines)
  - Click to open source in new tab
- **Context injection** — Search results included in LLM context for grounded answers
- **Graceful fallback** — Error message if search provider fails

---

## 6. Conversation Management

### Sidebar
- **Collapsible** panel with toggle button (hidden on mobile by default)
- **New Chat** button creates fresh conversation
- **Conversation list** sorted by most recent
- **Active conversation** highlighted with blue border
- **Auto-generated titles** from first message (first 80 chars)
- **Delete conversation** — Hover to reveal trash icon, confirmation dialog before deletion
- **Animated transitions** — Spring-based open/close, fade-in/out for items

### Persistence
- Conversations and messages stored in Supabase PostgreSQL
- Last 20 messages loaded for context on each turn
- Full message history preserved (role, content, provider, model, file IDs, search results, visualizations)

---

## 7. Settings & Provider Configuration (`/config`)

### LLM Providers Section
- **Provider cards** in responsive 3-column grid
- Each card shows: display name, provider name, connection status (green/red dot with glow), selected model, Default badge
- **Actions per card**: Set Default, Edit, Delete

### Search Providers Section
- Same card-based layout
- Shows: display name, provider name, connection status, Default badge
- **Actions per card**: Set Default, Edit, Delete

### Add Provider Modal
1. **Provider dropdown** — Select from available providers (already-configured ones hidden)
2. **Display name** — Auto-filled, editable
3. **API key** — Password field with show/hide toggle
4. **Base URL** — Shown only for Ollama
5. **Test Connection** — Validates credentials, fetches available models
6. **Model selector** — Dropdown populated after successful test
7. **Save** — Encrypts API key (AES-256-GCM), creates record, auto-defaults first provider

### Edit Provider Modal
- Pre-populated with existing values
- Same fields as Add modal
- Re-test connection after changes

---

## 8. Theme & UI Design

### Dark / Light Theme
- **Toggle** via Sun/Moon icon in header
- **Default**: Dark theme
- **Persistence**: Saved to `localStorage`
- **Color scheme**:
  - Primary: Indigo (#6366f1)
  - Success: Green (#22c55e)
  - Error: Red (#ef4444)
  - Warning: Amber (#f59e0b)

### Animations (Framer Motion)
- Spring-physics transitions on all interactive elements
- Scale + opacity entrance animations
- Smooth dropdown open/close
- Hover lift effect on cards (y: -2px)
- Pulsing, rotating, and staggered child animations

### Layout
- **Header**: Fixed top bar with app name, theme toggle, settings gear, user avatar, sign out
- **Sidebar**: Collapsible conversation list (280px wide)
- **Main area**: Flexible content with scrollable chat and fixed input bar
- **Responsive**: Mobile-friendly with collapsible sidebar

---

## 9. Security & Data Isolation

- **Row-Level Security (RLS)**: All database tables enforce `auth.uid() = user_id`; users can only access their own data
- **API Key Encryption**: AES-256-GCM via Web Crypto API with PBKDF2 key derivation
- **JWT Authentication**: All API routes validate Supabase JWT tokens
- **Private file storage**: Upload bucket scoped to `{user_id}/` folder
- **401 handling**: Unauthenticated API requests return 401; expired sessions trigger sign-out

---

## 10. Infrastructure & Deployment

| Component | Technology |
|-----------|-----------|
| **Frontend** | React + TypeScript + Vite (SPA on Vercel CDN) |
| **API Routes** | TypeScript serverless functions on Vercel |
| **Database** | Supabase PostgreSQL |
| **Auth** | Supabase Auth (Google OAuth + Email/Password) |
| **File Storage** | Supabase Storage (private bucket, 50 MB limit) |
| **Charts** | Recharts (frontend rendering) |
| **Styling** | Tailwind CSS + Framer Motion |
| **State** | Zustand stores + React Context |
| **Markdown** | react-markdown + remark-gfm + rehype-raw |
| **Streaming** | Server-Sent Events (SSE) with 120s max duration |

### Database Tables
| Table | Purpose |
|-------|---------|
| `chat_conversations` | Conversation metadata (title, timestamps) |
| `chat_messages` | Message history (role, content, provider, model, file IDs, visualizations, search results) |
| `llm_providers` | LLM provider configs with encrypted API keys |
| `search_providers` | Search provider configs with encrypted API keys |
| `uploaded_files` | File metadata and parsed content |

---

## 11. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat/stream` | SSE streaming chat (120s max) |
| `GET` | `/api/config/llm-providers` | List user's LLM providers |
| `POST` | `/api/config/llm-providers` | Create LLM provider |
| `PUT` | `/api/config/llm-providers/[id]` | Update LLM provider |
| `DELETE` | `/api/config/llm-providers/[id]` | Delete LLM provider |
| `POST` | `/api/config/llm-providers/test` | Test LLM connection |
| `GET` | `/api/config/llm-providers/[id]/models` | Fetch available models |
| `GET` | `/api/config/search-providers` | List user's search providers |
| `POST` | `/api/config/search-providers` | Create search provider |
| `PUT` | `/api/config/search-providers/[id]` | Update search provider |
| `DELETE` | `/api/config/search-providers/[id]` | Delete search provider |
| `POST` | `/api/config/search-providers/test` | Test search connection |
| `POST` | `/api/files/upload` | Upload and parse file |
| `GET` | `/api/files/[id]` | Get file metadata |
| `DELETE` | `/api/files/[id]` | Delete file |
