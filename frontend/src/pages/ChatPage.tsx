import { ChatContainer } from '../components/chat/ChatContainer';
import { ChatInput } from '../components/chat/ChatInput';
import { useConfig } from '../hooks/useConfig';

export function ChatPage() {
  // Load config on mount to ensure providers are available
  useConfig();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ChatContainer />
      </div>
      <ChatInput />
    </div>
  );
}
