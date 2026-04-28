import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

export default function VoiceToText({ onResult, disabled }) {
  const [supported] = useState(() => {
    return typeof window !== 'undefined' && (!!window.SpeechRecognition || !!window.webkitSpeechRecognition)
  })
  const [listening, setListening] = useState(false)
  const recogRef = useRef(null)

  const RecognitionCtor = useMemo(() => {
    return typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
  }, [])

  useEffect(() => {
    if (!supported || !RecognitionCtor) return
    const recog = new RecognitionCtor()
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'en-US'
    recogRef.current = recog
    return () => {
      try {
        recog.stop()
      } catch {
        // ignore
      }
    }
  }, [RecognitionCtor, supported])

  useEffect(() => {
    const recog = recogRef.current
    if (!recog) return

    const handleResult = (event) => {
      // Aggregate final results quickly
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript
        if (piece) transcript += `${piece} `
      }
      transcript = transcript.trim()
      if (transcript) onResult(transcript)
    }

    recog.addEventListener('result', handleResult)
    return () => recog.removeEventListener('result', handleResult)
  }, [onResult])

  const start = () => {
    if (!supported || disabled) return
    const recog = recogRef.current
    if (!recog) return
    setListening(true)
    try {
      recog.start()
    } catch {
      // Some browsers throw if start() called twice; ignore.
    }
  }

  const stop = () => {
    const recog = recogRef.current
    if (!recog) return
    setListening(false)
    try {
      recog.stop()
    } catch {
      // ignore
    }
  }

  if (!supported) {
    return <span className="co-mutedSmall">Voice not supported in this browser.</span>
  }

  return (
    <button
      type="button"
      className="co-btn co-btn--ghost"
      onClick={() => (listening ? stop() : start())}
      disabled={disabled}
      aria-pressed={listening}
    >
      {listening ? <MicOff size={16} /> : <Mic size={16} />}
      {listening ? 'Stop' : 'Voice'}
    </button>
  )
}

