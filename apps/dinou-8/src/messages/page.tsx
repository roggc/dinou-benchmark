import { MessageForm } from "@/components/MessageForm";
import { PageHeader, Shell } from "@/shared/components/ui";
import type { Message } from "@/shared/lib/store";

export default function MessagesPage({ messages, stamp }: { messages: Message[]; stamp: string }) {
  return (
    <Shell>
      <PageHeader
        eyebrow="Server Function · local mutation"
        title="Messages"
        description="The form calls a Server Function that writes to a local JSON and revalidates this route. No intermediate API or HTTP client."
        badge={`${messages.length} messages`}
      />

      <MessageForm />

      <div className="shell-note" data-testid="messages-stamp">
        <span className="dot" />
        rendered: {stamp}
      </div>

      {messages.length === 0 ? (
        <p className="empty">No messages yet.</p>
      ) : (
        <ul className="messages" data-testid="messages">
          {messages.map((message) => (
            <li key={message.id} data-message-id={message.id}>
              <span className="who">{message.author}</span>
              <span className="body">{message.body}</span>
              <span className="at">{message.at.slice(11, 19)}</span>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

