FROM ubuntu:22.04

# INstall necessities for lean4 and python3(uv)
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y git curl &&\
    apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Create nd switch to non-root user for security -> steps -> https://stackoverflow.com/questions/27701930/how-to-add-users-to-docker-container
# Name the USER `lean4` coz why not

# Install elan
RUN curl https://elan.lean-lang.org/elan-init.sh -sSf >> elan_init.sh

RUN chmod 777 elan_init.sh && ./elan_init.sh -y

# Export PATH -> sourcing the file never worked regardless of how I tried to
# Maybe a bug in docker? Have to add to PATH manually :/
ENV PATH=/root/.elan/bin:$PATH

# Install lake to manage lean4 projects (elan is like `rustup`, lake is like `cargo`)
RUN lake

# Change to a different working directory
WORKDIR /lean-lsp-mcp

# Install uv
RUN pip install --no-cache-dir uv

COPY . .

# Install dependencies using pyproject.toml
RUN uv venv .venv && \
    uv pip install .

EXPOSE 8000

# Available at http://127.0.0.1:8000/sse
CMD ["/lean-lsp-mcp/.venv/bin/python3", "-m", "lean_lsp_mcp", "--transport", "sse"]