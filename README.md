# Nova Chat

A web-based conversational AI application with a browser interface and a server-side language-model integration. The repository documentation describes a Groq-powered configuration and local development scripts.

## Features and workflow
- Chat-style user interface
- Server-side request handling
- LLM-generated responses through the configured provider
- Local development scripts for Windows and Unix-like systems
- Deployment configuration documented in the repository

## Technology
Python · JavaScript · Node.js · Groq API

## Run locally
Requirements: Python 3.10+ and Node.js 18+.
```bash
git clone https://github.com/Ravi506051/novachat.git
cd novachat
```
Create a local `.env` file with the provider key expected by the backend. Then run `run.bat` on Windows or `./run.sh` on macOS/Linux, as described by the project.

## Security
Keep provider keys on the server and exclude `.env` from Git. Add rate limits to public endpoints, handle provider errors safely and never expose secrets in browser code or logs.

## Future improvements
Add conversation persistence, configurable model selection, request validation, usage monitoring and automated interface tests.

## Maintainer
**Ravi Kumar Rao** · [GitHub](https://github.com/Ravi506051)
