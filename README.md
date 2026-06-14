# OPS Backend

A Python-based backend application featuring an intelligent agent system for orchestrating operations, compliance, security, and risk management workflows.

## Overview

This project implements a multi-agent architecture designed to handle complex operational workflows with support for:
- **AI Integration**: Integration with AI services for intelligent decision-making
- **Agent System**: Specialized agents for audit, compliance, security, risk, and registry management
- **Workflow Orchestration**: Sophisticated workflow engine for managing operational processes
- **Data Management**: Database and Redis integration for data persistence and caching
- **Configuration Management**: Centralized configuration system for easy deployment

## Project Structure

```
ops_backend/
├── backend/
│   ├── agents/              # Multi-agent system modules
│   │   ├── audit_agent.py
│   │   ├── compliance_agent.py
│   │   ├── escalation_agent.py
│   │   ├── meta_agent.py
│   │   ├── registry_agent.py
│   │   ├── risk_agent.py
│   │   ├── security_agent.py
│   │   └── base.py
│   ├── tests/               # Test suite
│   │   ├── test_ai_client.py
│   │   ├── test_band_client.py
│   │   ├── test_main.py
│   │   ├── test_workflow.py
│   │   └── conftest.py
│   ├── utils/               # Utility modules
│   │   └── logger.py
│   ├── ai_client.py         # AI service integration
│   ├── band_client.py       # Band service client
│   ├── config.py            # Configuration management
│   ├── database.py          # Database connection and utilities
│   ├── db_models.py         # Database models
│   ├── lineage.py           # Data lineage tracking
│   ├── main.py              # Application entry point
│   ├── models.py            # Data models and schemas
│   ├── orchestrator.py      # Workflow orchestration engine
│   ├── prompts.py           # AI prompts and templates
│   ├── redis_client.py      # Redis integration
│   └── schemas.py           # Data validation schemas
├── requirements.txt         # Python dependencies
├── pytest.ini              # Pytest configuration
└── README.md              # This file
```

## Installation

### Prerequisites
- Python 3.8 or higher
- Redis (for caching)
- PostgreSQL or compatible database

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ops_backend
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   Create a `.env` file in the root directory with necessary configuration:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/ops_db
   REDIS_URL=redis://localhost:6379/0
   AI_SERVICE_URL=<your-ai-service-url>
   LOG_LEVEL=INFO
   ```

## Usage

### Running the Application

```bash
python -m backend.main
```

### Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest backend/tests/test_main.py

# Run with coverage
pytest --cov=backend
```

## Key Components

### Agents
The agent system provides specialized modules for different operational concerns:
- **Audit Agent**: Tracking and auditing operations
- **Compliance Agent**: Ensuring regulatory compliance
- **Security Agent**: Managing security policies and threats
- **Risk Agent**: Risk assessment and management
- **Registry Agent**: Managing service registry and discovery
- **Escalation Agent**: Escalating critical issues
- **Meta Agent**: Coordinating between other agents

### Orchestrator
The `orchestrator.py` module provides the core workflow engine for:
- Task scheduling and execution
- Workflow state management
- Agent coordination

### Data Layer
- **Database**: Primary data persistence
- **Redis**: Caching and session management
- **Lineage Tracking**: Maintaining data lineage for compliance

## Configuration

Configuration is managed through `config.py`. Key configuration options include:
- Database connection settings
- Redis connection settings
- AI service endpoints
- Logging configuration
- Agent-specific settings

## Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Make your changes
3. Write or update tests as needed
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

## Testing

This project includes comprehensive tests for all major components. Tests are located in `backend/tests/` and use pytest.

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=backend --cov-report=html
```

## Logging

Logging is configured through `utils/logger.py`. Default log level and format can be configured via environment variables.

## Dependencies

All project dependencies are listed in `requirements.txt`. Key dependencies include:
- Flask/FastAPI (web framework)
- SQLAlchemy (ORM)
- Redis-py (Redis client)
- Pytest (testing framework)

For detailed dependency information, see `requirements.txt`.

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running and accessible
- Check DATABASE_URL environment variable
- Verify database credentials

### Redis Connection Issues
- Ensure Redis server is running (`redis-server`)
- Check REDIS_URL environment variable
- Verify Redis is accessible on the configured port

### Import Errors
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again
- Check that all dependencies are installed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or contributions, please open an issue or contact the development team.

---

**Last Updated**: June 2026
