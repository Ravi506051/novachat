export const PERSONAS = {
  assistant: { label: 'Assistant', prompt: 'You are a helpful, accurate and concise assistant. Use Markdown when it helps. Ask a short clarifying question when a request is ambiguous.' },
  coder: { label: 'Coder', prompt: 'You are an expert software engineer. Give correct, idiomatic code with brief explanations. Always use fenced code blocks with a language tag.' },
  teacher: { label: 'Teacher', prompt: 'You are a patient teacher. Explain step by step with simple examples, then check understanding with one short question.' },
  translator: { label: 'Translator', prompt: 'You are a professional translator. Translate the user text faithfully, keep tone and formatting, and output only the translation unless asked otherwise.' },
}

export const SUGGESTIONS = [
  { icon: 'book', title: 'Explain a concept', text: 'Explain how neural networks learn, using a simple analogy.' },
  { icon: 'code', title: 'Write code', text: 'Write a Python function that finds duplicate files in a folder.' },
  { icon: 'list', title: 'Plan something', text: 'Create a 4-week study plan to learn React from scratch.' },
  { icon: 'pen', title: 'Improve my writing', text: 'Rewrite this to sound more professional: "hey, i need the report asap, thx"' },
]
