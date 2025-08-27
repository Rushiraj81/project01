# ElderCare Connect - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying ElderCare Connect in various environments, from development setups to production deployments at scale.

## Quick Start (Development)

### Prerequisites

- Docker and Docker Compose (v3.8+)
- Node.js 18+ (for local development)
- Git
- At least 4GB RAM and 20GB disk space

### Environment Setup

1. **Clone the repository:**
```bash
git clone https://github.com/eldercare-connect/platform.git
cd platform
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start the development environment:**
```bash
docker-compose up -d
```

4. **Initialize the database:**
```bash
docker-compose exec api npm run prisma:migrate
docker-compose exec api npm run seed
```

5. **Access the applications:**
- Web Dashboard: http://localhost:3000
- API Documentation: http://localhost:4000/docs
- Grafana Monitoring: http://localhost:3001
- Prometheus Metrics: http://localhost:9090

## Environment Variables

### Required Configuration

Create a `.env` file with the following variables:

```bash
# Database Configuration
POSTGRES_PASSWORD=your_secure_postgres_password
REDIS_PASSWORD=your_secure_redis_password
INFLUXDB_PASSWORD=your_secure_influxdb_password
INFLUXDB_TOKEN=your_influxdb_token

# Authentication & Security
JWT_SECRET=your_jwt_secret_256_bits_minimum
NEXTAUTH_SECRET=your_nextauth_secret
ENCRYPTION_KEY=your_encryption_key_256_bits

# IoT Configuration
IOT_GATEWAY_API_KEY=your_iot_gateway_api_key
IOT_ENCRYPTION_KEY=your_iot_encryption_key

# Monitoring
GRAFANA_PASSWORD=your_grafana_admin_password

# Backup Configuration (Production)
BACKUP_S3_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Email Configuration (Production)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password

# SMS Configuration (Production)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone

# Push Notifications (Production)
FCM_SERVER_KEY=your_fcm_server_key
APNS_KEY_ID=your_apns_key_id
APNS_TEAM_ID=your_apns_team_id
```

### Security Considerations

- **Never commit `.env` files to version control**
- Use strong, randomly generated passwords and secrets
- Rotate secrets regularly in production
- Use environment-specific configurations

## Development Deployment

### Local Development Setup

1. **Install dependencies:**
```bash
# Backend
cd backend && npm install

# Web Dashboard
cd ../web-dashboard && npm install

# Mobile App
cd ../mobile-app && npm install
```

2. **Start development servers:**
```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Web Dashboard
cd web-dashboard && npm run dev

# Terminal 3: IoT Gateway
cd iot-sensors && node gateway.js

# Terminal 4: Sensor Simulators
cd iot-sensors/sensors && node wearable-simulator.js
```

### Development Features

- Hot reloading for all services
- Debug logging enabled
- Test data seeding
- Mock external services
- Development-specific error handling

## Production Deployment

### Infrastructure Requirements

**Minimum Production Setup:**
- 2 CPU cores, 8GB RAM, 100GB SSD
- Ubuntu 20.04 LTS or similar
- Docker and Docker Compose
- SSL certificate
- Domain name

**Recommended Production Setup:**
- 4+ CPU cores, 16GB+ RAM, 500GB+ SSD
- Kubernetes cluster (3+ nodes)
- Load balancer
- Managed database services
- CDN for static assets
- Monitoring and alerting

### Production Deployment Steps

#### Option 1: Docker Compose (Single Server)

1. **Prepare the server:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo pip3 install docker-compose
```

2. **Deploy the application:**
```bash
# Clone repository
git clone https://github.com/eldercare-connect/platform.git
cd platform

# Set up production environment
cp .env.production .env
# Edit .env with production values

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker-compose exec api npm run prisma:deploy
```

3. **Set up SSL and domain:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Update nginx configuration
sudo nano /etc/nginx/sites-available/eldercare-connect
```

#### Option 2: Kubernetes Deployment

1. **Prepare Kubernetes manifests:**
```bash
# Apply namespace
kubectl apply -f k8s/namespace.yaml

# Apply secrets
kubectl apply -f k8s/secrets.yaml

# Apply configmaps
kubectl apply -f k8s/configmaps.yaml

# Deploy services
kubectl apply -f k8s/
```

2. **Configure ingress:**
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: eldercare-ingress
  namespace: eldercare
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.eldercare-connect.org
    - app.eldercare-connect.org
    secretName: eldercare-tls
  rules:
  - host: api.eldercare-connect.org
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 4000
  - host: app.eldercare-connect.org
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 3000
```

### Cloud Provider Specific Deployments

#### AWS Deployment

**Using AWS ECS with Fargate:**

1. **Create ECS cluster:**
```bash
aws ecs create-cluster --cluster-name eldercare-connect
```

2. **Deploy with CDK/CloudFormation:**
```typescript
// infrastructure/aws-cdk/lib/eldercare-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

export class ElderCareStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new ec2.Vpc(this, 'ElderCareVPC', {
      maxAzs: 2,
      natGateways: 1,
    });

    // RDS PostgreSQL
    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      credentials: rds.Credentials.fromGeneratedSecret('eldercare'),
      multiAz: true,
      deletionProtection: true,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsights: true,
    });

    // API Service
    const apiTaskDefinition = new ecs.FargateTaskDefinition(this, 'ApiTask', {
      memoryLimitMiB: 2048,
      cpu: 1024,
    });

    apiTaskDefinition.addContainer('api', {
      image: ecs.ContainerImage.fromRegistry('eldercare/api:latest'),
      environment: {
        NODE_ENV: 'production',
        DATABASE_URL: database.instanceEndpoint.socketAddress,
      },
      secrets: {
        JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'eldercare-api',
      }),
      portMappings: [{ containerPort: 4000 }],
    });

    // ECS Service
    new ecs.FargateService(this, 'ApiService', {
      cluster,
      taskDefinition: apiTaskDefinition,
      desiredCount: 2,
      assignPublicIp: false,
    });
  }
}
```

#### Google Cloud Platform

**Using Google Kubernetes Engine (GKE):**

```bash
# Create GKE cluster
gcloud container clusters create eldercare-connect \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10

# Deploy application
kubectl apply -f k8s/gcp/
```

#### Azure Deployment

**Using Azure Container Instances:**

```bash
# Create resource group
az group create --name eldercare-rg --location eastus

# Deploy container group
az container create \
  --resource-group eldercare-rg \
  --file azure-container-instances.yaml
```

## Scaling Considerations

### Horizontal Scaling

**API Services:**
```yaml
# docker-compose.override.yml
version: '3.8'
services:
  api:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

**Database Scaling:**
- Read replicas for analytics queries
- Connection pooling (PgBouncer)
- Partitioning for time-series data

**Cache Scaling:**
- Redis Cluster for high availability
- Separate cache instances for different data types

### Vertical Scaling

**Resource Allocation Guidelines:**
- API: 1-2 CPU cores, 2-4GB RAM per instance
- Database: 2-4 CPU cores, 8-16GB RAM
- Redis: 1 CPU core, 2-4GB RAM
- ML Services: 2-4 CPU cores, 4-8GB RAM

### Performance Optimization

**Application Level:**
- Database query optimization
- API response caching
- Image optimization and CDN
- Gzip compression

**Infrastructure Level:**
- Load balancing
- Auto-scaling policies
- Health checks and circuit breakers
- Monitoring and alerting

## Monitoring and Maintenance

### Health Checks

**Application Health Endpoints:**
```bash
# API Health
curl http://localhost:4000/health

# Database Health
curl http://localhost:4000/health/database

# Redis Health
curl http://localhost:4000/health/redis

# IoT Gateway Health
curl http://localhost:4000/health/iot
```

### Monitoring Setup

**Prometheus Configuration:**
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'eldercare-api'
    static_configs:
      - targets: ['api:4000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'eldercare-iot'
    static_configs:
      - targets: ['iot-gateway:3001']
    metrics_path: '/metrics'
    scrape_interval: 60s
```

**Grafana Dashboards:**
- System metrics (CPU, memory, disk)
- Application metrics (response times, error rates)
- Business metrics (active users, alerts)
- IoT metrics (device status, data rates)

### Backup and Recovery

**Automated Backup Script:**
```bash
#!/bin/bash
# backup/scripts/backup.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/eldercare_$TIMESTAMP"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump -h postgres -U eldercare_user eldercare > $BACKUP_DIR/database.sql

# Backup Redis
redis-cli -h redis --rdb $BACKUP_DIR/redis.rdb

# Backup application data
tar -czf $BACKUP_DIR/app_data.tar.gz /app/uploads

# Upload to S3
aws s3 cp $BACKUP_DIR s3://$BACKUP_S3_BUCKET/backups/ --recursive

# Clean up old backups (keep 30 days)
find /backup -type d -name "eldercare_*" -mtime +30 -exec rm -rf {} \;
```

**Recovery Procedures:**
```bash
# Restore database
psql -h postgres -U eldercare_user eldercare < backup/database.sql

# Restore Redis
redis-cli -h redis --pipe < backup/redis.rdb

# Restore application data
tar -xzf backup/app_data.tar.gz -C /
```

### Log Management

**Centralized Logging with ELK Stack:**
```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logging/logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

## Security Hardening

### Infrastructure Security

**Docker Security:**
```bash
# Run containers as non-root user
USER_ID=$(id -u)
GROUP_ID=$(id -g)

docker-compose run --user $USER_ID:$GROUP_ID api npm run start
```

**Network Security:**
```bash
# Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 5432  # Don't expose database directly
sudo ufw enable
```

**SSL/TLS Configuration:**
```nginx
# nginx/ssl.conf
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
add_header X-Content-Type-Options nosniff;
add_header X-Frame-Options DENY;
add_header X-XSS-Protection "1; mode=block";
```

### Application Security

**API Rate Limiting:**
```javascript
// Rate limiting configuration
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

**Input Validation:**
```javascript
// Using Joi for validation
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])')).required(),
  name: Joi.string().min(2).max(50).required(),
});
```

## Troubleshooting

### Common Issues

**Database Connection Issues:**
```bash
# Check database container
docker-compose logs postgres

# Test connection
docker-compose exec api npx prisma db pull

# Reset database
docker-compose exec api npx prisma migrate reset
```

**IoT Gateway Issues:**
```bash
# Check MQTT broker
docker-compose logs mqtt

# Test MQTT connection
mosquitto_pub -h localhost -t test -m "hello"
mosquitto_sub -h localhost -t test

# Check gateway logs
docker-compose logs iot-gateway
```

**Performance Issues:**
```bash
# Check resource usage
docker stats

# Check API performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4000/health

# Check database performance
docker-compose exec postgres psql -U eldercare_user -d eldercare -c "SELECT * FROM pg_stat_activity;"
```

### Debug Mode

**Enable Debug Logging:**
```bash
# Set environment variables
export DEBUG=eldercare:*
export LOG_LEVEL=debug

# Restart services
docker-compose restart
```

**Access Container Shells:**
```bash
# API container
docker-compose exec api bash

# Database container
docker-compose exec postgres psql -U eldercare_user eldercare

# Redis container
docker-compose exec redis redis-cli
```

This deployment guide provides comprehensive instructions for setting up ElderCare Connect in various environments while maintaining security, scalability, and reliability standards essential for healthcare applications.