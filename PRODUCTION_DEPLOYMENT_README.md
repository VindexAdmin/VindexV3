# Vindex Chain - Production Deployment Guide

This guide covers the complete production deployment process for the Vindex Chain ecosystem using Docker containers and Kubernetes orchestration.

## 🏗️ Infrastructure Overview

### Architecture Components

- **Blockchain Core**: Node.js backend service running the Vindex blockchain
- **Wallet App**: Next.js web application for user interactions
- **Explorer**: Next.js blockchain explorer for transaction viewing
- **Admin Dashboard**: Administrative interface for system management
- **PostgreSQL**: Primary database for blockchain data
- **Redis**: Caching layer for improved performance
- **Nginx**: Reverse proxy with SSL termination
- **Prometheus**: Metrics collection and monitoring
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and notifications

### Service Architecture

```
Internet
    ↓
[Nginx Reverse Proxy]
    ↓
[Kubernetes Ingress]
    ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Wallet App  │ Explorer    │ Admin Panel │ API Gateway │
│ (Port 3000) │ (Port 3001) │ (Port 3002) │ (Port 3001) │
└─────────────┴─────────────┴─────────────┴─────────────┘
                                              ↓
                                    [Blockchain Core]
                                              ↓
                               ┌──────────────┴──────────────┐
                               ↓                             ↓
                        [PostgreSQL DB]                [Redis Cache]
```

## 🚀 Quick Start

### Prerequisites

1. **Docker** (v20.10+)
2. **Kubernetes cluster** (v1.24+)
3. **kubectl** configured for your cluster
4. **Helm** (optional, for monitoring stack)
5. **Git** access to the repository

### 1. Local Development

```bash
# Clone the repository
git clone https://github.com/VindexAdmin/VindexV3.git
cd VindexV3

# Start development environment
docker-compose up -d

# Access services
# Wallet: http://localhost:3000
# Explorer: http://localhost:3006
# Admin: http://localhost:3007
# API: http://localhost:3001
```

### 2. Production Deployment

```bash
# Full deployment
./scripts/deploy.sh

# Step-by-step deployment
./scripts/deploy.sh check      # Check prerequisites
./scripts/deploy.sh build      # Build and push images
./scripts/deploy.sh monitoring # Deploy monitoring
./scripts/deploy.sh app        # Deploy application
./scripts/deploy.sh health     # Run health checks
```

## 📦 Container Images

### Build Process

Each service uses a multi-stage Docker build:

1. **Dependencies stage**: Install npm packages
2. **Builder stage**: Compile TypeScript and build assets
3. **Production stage**: Minimal runtime image with non-root user

### Image Registry

Images are stored in GitHub Container Registry:
- `ghcr.io/vindexadmin/vindexv3/blockchain-core:latest`
- `ghcr.io/vindexadmin/vindexv3/wallet-app:latest`
- `ghcr.io/vindexadmin/vindexv3/explorer:latest`
- `ghcr.io/vindexadmin/vindexv3/admin-dashboard:latest`

### Manual Build

```bash
# Build blockchain core
cd packages/blockchain-core
docker build -t vindex/blockchain-core:latest .

# Build wallet app
cd ../wallet-app
docker build -t vindex/wallet-app:latest .

# Build explorer
cd ../explorer
docker build -t vindex/explorer:latest .

# Build admin dashboard
cd ../admin-dashboard
docker build -t vindex/admin-dashboard:latest .
```

## ☸️ Kubernetes Deployment

### Environments

- **Production**: `k8s/production.yaml`
- **Staging**: `k8s/staging.yaml`
- **Monitoring**: `k8s/monitoring.yaml`

### Manual Deployment

```bash
# Create namespace
kubectl create namespace vindex-chain

# Deploy production environment
kubectl apply -f k8s/production.yaml

# Deploy monitoring
kubectl apply -f k8s/monitoring.yaml

# Check status
kubectl get pods -n vindex-chain
kubectl get services -n vindex-chain
kubectl get ingress -n vindex-chain
```

### Scaling

```bash
# Scale blockchain core
kubectl scale deployment blockchain-core --replicas=5 -n vindex-chain

# Scale wallet app
kubectl scale deployment wallet-app --replicas=3 -n vindex-chain

# Auto-scaling is configured via HPA (70% CPU, 80% memory)
kubectl get hpa -n vindex-chain
```

## 🔧 Configuration

### Environment Variables

#### Blockchain Core
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@postgres:5432/vindex
REDIS_URL=redis://redis:6379
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://wallet.vindex.io,https://explorer.vindex.io
```

#### Wallet App
```bash
NODE_ENV=production
PORT=3000
BLOCKCHAIN_API_URL=http://blockchain-core:3001
NEXTAUTH_URL=https://wallet.vindex.io
NEXTAUTH_SECRET=your-nextauth-secret
```

### Secrets Management

Sensitive data is stored in Kubernetes secrets:

```bash
# Create secrets
kubectl create secret generic vindex-secrets \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=JWT_SECRET="..." \
  --from-literal=NEXTAUTH_SECRET="..." \
  -n vindex-chain
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The pipeline includes:

1. **Testing**: Unit tests, integration tests, linting
2. **Security**: Vulnerability scanning, dependency audit
3. **Building**: Docker image builds and registry push
4. **Deployment**: Automated deployment to staging/production
5. **Monitoring**: Health checks and performance testing

### Workflow Triggers

- **Push to `main`**: Deploy to production
- **Push to `develop`**: Deploy to staging
- **Pull requests**: Run tests and security scans

### Manual Deployment

```bash
# Deploy specific version
kubectl set image deployment/blockchain-core \
  blockchain-core=ghcr.io/vindexadmin/vindexv3/blockchain-core:v1.2.3 \
  -n vindex-chain

# Rollback deployment
kubectl rollout undo deployment/blockchain-core -n vindex-chain

# Check rollout status
kubectl rollout status deployment/blockchain-core -n vindex-chain
```

## 📊 Monitoring & Observability

### Metrics Collection

- **Prometheus**: Collects metrics from all services
- **Grafana**: Provides dashboards and visualization
- **AlertManager**: Handles alert routing and notifications

### Access URLs

- **Grafana**: https://monitoring.vindex.io
- **AlertManager**: https://alerts.vindex.io
- **Prometheus**: Internal cluster access only

### Key Metrics

- Transaction throughput and latency
- Block production rate
- API response times
- System resource usage (CPU, memory, disk)
- Error rates and success rates

### Alerts

- High CPU/memory usage (>80%)
- Service downtime (>2 minutes)
- High transaction failure rate (>10%)
- Database connection errors
- SSL certificate expiration

## 🔒 Security

### Network Security

- All external traffic uses HTTPS/TLS 1.2+
- Internal communication via service mesh
- Network policies restrict pod-to-pod communication
- Rate limiting on API endpoints

### Container Security

- Non-root users in all containers
- Minimal base images (Alpine Linux)
- Regular security updates
- Vulnerability scanning in CI/CD

### Access Control

- RBAC for Kubernetes access
- Service accounts with minimal permissions
- Admin dashboard restricted to internal networks
- Multi-factor authentication for critical operations

### Secrets Management

- Kubernetes secrets for sensitive data
- Encryption at rest and in transit
- Regular secret rotation
- No hardcoded credentials in code

## 🚨 Troubleshooting

### Common Issues

#### Pod Startup Issues
```bash
# Check pod logs
kubectl logs -f deployment/blockchain-core -n vindex-chain

# Describe pod for events
kubectl describe pod <pod-name> -n vindex-chain

# Check resource usage
kubectl top pods -n vindex-chain
```

#### Database Connection Issues
```bash
# Check PostgreSQL pod
kubectl logs -f statefulset/postgres -n vindex-chain

# Test database connectivity
kubectl exec -it deployment/blockchain-core -n vindex-chain -- \
  npm run db:check
```

#### Service Discovery Issues
```bash
# Check services
kubectl get services -n vindex-chain

# Test internal connectivity
kubectl exec -it deployment/blockchain-core -n vindex-chain -- \
  curl http://postgres-service:5432
```

### Log Analysis

```bash
# Real-time log monitoring
kubectl logs -f -l app=blockchain-core -n vindex-chain

# Get logs from multiple pods
kubectl logs -l app=wallet-app -n vindex-chain --tail=100

# Export logs for analysis
kubectl logs deployment/blockchain-core -n vindex-chain > blockchain-logs.txt
```

### Performance Debugging

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n vindex-chain

# Check HPA status
kubectl get hpa -n vindex-chain

# Check ingress controller
kubectl logs -f -n ingress-nginx deployment/ingress-nginx-controller
```

## 📋 Maintenance

### Regular Tasks

1. **Security Updates**: Monthly OS and package updates
2. **SSL Certificates**: Automatic renewal via cert-manager
3. **Database Maintenance**: Weekly backup verification
4. **Log Rotation**: Automated via Kubernetes
5. **Monitoring Review**: Weekly alert and dashboard review

### Backup Strategy

```bash
# Database backup
kubectl exec -t postgres-0 -n vindex-chain -- \
  pg_dump -U vindex vindex_chain > backup.sql

# Persistent volume snapshots
kubectl get pv,pvc -n vindex-chain
```

### Updates and Upgrades

```bash
# Rolling update
kubectl set image deployment/blockchain-core \
  blockchain-core=vindex/blockchain-core:v1.1.0 \
  -n vindex-chain

# Check rollout history
kubectl rollout history deployment/blockchain-core -n vindex-chain

# Rollback if needed
kubectl rollout undo deployment/blockchain-core -n vindex-chain
```

## 🆘 Emergency Procedures

### Service Degradation

1. Check service health: `./scripts/deploy.sh health`
2. Review monitoring dashboards
3. Scale up critical services
4. Enable maintenance mode if needed

### Complete Outage

1. Check cluster status: `kubectl cluster-info`
2. Verify ingress controller: `kubectl get ingress -A`
3. Restart failed services: `kubectl rollout restart deployment/<name>`
4. Activate DR procedures if needed

### Data Recovery

1. Stop write operations
2. Restore from latest backup
3. Verify data integrity
4. Resume operations gradually

## 📞 Support

### Contact Information

- **Development Team**: dev@vindex.io
- **Operations Team**: ops@vindex.io
- **Security Team**: security@vindex.io
- **Emergency**: +1-XXX-XXX-XXXX

### Documentation

- **API Documentation**: https://docs.vindex.io
- **Developer Guide**: https://dev.vindex.io
- **Status Page**: https://status.vindex.io

---

## 📈 Performance Benchmarks

### Expected Performance

- **Transaction Throughput**: 10,000+ TPS
- **Block Time**: 3 seconds
- **API Response Time**: <100ms (95th percentile)
- **Wallet Load Time**: <2 seconds
- **Explorer Query Time**: <500ms

### Load Testing

```bash
# API load test
k6 run tests/performance/api-load-test.js

# Wallet load test
k6 run tests/performance/wallet-load-test.js

# Blockchain stress test
npm run test:stress
```

This deployment guide ensures a robust, scalable, and secure production environment for the Vindex Chain ecosystem.
