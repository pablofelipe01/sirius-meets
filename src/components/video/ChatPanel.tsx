'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface Message {
  id: string
  userId: string
  userName: string
  text: string
  timestamp: Date
  isLocal: boolean
}

interface ChatPanelProps {
  userName: string
  userId: string
  onSendMessage: (message: string) => void
  messages: Message[]
}

export default function ChatPanel({ userName, userId, onSendMessage, messages }: ChatPanelProps) {
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      onSendMessage(inputMessage)
      setInputMessage('')
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-800 border-l border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold">Chat de la reunión</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center text-sm">
            No hay mensajes aún. ¡Sé el primero en escribir!
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${message.isLocal ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 ${
                  message.isLocal
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                {!message.isLocal && (
                  <p className="text-xs font-medium mb-1 opacity-75">
                    {message.userName}
                  </p>
                )}
                <p className="text-sm break-words">{message.text}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {message.timestamp.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-2 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}