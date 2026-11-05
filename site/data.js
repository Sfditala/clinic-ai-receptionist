window.PROJECT = {
  "slug": "clinic-ai-receptionist",
  "tab": "Clinic Receptionist",
  "title": "A receptionist that refuses to guess",
  "badge": "Demo · fictional clinic, sample data",
  "idea": "A Telegram receptionist for a dental clinic. It answers questions about hours, services, doctors and insurance only from the clinic's approved information, by text or voice, in Arabic or English.",
  "problem": "Receptionists answer the same questions all day, and patients often ask after hours. A general chatbot is risky in a medical setting, because it can invent a price or give medical advice.",
  "stack": [
    "n8n",
    "OpenAI gpt-5-mini",
    "OpenAI Whisper",
    "OpenAI Embeddings",
    "Supabase pgvector",
    "Google Drive",
    "ElevenLabs",
    "Telegram Bot API"
  ],
  "decisions": [
    [
      "One focused agent",
      "It does one job, so one agent with one search tool is enough. There's nothing to orchestrate."
    ],
    [
      "Enquiries only",
      "It doesn't book. It gives the reception phone and WhatsApp, which keeps the risk low."
    ],
    [
      "A fixed sentence for unknown answers",
      "If the knowledge base doesn't have it, the agent says so and points to reception."
    ],
    [
      "No medical advice",
      "It recommends an examination, and gives emergency guidance for serious cases."
    ]
  ],
  "lessons": [
    [
      "Re-running ingestion duplicated the knowledge, so search returned the same chunk five times.",
      "Old chunks are deleted first, using the document's source metadata."
    ],
    [
      "The delete step output one item per deleted row, so the file was downloaded eight times.",
      "Execute Once on the step after the delete."
    ],
    [
      "Instructions inside the knowledge file contradicted the prompt, and \"see section 7\" leaked into replies.",
      "The file holds facts only. Behaviour lives in the system prompt."
    ]
  ],
  "traces": [
    {
      "label": "A patient asks by text",
      "ask": "هل العيادة مفتوحة يوم الجمعة؟",
      "steps": [
        [
          "Telegram Trigger",
          "A patient's question arrives."
        ],
        [
          "Is Text Message?",
          "It's text."
        ],
        [
          "Prepare Question",
          "The question is normalised and marked as not voice."
        ],
        [
          "AI Agent",
          "It's a factual question, so it has to search before answering."
        ],
        [
          "search_clinic_knowledge",
          "Vector search over the clinic's document in Supabase."
        ],
        [
          "Query Embeddings",
          "The question becomes a vector to compare against."
        ],
        [
          "AI Agent",
          "Answers only from the results, in the patient's language."
        ],
        [
          "Reply as Voice?",
          "No voice note, so the reply is text."
        ],
        [
          "Send Reply",
          "A short, formal answer, escaped safely for Telegram HTML."
        ]
      ]
    },
    {
      "label": "A patient sends a voice note",
      "ask": "🎙️ كم سعر تنظيف الأسنان؟",
      "steps": [
        [
          "Telegram Trigger",
          "A voice note arrives."
        ],
        [
          "Is Text Message?",
          "Not text."
        ],
        [
          "Is Voice Message?",
          "It's voice."
        ],
        [
          "Download Voice Note",
          "Fetches the audio from Telegram."
        ],
        [
          "Fix Audio Format",
          "Telegram saves .oga, which transcription rejects, so code renames it .ogg."
        ],
        [
          "Transcribe Voice Note",
          "Whisper turns speech into text."
        ],
        [
          "Prepare Question",
          "A [VOICE NOTE] marker tells the agent the reply will be read aloud."
        ],
        [
          "AI Agent",
          "Keeps it to one to three spoken sentences, with no lists or symbols."
        ],
        [
          "search_clinic_knowledge",
          "Same rule: facts come from the document."
        ],
        [
          "AI Agent",
          "Writes the spoken answer."
        ],
        [
          "Reply as Voice?",
          "Voice in, so voice out."
        ],
        [
          "Convert Reply to Speech",
          "Tags and symbols are stripped, then ElevenLabs speaks it."
        ],
        [
          "Send Voice Reply",
          "The patient hears the answer."
        ]
      ]
    },
    {
      "label": "A medical question",
      "ask": "شو الدوا المناسب لوجع الضرس؟",
      "steps": [
        [
          "Telegram Trigger",
          "A patient asks which medicine to take."
        ],
        [
          "Is Text Message?",
          "Text."
        ],
        [
          "Prepare Question",
          "Normalised."
        ],
        [
          "AI Agent",
          "The prompt rules out medication advice. It recommends an examination and gives emergency guidance."
        ],
        [
          "Reply as Voice?",
          "Text reply."
        ],
        [
          "Send Reply",
          "A polite refusal, with a next step for the patient."
        ]
      ]
    },
    {
      "label": "Update the clinic's information",
      "ask": "▶ Run Ingestion",
      "steps": [
        [
          "Run Ingestion",
          "Someone edits the file on Drive and runs this."
        ],
        [
          "Clear Old Knowledge",
          "The old version's chunks are deleted first, so nothing is duplicated."
        ],
        [
          "Download Knowledge File",
          "Fetches the file, once, whatever the delete step returned."
        ],
        [
          "Markdown Loader",
          "Reads it and tags it with its source."
        ],
        [
          "Markdown Chunker",
          "Splits it along Markdown structure."
        ],
        [
          "OpenAI Embeddings",
          "Turns each chunk into a vector."
        ],
        [
          "Store in Supabase",
          "The agent answers from the new version."
        ]
      ]
    },
    {
      "label": "Something breaks",
      "ask": "⚠️ Workflow error",
      "steps": [
        [
          "On Workflow Error",
          "Any unhandled failure lands here."
        ],
        [
          "Alert Owner",
          "The owner gets the failing node and the error. Patient-facing failures send a separate apology with the reception number."
        ]
      ]
    }
  ],
  "setup": [
    "Connect Telegram, OpenAI, Supabase, Google Drive and ElevenLabs credentials.",
    "Create a Supabase documents table with pgvector and a match_documents function, at 1536 dimensions.",
    "Upload your knowledge file to Drive and replace YOUR_GOOGLE_DRIVE_FILE_ID.",
    "Replace YOUR_TELEGRAM_CHAT_ID, then run Run Ingestion once and publish."
  ],
  "signature": {
    "title": "Ask the receptionist",
    "sub": "Pick a question to see how it's handled, then follow it through the workflow.",
    "style": "cols3",
    "prompt": "Pick a question above.",
    "note": "These results come from testing with a fictional clinic's sample data. This page doesn't contact the bot.",
    "items": [
      {
        "label": "هل العيادة مفتوحة يوم الجمعة؟",
        "tag": "Answered from the knowledge base",
        "trace": 0,
        "text": "\"Closed on Fridays.\" Before the fixes, the same question got \"information not available\"."
      },
      {
        "label": "هل تقدمون زراعة الأسنان؟",
        "tag": "Clearly not offered",
        "trace": 0,
        "text": "\"Not offered\", with the reception number."
      },
      {
        "label": "شو الدوا المناسب لوجع الضرس؟",
        "tag": "Politely refused",
        "trace": 2,
        "text": "No medication advice. It recommends an examination and gives emergency guidance."
      },
      {
        "label": "ممكن تحجزلي موعد؟",
        "tag": "Sent to reception",
        "trace": 0,
        "text": "It handles enquiries only, so it gives the reception phone and WhatsApp."
      },
      {
        "label": "🎙️ A voice note",
        "tag": "Voice in, voice out",
        "trace": 1,
        "text": "Transcribed by Whisper and answered in short spoken sentences, without lists or symbols."
      },
      {
        "label": "The price list changed",
        "tag": "One-click update",
        "trace": 3,
        "text": "Edit the file on Drive and run ingestion. The old version is deleted first, so nothing is duplicated."
      }
    ]
  }
};
