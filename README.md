# Nova Chat (Vercel edition)
Groq-powered chatbot. See DEPLOY_VERCEL.md to publish it.

Local run: Python 3.10+ and Node 18+. Put your key in `.env`, then run `run.bat` (Windows) or `./run.sh`
and open http://localhost:5173.

## Local Development Checklist

- Keep the Groq API key in a local environment file and ensure that file is excluded from Git.
- Verify the Python and Node.js versions required by the project before starting the local scripts.
- Test the chat interface with empty input, long prompts, and API errors.
- Handle rate limits and provider failures with a clear user-facing message rather than exposing secrets or raw stack traces.

## Deployment Safety

Configure secrets through the deployment platform's environment-variable settings. Do not place API keys in browser-side code or commit real credentials to the repository.

## Project Development Notes

Document the exact frontend/backend stack, environment variables, and Vercel deployment settings. Keep Gemini credentials server-side and protect public endpoints against quota abuse.

For reproducibility, record source versions, environment and dependency versions, configuration, and actual test outputs. Clearly label sample data and illustrative results; never commit secrets or private data.

### Technical Deep Dive

The application separates a browser-facing chat interface from a Python service and a Groq-backed response path. Keep provider credentials exclusively on the server, validate request payload size and message structure, and handle provider timeouts, rate limits, and malformed responses without returning secrets or raw stack traces to the client.

Suggested engineering checks: add per-session conversation limits, rate limiting for public endpoints, safe Markdown rendering, and tests for missing configuration and upstream API failures. Verify the deployed environment variables independently from local `.env` settings.

## Deployment and Reliability Checklist

- Keep the Groq API key in server-side environment variables; never expose it in browser code or commit .env files.
- Validate request payloads and impose sensible message-size, session, and rate limits for public deployments.
- Handle missing configuration, provider timeouts, rate limits, and malformed responses with safe user-facing errors.
- Test empty messages, long prompts, concurrent sessions, and unavailable upstream services.
- Document the actual frontend/backend entry points and deployment configuration used by this repository.

## Conversational Application Considerations

- Keep the user interface, conversation orchestration, model provider, and persistence layer loosely coupled.
- Make model configuration and API endpoints explicit so providers can be changed without rewriting application logic.
- Handle rate limits, network failures, empty responses, and context-length limits gracefully.
- Protect credentials and consider privacy before storing conversation history.
- Evaluate response quality with representative prompts and track latency, token usage, and failure rates.
