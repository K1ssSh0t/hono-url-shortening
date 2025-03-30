FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# Instalar dependencias
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    docker.io

WORKDIR /workspace

# Instalar Bun (si es necesario)
RUN curl -fsSL https://bun.sh/install | bash

CMD ["bash"]
