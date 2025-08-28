#!/bin/bash

# Vindex Chain Production Deployment Script
# Automated deployment script for Kubernetes production environment

set -e

# Configuration
NAMESPACE="vindex-chain"
MONITORING_NAMESPACE="vindex-monitoring"
CONTEXT="production"
REGISTRY="ghcr.io/vindexadmin/vindexv3"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if we can connect to the cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    local services=("blockchain-core" "wallet-app" "explorer" "admin-dashboard")
    local git_commit=$(git rev-parse --short HEAD)
    local timestamp=$(date +%Y%m%d-%H%M%S)
    
    for service in "${services[@]}"; do
        log_info "Building $service..."
        
        # Build image
        docker build -t "${REGISTRY}/${service}:${git_commit}" \
                    -t "${REGISTRY}/${service}:${timestamp}" \
                    -t "${REGISTRY}/${service}:latest" \
                    --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                    --build-arg GIT_COMMIT="${git_commit}" \
                    "./packages/${service}/"
        
        # Push images
        log_info "Pushing $service images..."
        docker push "${REGISTRY}/${service}:${git_commit}"
        docker push "${REGISTRY}/${service}:${timestamp}"
        docker push "${REGISTRY}/${service}:latest"
        
        log_success "$service image built and pushed successfully"
    done
}

# Deploy monitoring stack
deploy_monitoring() {
    log_info "Deploying monitoring stack..."
    
    # Create monitoring namespace if it doesn't exist
    kubectl create namespace ${MONITORING_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy monitoring components
    kubectl apply -f k8s/monitoring.yaml
    
    # Wait for Prometheus to be ready
    log_info "Waiting for Prometheus to be ready..."
    kubectl rollout status deployment/prometheus -n ${MONITORING_NAMESPACE} --timeout=300s
    
    # Wait for Grafana to be ready
    log_info "Waiting for Grafana to be ready..."
    kubectl rollout status deployment/grafana -n ${MONITORING_NAMESPACE} --timeout=300s
    
    log_success "Monitoring stack deployed successfully"
}

# Deploy application
deploy_application() {
    log_info "Deploying Vindex Chain application..."
    
    # Create namespace if it doesn't exist
    kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply Kubernetes manifests
    kubectl apply -f k8s/production.yaml
    
    # Wait for database to be ready
    log_info "Waiting for PostgreSQL to be ready..."
    kubectl rollout status statefulset/postgres -n ${NAMESPACE} --timeout=300s
    
    # Wait for Redis to be ready
    log_info "Waiting for Redis to be ready..."
    kubectl rollout status deployment/redis -n ${NAMESPACE} --timeout=300s
    
    # Wait for blockchain core to be ready
    log_info "Waiting for Blockchain Core to be ready..."
    kubectl rollout status deployment/blockchain-core -n ${NAMESPACE} --timeout=600s
    
    # Wait for wallet app to be ready
    log_info "Waiting for Wallet App to be ready..."
    kubectl rollout status deployment/wallet-app -n ${NAMESPACE} --timeout=300s
    
    # Wait for explorer to be ready
    log_info "Waiting for Explorer to be ready..."
    kubectl rollout status deployment/explorer -n ${NAMESPACE} --timeout=300s
    
    # Wait for admin dashboard to be ready
    log_info "Waiting for Admin Dashboard to be ready..."
    kubectl rollout status deployment/admin-dashboard -n ${NAMESPACE} --timeout=300s
    
    log_success "Application deployed successfully"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Get the external IPs/URLs
    local wallet_url="https://wallet.vindex.io"
    local explorer_url="https://explorer.vindex.io"
    local admin_url="https://admin.vindex.io"
    local api_url="https://api.vindex.io"
    
    # Wait a bit for services to stabilize
    sleep 60
    
    # Check wallet app
    log_info "Checking Wallet App health..."
    if curl -f -s "${wallet_url}/api/health" > /dev/null; then
        log_success "Wallet App is healthy"
    else
        log_error "Wallet App health check failed"
        return 1
    fi
    
    # Check explorer
    log_info "Checking Explorer health..."
    if curl -f -s "${explorer_url}/api/health" > /dev/null; then
        log_success "Explorer is healthy"
    else
        log_error "Explorer health check failed"
        return 1
    fi
    
    # Check API
    log_info "Checking API health..."
    if curl -f -s "${api_url}/api/health" > /dev/null; then
        log_success "API is healthy"
    else
        log_error "API health check failed"
        return 1
    fi
    
    # Check admin dashboard
    log_info "Checking Admin Dashboard health..."
    if curl -f -s "${admin_url}/api/health" > /dev/null; then
        log_success "Admin Dashboard is healthy"
    else
        log_warning "Admin Dashboard health check failed (this may be expected if access is restricted)"
    fi
    
    log_success "All health checks passed"
}

# Display deployment status
show_status() {
    log_info "Deployment Status:"
    echo
    
    # Show pods status
    echo "=== Pods Status ==="
    kubectl get pods -n ${NAMESPACE} -o wide
    echo
    
    # Show services status
    echo "=== Services Status ==="
    kubectl get services -n ${NAMESPACE}
    echo
    
    # Show ingress status
    echo "=== Ingress Status ==="
    kubectl get ingress -n ${NAMESPACE}
    echo
    
    # Show monitoring status
    echo "=== Monitoring Status ==="
    kubectl get pods -n ${MONITORING_NAMESPACE}
    echo
    
    log_info "Deployment URLs:"
    echo "  • Wallet App: https://wallet.vindex.io"
    echo "  • Explorer: https://explorer.vindex.io"
    echo "  • Admin Panel: https://admin.vindex.io"
    echo "  • API: https://api.vindex.io"
    echo "  • Monitoring: https://monitoring.vindex.io"
    echo "  • Alerts: https://alerts.vindex.io"
}

# Rollback function
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    # Rollback each deployment
    kubectl rollout undo deployment/blockchain-core -n ${NAMESPACE}
    kubectl rollout undo deployment/wallet-app -n ${NAMESPACE}
    kubectl rollout undo deployment/explorer -n ${NAMESPACE}
    kubectl rollout undo deployment/admin-dashboard -n ${NAMESPACE}
    
    # Wait for rollback to complete
    kubectl rollout status deployment/blockchain-core -n ${NAMESPACE} --timeout=300s
    kubectl rollout status deployment/wallet-app -n ${NAMESPACE} --timeout=300s
    kubectl rollout status deployment/explorer -n ${NAMESPACE} --timeout=300s
    kubectl rollout status deployment/admin-dashboard -n ${NAMESPACE} --timeout=300s
    
    log_success "Rollback completed"
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "Deployment failed! Cleaning up..."
        # Optionally rollback or cleanup resources
        # rollback_deployment
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment function
main() {
    local mode=${1:-"full"}
    
    log_info "Starting Vindex Chain deployment (mode: $mode)..."
    
    case $mode in
        "check")
            check_prerequisites
            ;;
        "build")
            check_prerequisites
            build_and_push_images
            ;;
        "monitoring")
            check_prerequisites
            deploy_monitoring
            ;;
        "app")
            check_prerequisites
            deploy_application
            run_health_checks
            show_status
            ;;
        "health")
            run_health_checks
            ;;
        "status")
            show_status
            ;;
        "rollback")
            rollback_deployment
            ;;
        "full"|*)
            check_prerequisites
            build_and_push_images
            deploy_monitoring
            deploy_application
            run_health_checks
            show_status
            ;;
    esac
    
    log_success "Deployment completed successfully!"
}

# Show usage
usage() {
    echo "Usage: $0 [mode]"
    echo
    echo "Modes:"
    echo "  full       - Complete deployment (default)"
    echo "  check      - Check prerequisites only"
    echo "  build      - Build and push images only"
    echo "  monitoring - Deploy monitoring stack only"
    echo "  app        - Deploy application only"
    echo "  health     - Run health checks only"
    echo "  status     - Show deployment status"
    echo "  rollback   - Rollback deployment"
    echo
    echo "Examples:"
    echo "  $0                # Full deployment"
    echo "  $0 build          # Build and push images"
    echo "  $0 monitoring     # Deploy monitoring only"
    echo "  $0 health         # Run health checks"
}

# Check if help is requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function
main "$@"
