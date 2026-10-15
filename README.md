\# AI Document Intelligence Platform



A multi-tenant AI platform designed to help businesses manage document knowledge, build AI-powered support experiences, and handle conversational bookings through a unified application.



\## Overview



AI Document Intelligence combines document ingestion, retrieval-augmented generation (RAG), AI-powered question answering, and conversational booking capabilities in one platform.



The project includes a web frontend, Python backend, and Flutter mobile application.



\## Key Features



\- \*\*Document Intelligence:\*\* Ingest and retrieve information from business documents.

\- \*\*RAG-Based Question Answering:\*\* Use retrieved knowledge to help answer user questions.

\- \*\*Multi-Tenant Architecture:\*\* Organize business data with tenant-aware retrieval and security.

\- \*\*AI Support Assistant:\*\* Support knowledge-based customer interactions.

\- \*\*Conversational Booking:\*\* Manage booking workflows through the application.

\- \*\*Analytics Dashboard:\*\* Access application analytics and activity views.

\- \*\*Web Application:\*\* Modern frontend built with Next.js and TypeScript.

\- \*\*Mobile Application:\*\* Flutter-based mobile client.

\- \*\*Containerized Setup:\*\* Dockerfiles and Docker Compose configuration for running the services.



\## Technology Stack



| Component | Technologies |

|---|---|

| Backend | Python, FastAPI |

| Frontend | Next.js, React, TypeScript |

| Mobile | Flutter, Dart |

| Database | PostgreSQL |

| AI Architecture | Retrieval-Augmented Generation (RAG) |

| Deployment and Setup | Docker, Docker Compose |

| Database Migrations | Alembic |

| Testing | pytest |



\## Architecture



```text

&#x20;                Users

&#x20;                  |

&#x20;         Web / Mobile Application

&#x20;            |             |

&#x20;         Next.js        Flutter

&#x20;            |             |

&#x20;            +------+------+

&#x20;                   |

&#x20;              FastAPI

&#x20;                   |

&#x20;      +------------+------------+

&#x20;      |            |            |

&#x20;  Documents     Retrieval     Booking

&#x20;      |            |

&#x20;      +------ AI / RAG --------+

&#x20;                   |

&#x20;            PostgreSQL

```



\*Conceptual overview; refer to the architecture documentation for implementation details.\*



\## Project Structure



```text

AI-Document-Intelligence/

├── multi-tenant-ai-agent-platform/

│   ├── backend/       # API, services, models and tests

│   ├── frontend/      # Next.js web application

│   ├── mobile/        # Flutter application

│   ├── docs/          # Architecture and technical documentation

│   ├── docker-compose.yml

│   └── README.md

├── .gitignore

└── README.md

```



\## Getting Started



\### Prerequisites



\- Git

\- Docker Desktop with Docker Compose

\- Alternatively, Python and Node.js for running services individually



\### Run with Docker Compose



1\. Clone the repository:



&#x20;  ```bash

&#x20;  git clone https://github.com/sakshiagra1903/AI-Document-Intelligence.git

&#x20;  cd AI-Document-Intelligence/multi-tenant-ai-agent-platform

&#x20;  ```



2\. Review the environment variable requirements in the project documentation and `.env.example`.



3\. Create the required local environment configuration and provide your own valid credentials. Never commit real API keys or passwords.



4\. Start the configured services:



&#x20;  ```bash

&#x20;  docker compose up --build

&#x20;  ```



5\. Check the service logs and configured ports to access the application.



For detailed Windows instructions, see \[`docs/windows-runbook.md`](multi-tenant-ai-agent-platform/docs/windows-runbook.md).



\## Documentation



\- \[Architecture](multi-tenant-ai-agent-platform/docs/architecture.md)

\- \[Document Intelligence](multi-tenant-ai-agent-platform/docs/document-intelligence.md)

\- \[RAG Pipeline](multi-tenant-ai-agent-platform/docs/rag-pipeline.md)

\- \[Booking Module](multi-tenant-ai-agent-platform/docs/module-7-booking.md)

\- \[Windows Runbook](multi-tenant-ai-agent-platform/docs/windows-runbook.md)

\- \[Validation Report](multi-tenant-ai-agent-platform/docs/validation-report.md)



\## Demo



\*\*Project Demo:\*\* Video coming soon.



A demonstration video will be linked here after it is uploaded.



\## Security



\- Keep API keys, database passwords, and other credentials private.

\- Use environment variables for secrets.

\- Do not upload `.env` files or other files containing real credentials.



\## Future Improvements



\- Expand automated testing and validation.

\- Improve deployment and monitoring workflows.

\- Continue enhancing document retrieval and conversational AI capabilities.



\## Author



\*\*Sakshi Agrawal\*\*



GitHub: \[@sakshiagra1903](https://github.com/sakshiagra1903)



\---



If you find this project interesting, explore the source code and documentation, and share your feedback.
## 🎥 Project Demo

Watch the working demo of the **AI Document Intelligence Platform**:

[▶️ Watch the Project Demo on Google Drive](https://drive.google.com/file/d/13YZPbWIMBc5CrSMegWz9__2k6Q-eejN3/view?usp=sharing)





