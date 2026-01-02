# CRM System - Multi-Tenant SaaS Platform

A comprehensive Customer Relationship Management system built with NestJS, React, and PostgreSQL, featuring real-time collaboration, automation workflows, and enterprise-grade security.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (optional)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd crm

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env
# Configure DATABASE_URL, REDIS_URL, JWT_SECRET, etc.

# Database setup
npx prisma migrate dev
npx prisma generate
npx prisma db seed

# Start development servers
npm run dev          # Backend (port 3000)
npm run dev:frontend # Frontend (port 3001)
```

### Docker Setup

```bash
docker-compose up -d
```

## 📋 Core Features

### 🏢 Multi-Tenant Architecture
- Complete tenant isolation
- Role-based access control (RBAC)
- Custom tenant settings and branding

### 👥 Contact & Lead Management
- Contact lifecycle management
- Lead scoring and qualification
- Custom fields and data import/export
- Duplicate detection and merging

### 💰 Sales Pipeline
- Opportunity tracking with stages
- Revenue forecasting and analytics
- Quote generation and management
- Win/loss analysis

### 📋 Task & Project Management
- Task assignment and tracking
- Automated reminders and notifications
- Activity timeline and history
- Team collaboration tools

### 🎫 Support Ticketing
- Multi-channel ticket creation
- SLA tracking and breach alerts
- Priority-based routing
- Customer self-service portal

### 📊 Analytics & Reporting
- Real-time dashboards
- Sales performance metrics
- Custom report builder
- Data visualization charts

### 🔄 Workflow Automation
- Visual workflow builder
- Trigger-based automation
- Conditional logic and actions
- Email and SMS automation

### 💬 Communication Hub
- Email integration (Gmail, Outlook)
- SMS messaging
- Call logging and tracking
- Communication history

### 📁 Document Management
- File storage with Backblaze B2
- Document versioning
- Secure file sharing
- Integration with records

### 🔗 Third-Party Integrations
- Webhook system
- REST API with documentation
- Pre-built integrations (Slack, Calendar)
- Custom integration framework

### ⚡ Real-Time Features
- WebSocket-based live updates
- Real-time notifications
- Collaborative editing with field locking
- Live dashboard updates

### 🔒 Security & Compliance
- Data encryption at rest (AWS KMS)
- API rate limiting
- Comprehensive audit logging
- GDPR compliance tools
- Data export and anonymization

## 🏗️ Architecture

### Backend (NestJS)
```
src/
├── auth/           # Authentication & JWT
├── contacts/       # Contact management
├── leads/          # Lead tracking
├── opportunities/  # Sales pipeline
├── tasks/          # Task management
├── tickets/        # Support system
├── communications/ # Email/SMS/Calls
├── workflows/      # Automation engine
├── webhooks/       # Webhook system
├── integrations/   # Third-party APIs
├── files/          # Document storage
├── analytics/      # Reporting engine
├── websocket/      # Real-time features
├── notifications/  # Notification system
├── audit/          # Audit logging
├── gdpr/           # Compliance tools
└── common/         # Shared utilities
```

### Frontend (React + TypeScript)
```
frontend/src/
├── components/     # Reusable UI components
├── pages/          # Route components
├── hooks/          # Custom React hooks
├── lib/            # Utilities and API client
├── types/          # TypeScript definitions
└── styles/         # Tailwind CSS
```

### Database (PostgreSQL + Prisma)
- Multi-tenant schema with tenant isolation
- Optimized indexes for performance
- Audit trail for all operations
- Soft deletes for data recovery

## 🔧 Configuration

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/crm"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# File Storage (Backblaze B2)
B2_KEY_ID="your-key-id"
B2_APPLICATION_KEY="your-app-key"
B2_BUCKET_NAME="your-bucket"

# Email (SendGrid)
SENDGRID_API_KEY="your-sendgrid-key"

# SMS (Twilio)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"

# Encryption
ENCRYPTION_KEY="your-encryption-key"
```

## 📡 API Documentation

API documentation is available at `/api/docs` when running the development server.

### Key Endpoints

```
POST   /api/v1/auth/login
GET    /api/v1/contacts
POST   /api/v1/contacts
GET    /api/v1/opportunities
POST   /api/v1/tasks
GET    /api/v1/analytics/dashboard
POST   /api/v1/workflows
GET    /api/v1/notifications
```

## 🚀 Deployment

### AWS Infrastructure (Terraform)

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### CI/CD Pipeline

GitHub Actions workflow handles:
- Automated testing
- Docker image building
- AWS ECS deployment
- Database migrations

### Production Checklist

- [ ] Configure environment variables
- [ ] Set up SSL certificates
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Set up log aggregation (Loki)
- [ ] Configure backup strategy
- [ ] Set up alerting rules

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

## 📈 Monitoring

- **Metrics**: Prometheus + Grafana
- **Logs**: Loki + Promtail
- **Health Checks**: `/health` endpoint
- **Performance**: Application metrics and alerts

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.
