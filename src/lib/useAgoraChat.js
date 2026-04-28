import { useState, useRef, useCallback, useEffect } from 'react'
import AgoraRTM from 'agora-rtm-sdk'

/**
 * useAgoraChat — Real-time messaging within a video call channel.
 *
 * Usage:
 *   const chat = useAgoraChat()
 *   await chat.login(appId, odId, displayName)
 *   await chat.joinChannel(channelName)
 *   chat.sendMessage('Hello!')
 *   chat.messages → [{ from, text, time, displayName }]
 */
export default function useAgoraChat() {
  const clientRef = useRef(null)
  const channelRef = useRef(null)

  const [messages, setMessages] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState(null)
  const displayNameRef = useRef('')

  /**
   * Login to Agora RTM.
   */
  const login = useCallback(async (appId, odId, token, displayName) => {
    setError(null)
    try {
      const client = AgoraRTM.createInstance(appId)
      clientRef.current = client
      displayNameRef.current = displayName || odId

      await client.login({ uid: String(odId), token: token || undefined })

      // Set user attributes for display name
      try {
        await client.setLocalUserAttributes({ displayName: displayName || odId })
      } catch { /* some versions don't support this */ }
    } catch (err) {
      console.error('[useAgoraChat] login error:', err)
      setError(err?.message || 'Failed to connect chat')
    }
  }, [])

  /**
   * Join an RTM channel.
   */
  const joinChannel = useCallback(async (channelName) => {
    if (!clientRef.current) return
    try {
      const channel = clientRef.current.createChannel(channelName)
      channelRef.current = channel

      channel.on('ChannelMessage', (msg, senderId) => {
        // Try to parse JSON envelope, fallback to plain text
        let parsed
        try { parsed = JSON.parse(msg.text) } catch { parsed = null }

        setMessages((prev) => [
          ...prev,
          {
            from: senderId,
            text: parsed?.text || msg.text,
            displayName: parsed?.displayName || senderId,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      })

      channel.on('MemberJoined', (memberId) => {
        setMessages((prev) => [
          ...prev,
          {
            from: 'system',
            text: `${memberId} joined the call`,
            displayName: 'System',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      })

      channel.on('MemberLeft', (memberId) => {
        setMessages((prev) => [
          ...prev,
          {
            from: 'system',
            text: `${memberId} left the call`,
            displayName: 'System',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ])
      })

      await channel.join()
      setIsConnected(true)
    } catch (err) {
      console.error('[useAgoraChat] joinChannel error:', err)
      setError(err?.message || 'Failed to join chat channel')
    }
  }, [])

  /**
   * Send a message to the channel.
   */
  const sendMessage = useCallback(async (text) => {
    if (!channelRef.current || !text.trim()) return
    const envelope = JSON.stringify({
      text: text.trim(),
      displayName: displayNameRef.current,
    })
    try {
      await channelRef.current.sendMessage({ text: envelope })
      // Add to local messages list (sender doesn't receive their own message via event)
      setMessages((prev) => [
        ...prev,
        {
          from: 'me',
          text: text.trim(),
          displayName: displayNameRef.current,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (err) {
      console.error('[useAgoraChat] send error:', err)
    }
  }, [])

  /**
   * Leave channel and logout.
   */
  const logout = useCallback(async () => {
    try {
      if (channelRef.current) {
        await channelRef.current.leave()
        channelRef.current = null
      }
      if (clientRef.current) {
        await clientRef.current.logout()
        clientRef.current = null
      }
      setMessages([])
      setIsConnected(false)
    } catch (err) {
      console.error('[useAgoraChat] logout error:', err)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => { logout() }
  }, [logout])

  return {
    login,
    joinChannel,
    sendMessage,
    logout,
    messages,
    isConnected,
    error,
  }
}
