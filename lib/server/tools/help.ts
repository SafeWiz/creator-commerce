import 'server-only'

import { z } from 'zod'

import { HELP_TOPIC_IDS, HELP_TOPICS } from '@/lib/server/ai/cece/guide'
import { defineTool } from '@/lib/server/tools/types'

// The topic list goes into the description so the model can pick one without
// a round trip.
const topicList = HELP_TOPIC_IDS.map((id) => `- ${id}: ${HELP_TOPICS[id].summary}`).join('\n')

export const getHelpTopic = defineTool({
  name: 'get_help_topic',
  description: `Returns the platform guide for one topic: how Creator Commerce works, its limits, and what is not available yet. Call it before answering any question about how to do something on the platform. Topics:\n${topicList}`,
  inputSchema: z.object({
    topic: z.enum(HELP_TOPIC_IDS),
  }),
  async execute(_ctx, { topic }) {
    return { topic, content: HELP_TOPICS[topic].content }
  },
})
