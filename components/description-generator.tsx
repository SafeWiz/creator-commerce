"use client"

import { useEffect, useRef, useState } from "react"
import { useCompletion } from "@ai-sdk/react"
import { APICallError } from "ai"

const GENERIC_ERROR = "Could not generate a description."

/**
 * "Generate with AI" for the product form's description.
 *
 * The streamed text is mirrored into the form field as it arrives, so the
 * seller watches it being written and can edit it afterwards like anything
 * they typed. Nothing is saved here — the form's Save does that.
 *
 * Whatever was in the field before a generation is kept, and `undo` puts it
 * back: a click must not cost the seller text they wrote by hand.
 */
export function useDescriptionGenerator({
  fileKey,
  getName,
  getDescription,
  setDescription,
}: {
  fileKey: string | null
  getName: () => string
  getDescription: () => string
  // Must be stable across renders: it is an effect dependency.
  setDescription: (text: string) => void
}) {
  // The field's text before the current generation; null when there is
  // nothing to undo.
  const previous = useRef<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [failed, setFailed] = useState(false)
  // True from click to finish. Without it the mirror below would also run on
  // mount, with an empty completion, and wipe the field.
  const generating = useRef(false)

  function restorePrevious() {
    if (previous.current !== null) setDescription(previous.current)
    previous.current = null
    setCanUndo(false)
  }

  const { completion, complete, isLoading, stop, error } = useCompletion({
    api: "/api/products/describe",
    // The route answers with toTextStreamResponse(): plain text, no protocol.
    streamProtocol: "text",
    onFinish: (_prompt, text) => {
      generating.current = false
      // A stream that ends without text is a failure the route could not
      // signal — the 200 was already sent when the model gave up.
      if (!text.trim()) {
        restorePrevious()
        setFailed(true)
      }
    },
    onError: () => {
      generating.current = false
      restorePrevious()
    },
  })

  useEffect(() => {
    if (generating.current) setDescription(completion)
  }, [completion, setDescription])

  function generate() {
    if (!fileKey) return
    previous.current = getDescription()
    setCanUndo(true)
    setFailed(false)
    generating.current = true
    void complete("", { body: { fileKey, name: getName() } })
  }

  function handleStop() {
    generating.current = false
    stop()
  }

  function undo() {
    restorePrevious()
  }

  return {
    generate,
    stop: handleStop,
    undo,
    canUndo,
    isLoading,
    error: error ? errorMessage(error) : failed ? GENERIC_ERROR : null,
  }
}

// A non-OK response becomes an APICallError whose message is the route's
// body, which is written for the seller, so it is shown as is. Anything else —
// "Failed to fetch" when offline, a stream cut mid-way — is not, and gets the
// generic line.
function errorMessage(error: Error) {
  return APICallError.isInstance(error) && error.message
    ? error.message
    : GENERIC_ERROR
}
