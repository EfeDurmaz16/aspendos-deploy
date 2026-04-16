#!/bin/bash
# Yula OS - Initial Server Setup
# Run this ONCE on each new Hetzner CX22 node
# Usage: ssh root@<IP> 'bash -s' < setup-node.sh

set -euo pipefail

echo "=== Yula OS Server Setup ==="

# ============================================
# 1. System updates
# ============================================
apt-get update && apt-get upgrade -y
apt-get install -y curl git ufw fail2ban

# ============================================
# 2. Create deploy user
# ============================================
if ! id "deploy" &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG docker deploy 2>/dev/null || true
    mkdir -p /home/deploy/.ssh
    cp /root/.ssh/authorized_keys /home/deploy/.ssh/
    chown -R deploy:deploy /home/deploy/.ssh
    chmod 700 /home/deploy/.ssh
    chmod 600 /home/deploy/.ssh/authorized_keys
    echo "deploy ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/deploy
fi

# ============================================
# 3. Install Docker
# ============================================
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
    usermod -aG docker deploy
fi

# Install Docker Compose plugin
if ! docker compose version &>/dev/null; then
    apt-get install -y docker-compose-plugin
fi

# ============================================
# 4. Firewall (UFW)
# ============================================
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ============================================
# 5. Fail2ban for SSH protection
# ============================================
systemctl enable fail2ban
systemctl start fail2ban

# ============================================
# 6. Create app directory
# ============================================
mkdir -p /opt/yula
chown deploy:deploy /opt/yula

# ============================================
# 7. Swap (CX22 has 4GB RAM, add 2GB swap)
# ============================================
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# ============================================
# 8. Log rotation for Docker
# ============================================
cat > /etc/docker/daemon.json <<EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    }
}
EOF
systemctl restart docker

echo ""
echo "=== Setup Complete ==="
echo "Deploy user: deploy"
echo "App directory: /opt/yula"
echo "Docker: $(docker --version)"
echo "Firewall: enabled (SSH, HTTP, HTTPS)"
echo ""
echo "Next: Run deploy.sh to deploy the application"
