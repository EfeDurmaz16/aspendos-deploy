# Aspendos Deployment Guide

This document outlines how to set up production deployments for Aspendos. The CI/CD pipeline is configured in `.github/workflows/ci.yml`.

## Current Pipeline

The workflow automatically:
1. **Lint & Type Check** - Verifies code quality on all branches
2. **Build** - Builds both API and Web services
3. **Test** - Runs tests against a test PostgreSQL database
4. **Docker Build & Push** - Builds and pushes Docker images to GitHub Container Registry (GHCR)
5. **Deploy Staging** - Deploys to staging on `develop` branch pushes
6. **Deploy Production** - Deploys to production on `main` branch pushes

## Prerequisites

Before enabling deployments, you need to:

1. Set up a hosting platform (see options below)
2. Add secrets to your GitHub repository
3. Configure environment variables

## Deployment Options

Choose one of the following deployment platforms:

### Option 1: Railway.app (Recommended for Quick Start)

Railway is the easiest option for this tech stack. It supports Node.js, Next.js, PostgreSQL, and automatic deployments from GitHub.

**Setup Steps:**

1. Go to [Railway.app](https://railway.app) and create an account
2. Create a new project in Railway
3. Generate an API token: Settings → Account → API Tokens
4. In GitHub repository settings, add this secret:
   - `RAILWAY_API_TOKEN`: Your Railway API token
5. Update `.github/workflows/ci.yml` to use Railway CLI:

```yaml
- name: Deploy API to production
  if: github.ref == 'refs/heads/main'
  run: |
    npm install -g @railway/cli
    railway up \
      --service aspendos-api \
      --environment production \
      --token ${{ secrets.RAILWAY_API_TOKEN }}
```

**Environment Variables in Railway:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: For session management
- `CLERK_API_KEY`: For authentication (from Clerk dashboard)
- `OPENAI_API_KEY`: For AI features
- `AGENTS_URL`: URL to agents service (if running separately)

### Option 2: Vercel (Best for Next.js Frontend)

Deploy the web app to Vercel for automatic scaling and edge functions.

**Setup Steps:**

1. Go to [Vercel](https://vercel.com) and create an account
2. Connect your GitHub repository
3. Create a Vercel token: Settings → Tokens
4. In GitHub repository settings, add this secret:
   - `VERCEL_TOKEN`: Your Vercel API token
5. Update `.github/workflows/ci.yml`:

```yaml
- name: Deploy Web to Vercel
  if: github.ref == 'refs/heads/main'
  run: |
    npm install -g vercel
    vercel deploy \
      --prod \
      --token ${{ secrets.VERCEL_TOKEN }} \
      --yes
```

**Environment Variables in Vercel:**
- `NEXT_PUBLIC_API_URL`: Your API endpoint (e.g., `https://api.aspendos.app`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public key

### Option 3: Self-Hosted on VPS (AWS, DigitalOcean, Linode)

For full control, deploy to your own VPS.

**Setup Steps:**

1. Provision a server (e.g., DigitalOcean droplet, AWS EC2)
2. Install Docker and Docker Compose
3. Generate SSH key for CI/CD access
4. In GitHub repository settings, add these secrets:
   - `SSH_KEY`: Your private SSH key
   - `PROD_HOST`: Your server hostname or IP
   - `PROD_USER`: SSH username (usually `root`)
5. Update `.github/workflows/ci.yml`:

```yaml
- name: Deploy via SSH
  if: github.ref == 'refs/heads/main'
  env:
    SSH_KEY: ${{ secrets.SSH_KEY }}
    PROD_HOST: ${{ secrets.PROD_HOST }}
    PROD_USER: ${{ secrets.PROD_USER }}
  run: |
    mkdir -p ~/.ssh
    echo "$SSH_KEY" > ~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa
    ssh -o StrictHostKeyChecking=no \
      $PROD_USER@$PROD_HOST \
      "cd /opt/aspendos && docker-compose pull && docker-compose up -d"
```

**Server Setup:**

```bash
# On your VPS
mkdir -p /opt/aspendos
cd /opt/aspendos

# Copy docker-compose.yml from project root
# Configure environment variables in .env

# Start services
docker-compose up -d
```

### Option 4: Kubernetes (Advanced)

For large-scale deployments with auto-scaling.

**Setup Steps:**

1. Set up a Kubernetes cluster (EKS, GKE, DigitalOcean Kubernetes)
2. Create deployment manifests in `k8s/` directory
3. Set up image pull secrets for GHCR
4. In GitHub secrets, add `KUBE_CONFIG` with your kubeconfig
5. Update `.github/workflows/ci.yml`:

```yaml
- name: Deploy to Kubernetes
  if: github.ref == 'refs/heads/main'
  run: |
    echo "${{ secrets.KUBE_CONFIG }}" > kubeconfig.yaml
    export KUBECONFIG=kubeconfig.yaml
    kubectl apply -f k8s/
    kubectl rollout restart deployment/aspendos-api
```

## GitHub Secrets Configuration

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### Required for Any Deployment:
- `NEXT_PUBLIC_API_URL`: Your API endpoint URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public key

### For Railway Deployment:
- `RAILWAY_API_TOKEN`: Railway API token
- `DATABASE_URL`: PostgreSQL connection (optional - Railway can manage)

### For Vercel Deployment:
- `VERCEL_TOKEN`: Vercel API token

### For VPS Deployment:
- `SSH_KEY`: Private SSH key
- `PROD_HOST`: Server hostname/IP
- `PROD_USER`: SSH username

### Optional for Advanced Features:
- `NEXT_PUBLIC_ONESIGNAL_APP_ID`: OneSignal app ID for push notifications
- `OPENAI_API_KEY`: For AI features
- `CLERK_API_KEY`: Clerk secret key
- `JWT_SECRET`: Session JWT secret

## Setting GitHub Environments

GitHub Environments add protection and approval workflows:

1. Go to Settings → Environments
2. Create `staging` and `production` environments
3. For `production`, enable required reviewers
4. Add environment-specific variables

## Testing Deployments

### Test the Docker Build Locally

```bash
# Test API build
cd services/api
docker build -t aspendos-api:test .

# Test Web build
cd apps/web
docker build -t aspendos-web:test .
```

### Test docker-compose Locally

```bash
docker-compose -f docker-compose.yml up

# API should be at http://localhost:8080
# Web should be at http://localhost:3000
```

### Verify Secrets Are Passed

The CI/CD pipeline will fail if required secrets are missing. Check the Actions tab for detailed error messages.

## Monitoring Deployments

1. **GitHub Actions**: View real-time logs in repository → Actions
2. **Deployment Status**: Deployments tab shows deployment history
3. **Platform Logs**:
   - Railway: Dashboard → Project → Logs
   - Vercel: Dashboard → Project → Deployments
   - VPS: SSH in and check `docker ps` / `docker logs`

## Rollback Procedures

### Railway
```bash
railway up --service aspendos-api --version <previous-version>
```

### Vercel
Go to Deployments tab, select previous deployment, click "Promote to Production"

### VPS
```bash
ssh user@host
docker-compose down
docker-compose pull  # Get previous image
docker-compose up -d
```

## Environment-Specific Configuration

### Staging (.env.staging)
```
NODE_ENV=staging
DATABASE_URL=<staging-db>
API_URL=https://api-staging.aspendos.app
CLERK_API_KEY=<staging-clerk-key>
DEBUG=true
```

### Production (.env.production)
```
NODE_ENV=production
DATABASE_URL=<prod-db>
API_URL=https://api.aspendos.app
CLERK_API_KEY=<prod-clerk-key>
DEBUG=false
```

## Scaling Considerations

- **Database**: Consider managed PostgreSQL (Railway, AWS RDS)
- **Static Assets**: Use CDN for Next.js static files
- **API Rate Limiting**: Already configured in code
- **File Storage**: Use cloud storage (AWS S3, Cloudinary) for user uploads
- **Email**: Configure SendGrid or similar for transactional emails

## Security Checklist

- [ ] All secrets are stored in GitHub Secrets (never in code)
- [ ] Environment has approval requirements enabled
- [ ] SSH keys are rotated regularly
- [ ] Database backups are configured
- [ ] HTTPS is enabled for all endpoints
- [ ] CORS is properly configured
- [ ] Rate limiting is in place
- [ ] Database is not publicly accessible
- [ ] Regular security updates for dependencies

## Next Steps

1. Choose your deployment platform
2. Add required GitHub secrets
3. Push to `main` or `develop` branch
4. Monitor the GitHub Actions workflow
5. Verify the deployment in your hosting platform

For questions or issues, refer to the specific platform's documentation or check the CI/CD logs in GitHub Actions.
