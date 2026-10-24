import { MessageForm } from "@/components/MessageForm";
import { PageHeader, Shell } from "@/shared/components/ui";
import type { Message } from "@/shared/lib/store";

export default function MessagesPage({ messages, stamp }: { messages: Message[]; stamp: string }) {
  return (
    <Shell>
      <PageHeader
        eyebrow="Server Function · mutación local"
        title="Mensajes"
        description="El formulario llama a una Server Function que escribe en un JSON local y revalida esta ruta. Sin API intermedia ni cliente HTTP."
        badge={`${messages.length} mensajes`}
      />

      <MessageForm />

      <div className="shell-note" data-testid="messages-stamp">
        <span className="dot" />
        renderizado: {stamp}
      </div>

      {messages.length === 0 ? (
        <p className="empty">Todavía no hay mensajes.</p>
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

