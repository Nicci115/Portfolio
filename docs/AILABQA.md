• 1. Dockerfile(s)

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/kohya_ss/Dockerfile:1
  - Code:

  # syntax=docker/dockerfile:1
  ARG UID=1000
  ARG VERSION=EDGE
  ARG RELEASE=0

  ########################################
  # Base stage
  ########################################
  FROM docker.io/library/python:3.11-slim-bookworm AS base

  # RUN mount cache for multi-arch: https://github.com/docker/buildx/issues/549#issuecomment-1788297892
  ARG TARGETARCH
  ARG TARGETVARIANT

  WORKDIR /tmp

  ENV NVIDIA_VISIBLE_DEVICES=all
  ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

  # Install CUDA partially
  # https://docs.nvidia.com/cuda/cuda-installation-guide-linux/#debian
  # Installing the complete CUDA Toolkit system-wide usually adds around 8GB to the image size.
  # Since most CUDA packages already installed through pip, there's no need to download the entire toolkit.
  # Therefore, we opt to install only the essential libraries.
  # Here is the package list for your reference: https://developer.download.nvidia.com/compute/cuda/repos/debian12/x86_64

  ADD https://developer.download.nvidia.com/compute/cuda/repos/debian12/x86_64/cuda-keyring_1.1-1_all.deb /tmp/cuda-keyring_x86_64.deb
  RUN --mount=type=cache,id=apt-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/cache/apt \
      --mount=type=cache,id=aptlists-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/lib/apt/lists \
      dpkg -i cuda-keyring_x86_64.deb && \
      rm -f cuda-keyring_x86_64.deb && \
      apt-get update && \
      apt-get install -y --no-install-recommends \
      # !If you experience any related issues, replace the following line with `cuda-12-8` to obtain the complete CUDA package.
      cuda-nvcc-12-8

  ENV PATH="/usr/local/cuda/bin${PATH:+:${PATH}}"
  ENV LD_LIBRARY_PATH=/usr/local/cuda/lib64
  ENV CUDA_VERSION=12.8
  ENV NVIDIA_REQUIRE_CUDA=cuda>=12.8
  ENV CUDA_HOME=/usr/local/cuda

  ########################################
  # Build stage
  ########################################
  FROM base AS build

  # RUN mount cache for multi-arch: https://github.com/docker/buildx/issues/549#issuecomment-1788297892
  ARG TARGETARCH
  ARG TARGETVARIANT

  WORKDIR /app

  # Install uv
  COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

  ENV UV_PROJECT_ENVIRONMENT=/venv
  ENV VIRTUAL_ENV=/venv
  ENV UV_LINK_MODE=copy
  ENV UV_PYTHON_DOWNLOADS=0
  ENV UV_INDEX=https://download.pytorch.org/whl/cu128

  # Install build dependencies
  RUN --mount=type=cache,id=apt-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/cache/apt \
      --mount=type=cache,id=aptlists-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/lib/apt/lists \
      apt-get update && apt-get upgrade -y && \
      apt-get install -y --no-install-recommends python3-launchpadlib git curl

  # Install big dependencies separately for layer caching
  # !Please note that the version restrictions should be the same as pyproject.toml
  # No packages listed should be removed in the next `uv sync` command
  # If this happens, please update the version restrictions or update the uv.lock file
  RUN --mount=type=cache,id=uv-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/root/.cache/uv \
      uv venv --system-site-packages /venv && \
      uv pip install --no-deps \
      # torch (1.0GiB)
      torch==2.7.0+cu128 \
      # triton (149.3MiB)
      triton>=3.1.0 \
      # tensorflow (615.0MiB)
      tensorflow>=2.16.1 \
      # onnxruntime-gpu (215.7MiB)
      onnxruntime-gpu==1.19.2

  # Install dependencies
  RUN --mount=type=cache,id=uv-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/root/.cache/uv \
      --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
      --mount=type=bind,source=uv.lock,target=uv.lock \
      --mount=type=bind,source=sd-scripts,target=sd-scripts,rw \
      uv sync --frozen --no-dev --no-install-project --no-editable

  # Replace pillow with pillow-simd (Only for x86)
  ARG TARGETPLATFORM
  RUN --mount=type=cache,id=apt-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/cache/apt \
      --mount=type=cache,id=aptlists-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/lib/apt/lists \
      if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
      apt-get update && apt-get install -y --no-install-recommends zlib1g-dev libjpeg62-turbo-dev build-essential && \
      uv pip uninstall pillow && \
      CC="cc -mavx2" uv pip install pillow-simd; \
      fi

  ########################################
  # Final stage
  ########################################
  FROM base AS final

  ARG TARGETARCH
  ARG TARGETVARIANT

  WORKDIR /tmp

  # Install runtime dependencies
  RUN --mount=type=cache,id=apt-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/cache/apt \
      --mount=type=cache,id=aptlists-$TARGETARCH$TARGETVARIANT,sharing=locked,target=/var/lib/apt/lists \
      apt-get update && apt-get upgrade -y && \
      apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libjpeg62 libtcl8.6 libtk8.6 libgoogle-perftools-dev dumb-init

  # Fix missing libnvinfer7
  RUN ln -s /usr/lib/x86_64-linux-gnu/libnvinfer.so /usr/lib/x86_64-linux-gnu/libnvinfer.so.7 && \
      ln -s /usr/lib/x86_64-linux-gnu/libnvinfer_plugin.so /usr/lib/x86_64-linux-gnu/libnvinfer_plugin.so.7

  # Create user
  ARG UID
  RUN groupadd -g $UID $UID && \
      useradd -l -u $UID -g $UID -m -s /bin/sh -N $UID

  # Create directories with correct permissions
  RUN install -d -m 775 -o $UID -g 0 /dataset && \
      install -d -m 775 -o $UID -g 0 /licenses && \
      install -d -m 775 -o $UID -g 0 /app && \
      install -d -m 775 -o $UID -g 0 /venv

  # Copy licenses (OpenShift Policy)
  COPY --link --chmod=775 LICENSE.md /licenses/LICENSE.md

  # Copy dependencies and code (and support arbitrary uid for OpenShift best practice)
  COPY --link --chown=$UID:0 --chmod=775 --from=build /venv /venv
  COPY --link --chown=$UID:0 --chmod=775 . /app

  ENV PATH="/venv/bin${PATH:+:${PATH}}"
  ENV PYTHONPATH="/venv/lib/python3.11/site-packages"

  ENV LD_LIBRARY_PATH="/venv/lib/python3.11/site-packages/nvidia/cudnn/lib${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"
  ENV LD_PRELOAD=libtcmalloc.so
  ENV PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python

  # Rich logging
  # https://rich.readthedocs.io/en/stable/console.html#interactive-mode
  ENV FORCE_COLOR="true"
  ENV COLUMNS="100"

  WORKDIR /app

  VOLUME [ "/dataset" ]

  # 7860: Kohya GUI
  EXPOSE 7860

  USER $UID

  STOPSIGNAL SIGINT

  # Use dumb-init as PID 1 to handle signals properly
  ENTRYPOINT ["dumb-init", "--"]
  CMD ["python3", "kohya_gui.py", "--listen", "0.0.0.0", "--server_port", "7860", "--headless", "--noverify"]

  ARG VERSION
  ARG RELEASE
  LABEL name="bmaltais/kohya_ss" \
      vendor="bmaltais" \
      maintainer="bmaltais" \
      # Dockerfile source repository
      url="https://github.com/bmaltais/kohya_ss" \
      version=${VERSION} \
      # This should be a number, incremented with each change
      release=${RELEASE} \
      io.k8s.display-name="kohya_ss" \
      summary="Kohya's GUI: This repository provides a Gradio GUI for Kohya's Stable Diffusion trainers(https://github.com/kohya-ss/sd-scripts)." \
      description="The GUI allows you to set the training parameters and generate and run the required CLI commands to train the model. This is the docker
  image for Kohya's GUI. For more information about this tool, please visit the following website: https://github.com/bmaltais/kohya_ss."

  - Verification note: This is a full model workload Dockerfile with GPU/runtime environment and pinned core ML package installs.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/rife/docker/Dockerfile:1
  - Code:

  FROM python:3.8-slim

  # install deps
  RUN apt-get update && apt-get -y install \
      bash ffmpeg

  # setup RIFE
  WORKDIR /rife
  COPY . .
  RUN pip3 install -r requirements.txt

  ADD docker/inference_img /usr/local/bin/inference_img
  RUN chmod +x /usr/local/bin/inference_img
  ADD docker/inference_video /usr/local/bin/inference_video
  RUN chmod +x /usr/local/bin/inference_video

  # add pre-trained models
  COPY train_log /rife/train_log

  WORKDIR /host
  ENTRYPOINT ["/bin/bash"]

  ENV NVIDIA_DRIVER_CAPABILITIES all

  - Verification note: This is the full Dockerfile used for the RIFE model workload.

  2. Compose configuration

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/kohya_ss/docker-compose.yaml:1
  - Code:

  services:
    kohya-ss-gui:
      container_name: kohya-ss-gui
      image: ghcr.io/bmaltais/kohya-ss-gui:latest
      user: 1000:0
      build:
        context: .
        args:
          - UID=1000
        cache_from:
          - ghcr.io/bmaltais/kohya-ss-gui:cache
        cache_to:
          - type=inline
      ports:
        - 7860:7860
      environment:
        SAFETENSORS_FAST_GPU: 1
        TENSORBOARD_PORT: ${TENSORBOARD_PORT:-6006}
      tmpfs:
        - /tmp
      volumes:
        - /tmp/.X11-unix:/tmp/.X11-unix
        - ./models:/app/models
        - ./dataset:/dataset
        - ./dataset/images:/app/data
        - ./dataset/logs:/app/logs
        - ./dataset/outputs:/app/outputs
        - ./dataset/regularization:/app/regularization
        - ./models:/app/models
        - ./.cache/config:/app/config
        - ./.cache/user:/home/1000/.cache
        - ./.cache/triton:/home/1000/.triton
        - ./.cache/nv:/home/1000/.nv
        - ./.cache/keras:/home/1000/.keras
        - ./.cache/config:/home/1000/.config # For backward compatibility
      deploy:
        resources:
          reservations:
            devices:
              - driver: nvidia
                capabilities: [gpu]
                device_ids: ["all"]

    tensorboard:
      container_name: tensorboard
      image: tensorflow/tensorflow:latest-gpu
      ports:
        # !Please change the port in .env file
        - ${TENSORBOARD_PORT:-6006}:6006
      volumes:
        - ./dataset/logs:/app/logs
      command: tensorboard --logdir=/app/logs --bind_all
      deploy:
        resources:
          reservations:
            devices:
              - driver: nvidia
                capabilities: [gpu]
                device_ids: ["all"]

  - Verification note: This compose file includes services, volumes, environment variables, and GPU device reservation config.

  3. Dependency pinning strategy

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: requirements.lock:1
  - Code:



  - Verification note: The lockfile exists but is empty.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/kohya_ss/requirements_linux_rocm.txt:1
  - Code:

  # Custom index URL for specific packages
  --extra-index-url https://download.pytorch.org/whl/rocm6.3
  --find-links https://repo.radeon.com/rocm/manylinux/rocm-rel-6.4.1

  torch==2.7.1+rocm6.3
  torchvision==0.22.1+rocm6.3

  tensorboard==2.14.1; python_version=='3.11'
  tensorboard==2.16.2; python_version!='3.11'
  tensorflow-rocm==2.14.0.600; python_version=='3.11'
  tensorflow-rocm==2.16.2; python_version!='3.11'

  # no support for python 3.11
  onnxruntime-rocm==1.21.0

  -r requirements.txt

  - Verification note: This file pins ROCm package versions and extends pinned dependency resolution.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/hummingbird_xt/requirements.txt:1
  - Code:

  absl-py==2.3.1
  accelerate==1.9.0
  aiofiles==24.1.0
  aiohappyeyeballs==2.6.1
  aiohttp==3.12.15
  aiosignal==1.4.0
  aiter @ git+https://github.com/ROCm/aiter.git@97007320d4b1d7b882d99af02cad02fbb9957559
  alabaster==1.0.0
  albucore==0.0.24
  albumentations==2.0.8
  amdsmi @ file:///opt/rocm-7.0.0/share/amd_smi
  aniso8601==10.0.1
  annotated-doc==0.0.4
  annotated-types==0.7.0
  antlr4-python3-runtime==4.9.3
  anyio==4.11.0
  apex @ file:///workspace/build/apex-1.9.0a0%2Brocm7.0.0.git4b035815-cp310-cp310-
  linux_x86_64.whl#sha256=34c6e78776bd649e49902fa9fb5c20a044ea134aa608cd594b5042830369ed64
  asciitree==0.3.3
  async-timeout==5.0.1
  attrs==25.3.0
  audioread==3.1.0
  av==13.1.0
  babel==2.17.0
  beautifulsoup4==4.14.2
  bidict==0.23.1
  blinker==1.9.0
  blobfile==3.1.0
  bokeh==3.8.0
  boto3==1.35.42
  botocore==1.35.99
  Brotli==1.1.0
  build==1.3.0
  causal_conv1d @ file:///workspace/causal-conv1d
  certifi==2025.8.3
  cffi==2.0.0
  cfgv==3.4.0
  charset-normalizer==3.4.3
  clang-format==18.1.6
  click==8.3.0
  clip @ git+https://github.com/openai/CLIP.git@dcba3cb2e2827b402d2701e7e1c7d9fed8a20ef1
  cloudpickle==3.1.1
  cmake==3.31.6
  coloredlogs==15.0.1
  commonmark==0.9.1
  contourpy==1.3.2
  coverage==7.10.7
  cryptography==46.0.3
  cssselect2==0.8.0
  cxxfilt==0.3.0
  cycler==0.12.1
  dashscope==1.25.1
  dask==2025.9.1
  datasets==4.1.1
  decorator==5.2.1
  decord==0.6.0
  diffusers==0.35.0
  dill==0.4.0
  distlib==0.4.0
  distributed==2025.9.1
  docstring_parser==0.17.0
  docutils==0.21.2
  dominate==2.9.1
  easydict==1.13
  einops==0.8.1
  exceptiongroup==1.3.0
  fastapi==0.121.2
  fasteners==0.20
  ffmpy==1.0.0
  filelock==3.19.1
  flash_attn==2.8.3
  Flask==3.1.2
  Flask-RESTful==0.3.10
  Flask-SocketIO==5.5.1
  flatbuffers==25.9.23
  flatten-dict==0.4.2
  fonttools==4.60.0
  frozenlist==1.7.0
  fsspec==2025.9.0
  ftfy==6.3.1
  func_timeout==4.3.5
  gitdb==4.0.12
  GitPython==3.1.45
  gradio==5.49.1
  gradio_client==1.13.3
  groovy==0.1.2
  grouped_gemm @ file:///workspace/grouped_gemm
  grpcio==1.75.1
  h11==0.16.0
  hf-xet==1.1.10
  hf_transfer==0.1.9
  hip-python==6.4.1.552.39
  hipify_torch @ git+https://github.com/ROCm/hipify_torch.git@12ac3f401261ffa331a4000626a333727f06a0d8
  httpcore==1.0.9
  httpx==0.28.1
  huggingface-hub==0.35.1
  humanfriendly==10.0
  hydra-core==1.3.2
  identify==2.6.14
  idna==3.10
  ImageIO==2.37.2
  imageio-ffmpeg==0.6.0
  imagesize==1.4.1
  importlib_metadata==8.7.0
  iniconfig==2.1.0
  inquirerpy==0.3.4
  itsdangerous==2.2.0
  Jinja2==3.1.6
  jmespath==1.0.1
  joblib==1.5.2
  kagglehub==0.3.13
  kiwisolver==1.4.9
  lazy_loader==0.4
  librosa==0.11.0
  lit==18.1.8
  llvmlite==0.45.1
  lmdb==1.7.5
  locket==1.0.0
  loguru==0.7.3
  lxml==6.0.2
  lz4==4.4.4
  Markdown==3.9
  markdown-it-py==4.0.0
  markdown2==2.5.4
  MarkupSafe==3.0.2
  matplotlib==3.10.6
  mdurl==0.1.2
  ml_dtypes==0.5.4
  mpmath==1.3.0
  msgpack==1.1.1
  multidict==6.6.4
  multiprocess==0.70.16
  narwhals==2.5.0
  networkx==3.4.2
  ninja==1.11.1.3
  nltk==3.9.1
  nodeenv==1.9.1
  numba==0.62.1
  numcodecs==0.13.1
  numpy==2.2.6
  nvidia-ml-py==13.580.82
  nvidia-modelopt==0.27.1
  nvidia-modelopt-core==0.27.1
  omegaconf==2.3.0
  onnx==1.19.1
  onnx-ir==0.1.12
  onnxconverter-common==1.16.0
  onnxruntime==1.23.2
  onnxscript==0.5.6
  open_clip_torch==3.2.0
  opencv-python==4.12.0.88
  opencv-python-headless==4.12.0.88
  optree==0.17.0
  orjson==3.11.3
  packaging==25.0
  pandas==2.3.2
  partd==1.4.2
  peft==0.17.1
  pfzy==0.3.4
  pillow==11.3.0
  platformdirs==4.4.0
  pluggy==1.6.0
  pooch==1.8.2
  pre_commit==4.3.0
  primus_turbo @ file:///workspace/Primus-Turbo
  prompt_toolkit==3.0.52
  propcache==0.3.2
  protobuf==6.32.1
  psutil==7.1.0
  PuLP==3.3.0
  pyarrow==21.0.0
  pybind11==2.13.6
  pycocotools==2.0.10
  pycparser==2.23
  pycryptodomex==3.23.0
  pydantic==2.10.6
  pydantic_core==2.27.2
  pydub==0.25.1
  pydyf==0.11.0
  Pygments==2.19.2
  pynvml==13.0.1
  pyparsing==3.2.5
  pyphen==0.17.2
  pyproject_hooks==1.2.0
  pytest==8.4.2
  pytest-cov==7.0.0
  pytest-csv==3.0.0
  pytest-mock==3.15.1
  pytest-random-order==1.2.0
  python-dateutil==2.9.0.post0
  python-dotenv==1.0.1
  python-engineio==4.12.3
  python-multipart==0.0.20
  python-socketio==5.14.3
  pytorch-triton-rocm @ file:///pytorch_triton_rocm-3.2.0%2Brocm7.0.0.git20943800-cp310-cp310-
  linux_x86_64.whl#sha256=3787f05ffae02e45db890513b1a4c7402b2389c43e6f8dd63275de0ec8a20c00
  pytz==2025.2
  PyYAML==6.0.3
  recommonmark==0.7.1
  regex==2025.9.18
  requests==2.32.5
  rich==14.1.0
  ruff==0.14.5
  s3transfer==0.10.4
  safehttpx==0.1.7
  safetensors==0.6.2
  scikit-image==0.25.2
  scikit-learn==1.7.2
  scipy==1.15.3
  semantic-version==2.10.0
  sentence-transformers==5.2.0
  sentencepiece==0.2.1
  sentry-sdk==2.39.0
  shellingham==1.5.4
  shtab==1.7.2
  simple-websocket==1.1.0
  simplejson==3.20.2
  simsimd==6.5.3
  six==1.17.0
  smmap==5.0.2
  sniffio==1.3.1
  snowballstemmer==3.0.1
  sortedcontainers==2.4.0
  soundfile==0.13.1
  soupsieve==2.8
  soxr==1.0.0
  Sphinx==8.1.3
  sphinx-rtd-theme==3.0.2
  sphinxcontrib-applehelp==2.0.0
  sphinxcontrib-devhelp==2.0.0
  sphinxcontrib-htmlhelp==2.1.0
  sphinxcontrib-jquery==4.1
  sphinxcontrib-jsmath==1.0.1
  sphinxcontrib-qthelp==2.0.0
  sphinxcontrib-serializinghtml==2.0.0
  starlette==0.49.3
  stringzilla==4.2.3
  sympy==1.14.0
  tabulate==0.9.0
  tblib==3.1.0
  tensorboard==2.20.0
  tensorboard-data-server==0.7.2
  tensorstore==0.1.45
  threadpoolctl==3.6.0
  tifffile==2025.5.10
  tiktoken==0.11.0
  timm==1.0.22
  tinycss2==1.4.0
  tinyhtml5==2.0.0
  tokenizers==0.21.4
  tomesd==0.1.3
  tomli==2.2.1
  tomlkit==0.13.3
  toolz==1.0.0
  torch @ file:///workspace/build/torch-2.9.0.dev20250821%2Brocm7.0.0.lw.git125803b7-cp310-cp310-
  linux_x86_64.whl#sha256=acab3b73cbed252fa9a561efef45ae39d95bd96d435b2eed6b9c6469b31cd85a
  torchao @ file:///workspace/ao
  torchaudio @ file:///workspace/build/torchaudio-2.8.0%2Brocm7.0.0.git0c223473-cp310-cp310-
  linux_x86_64.whl#sha256=96a78ebcc8062af30ccdb00aa4b3d1bbf087a77958e3c22a3efaeeace5049492
  torchdata==0.11.0
  torchdiffeq==0.2.5
  torchprofile==0.0.4
  torchsde==0.2.6
  -e git+https://github.com/AMD-AIG-AIMA/torchtitan.git@04227ff1d8e6f78a2db3a91ef4f55d4686733a2e#egg=torchtitan
  -e git+https://github.com/pytorch/torchtune.git@b4c98ac2a37f0397d64c22579aed415ce7264db6#egg=torchtune
  torchvision @ file:///workspace/build/torchvision-0.24.0%2Brocm7.0.0.git98f8b375-cp310-cp310-
  linux_x86_64.whl#sha256=4632280c7fc10b253dae78e9a88af74378fedc044c86ff883f559bb69d15a1c6
  tornado==6.5.2
  tqdm==4.67.1
  trampoline==0.1.2
  transformer_engine @ file:///workspace/TransformerEngine
  transformers==4.55.0
  triton @ file:///workspace/triton
  trl==0.21.0
  typeguard==4.4.4
  typer==0.20.0
  typing-inspection==0.4.1
  typing_extensions==4.15.0
  tyro==0.9.32
  tzdata==2025.2
  ujson==5.11.0
  urllib3==2.5.0
  uvicorn==0.38.0
  virtualenv==20.34.0
  wandb==0.22.0
  wcwidth==0.2.14
  weasyprint==66.0
  webencodings==0.5.1
  websocket-client==1.9.0
  websockets==15.0.1
  Werkzeug==3.1.3
  wrapt==1.17.3
  wsproto==1.3.1
  xarray==2025.3.0
  xxhash==3.5.0
  xyzservices==2025.4.0
  yappi==1.6.10
  yarl==1.20.1
  zarr==2.18.3
  zict==3.0.0
  zipp==3.23.0
  zopfli==0.2.3.post1

  - Verification note: This file is fully pinned with fixed versions and explicit ROCm-linked wheel references.

  4. Model orchestration script

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: scripts/run_demo.sh:1
  - Code:

  #!/usr/bin/env bash
  set -euo pipefail
  export FVP_RUN_ID="run_20260122_170000_ab12"
  cd /home/dom/fashion_video_pipeline
  micromamba run -n fashion_video_env fashion doctor
  micromamba run -n fashion_video_env fashion prepare-assets
  micromamba run -n fashion_video_env fashion apply-garment --human assets/humans/prepared/human_prepared_human_run_20260122_170000_ab12.png --garment
  assets/garments/prepared/garment_front_hoodie_front.png --mode dci_vton
  micromamba run -n fashion_video_env fashion render-scene --scene studio_turntable --duration-seconds 60 --fps 24 --resolution 1920x1080 --garment-front
  assets/garments/prepared/garment_front_hoodie_front.png --garment-back assets/garments/prepared/garment_back_hoodie_back.png
  micromamba run -n fashion_video_env fashion enhance-video --input blender/renders/run_20260122_170000_ab12/
  render_studio_turntable_run_20260122_170000_ab12.mp4 --profile strict
  micromamba run -n fashion_video_env fashion export --input realism/outputs/run_20260122_170000_ab12/enhanced_strict_run_20260122_170000_ab12.mp4 --preset
  social_9x16
  echo "DEMO COMPLETE"

  - Verification note: This script coordinates the end-to-end model execution pipeline through CLI steps.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/core/ai_ops.py:1
  - Code:

  """AI ops."""

  from pathlib import Path
  import json
  import shutil
  import subprocess
  from PIL import Image
  import numpy as np
  from cli.core.image_ops import save_mask_png
  from cli.core.paths import root


  def run_dci_vton(human_png: Path, garment_png: Path, garment_mask: Path, out_dir: Path, profile: str) -> Path:
      # DCI-VTON expects a VITON-like dataroot; we create a minimal structure to avoid extra dependencies.
      dataroot = root() / "tryon" / "engine" / "dci_vton_data"
      test_dir = dataroot / "test"
      for p in [
          test_dir / "image",
          test_dir / "cloth",
          test_dir / "cloth-mask",
          test_dir / "cloth-warp",
          test_dir / "cloth-warp-mask",
          test_dir / "unpaired-cloth-warp",
          test_dir / "unpaired-cloth-warp-mask",
          test_dir / "image-parse-v3",
          test_dir / "image-parse-agnostic-v3.2",
          test_dir / "openpose_json",
      ]:
          p.mkdir(parents=True, exist_ok=True)

      name = "000001_00"
      img_jpg = test_dir / "image" / f"{name}.jpg"
      cloth_jpg = test_dir / "cloth" / f"{name}.jpg"
      cloth_mask_jpg = test_dir / "cloth-mask" / f"{name}.jpg"

      Image.open(human_png).convert("RGB").save(img_jpg)
      Image.open(garment_png).convert("RGB").save(cloth_jpg)
      Image.open(garment_mask).convert("L").save(cloth_mask_jpg)

      # Provide warp and unpaired warp as the same cloth for minimal runnable pipeline.
      for d in ["cloth-warp", "cloth-warp-mask", "unpaired-cloth-warp", "unpaired-cloth-warp-mask"]:
          shutil.copy2(cloth_jpg, test_dir / d / f"{name}.jpg")
          shutil.copy2(cloth_mask_jpg, test_dir / d / f"{name}.jpg")

      # Create minimal parse maps: label 3 for garment, 0 elsewhere.
      parse = np.zeros((512, 512), dtype=np.uint8)
      gmask = np.array(Image.open(garment_mask).resize((512, 512))) > 0
      parse[gmask] = 3
      Image.fromarray(parse).save(test_dir / "image-parse-v3" / f"{name}.png")
      Image.fromarray(parse).save(test_dir / "image-parse-agnostic-v3.2" / f"{name}.png")

      # Create dummy openpose JSON with zeros (keeps pipeline runnable without OpenPose).
      pose = {"people": [{"pose_keypoints_2d": [0.0] * 54}]}
      with (test_dir / "openpose_json" / f"{name}_keypoints.json").open("w") as f:
          json.dump(pose, f)

      (dataroot / "test_pairs.txt").write_text(f"{name}.jpg {name}.jpg\n")

      steps = 50 if profile in ["strict", "balanced"] else 30
      scale = 1.0 if profile in ["strict", "balanced"] else 0.8

      cmd = [
          "python", "/home/dom/fashion_video_pipeline/third_party/dci_vton/test.py",
          "--plms", "--gpu_id", "0",
          "--ddim_steps", str(steps),
          "--outdir", str(out_dir),
          "--config", "/home/dom/fashion_video_pipeline/third_party/dci_vton/configs/viton512.yaml",
          "--ckpt", "/home/dom/fashion_video_pipeline/tryon/engine/weights/viton512.ckpt",
          "--dataroot", str(dataroot),
          "--n_samples", "1",
          "--seed", "555",
          "--scale", str(scale),
          "--H", "512",
          "--W", "512",
      ]
      subprocess.run(cmd, check=True)

      result = out_dir / "result" / f"{name}.png"
      return result


  def run_hummingbird_xt(input_video: str, output_video: str, steps: int, strength: float) -> None:
      # Hummingbird-XT scripts are heavy; we attempt and fall back if they fail.
      cmd = [
          "python", "/home/dom/fashion_video_pipeline/third_party/hummingbird_xt/infer/examples/wan2.2/predict_ti2v_single.py",
          "--input_video", input_video,
          "--output_video", output_video,
          "--steps", str(steps),
          "--strength", str(strength),
      ]
      subprocess.run(cmd, check=True)


  def run_ffmpeg_fallback(input_video: str, output_video: str) -> None:
      # Fallback is deterministic and preserves geometry while improving contrast.
      subprocess.run([
          "ffmpeg", "-y", "-i", input_video,
          "-vf", "eq=contrast=1.1:saturation=1.05:brightness=0.02,unsharp=3:3:0.5:3:3:0.0",
          "-c:v", "libx264", "-crf", "18", "-preset", "slow",
          output_video,
      ], check=True)

  - Verification note: This module contains model execution command construction and subprocess invocation logic.

  5. Environment reproducibility documentation

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: scripts/run_demo.sh:1
  - Code:

  #!/usr/bin/env bash
  set -euo pipefail
  export FVP_RUN_ID="run_20260122_170000_ab12"
  cd /home/dom/fashion_video_pipeline
  micromamba run -n fashion_video_env fashion doctor
  micromamba run -n fashion_video_env fashion prepare-assets
  micromamba run -n fashion_video_env fashion apply-garment --human assets/humans/prepared/human_prepared_human_run_20260122_170000_ab12.png --garment
  assets/garments/prepared/garment_front_hoodie_front.png --mode dci_vton
  micromamba run -n fashion_video_env fashion render-scene --scene studio_turntable --duration-seconds 60 --fps 24 --resolution 1920x1080 --garment-front
  assets/garments/prepared/garment_front_hoodie_front.png --garment-back assets/garments/prepared/garment_back_hoodie_back.png
  micromamba run -n fashion_video_env fashion enhance-video --input blender/renders/run_20260122_170000_ab12/
  render_studio_turntable_run_20260122_170000_ab12.mp4 --profile strict
  micromamba run -n fashion_video_env fashion export --input realism/outputs/run_20260122_170000_ab12/enhanced_strict_run_20260122_170000_ab12.mp4 --preset
  social_9x16
  echo "DEMO COMPLETE"

  - Verification note: This bootstrap script encodes a deterministic run-id and fixed command sequence for local recreation.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: README.md:1
  - Code:



  - Verification note: Top-level reproducibility documentation file exists but is empty.

  6. ROCm configuration handling

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/commands/doctor.py:1
  - Code:

  """Doctor command.

  Checks WSL, ROCm, Blender, and ffmpeg availability.
  """

  import sys
  from pathlib import Path
  import subprocess
  import torch
  from cli.core import wsl


  def run() -> None:
      if not wsl.has_dxg():
          print("FAIL: /dev/dxg")
          sys.exit(1)

      if not torch.__version__.startswith("2.6.0+rocm6.4.2"):
          print("FAIL: ROCm userland")
          sys.exit(1)

      blender = Path("/home/dom/fashion_video_pipeline/blender/project_template/tools/blender-3.6.23-linux-x64/blender")
      if not blender.exists():
          print("FAIL: Blender")
          sys.exit(1)

      try:
          subprocess.check_output(["ffmpeg", "-version"])
      except Exception:
          print("FAIL: ffmpeg")
          sys.exit(1)

      print("PASS: WSL2")
      print("PASS: /dev/dxg")
      print("PASS: ROCm userland")
      print("PASS: Blender")
      print("PASS: ffmpeg")
      print("Ready to run: yes")

  - Verification note: This performs host checks and explicit ROCm userland version gating.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/kohya_ss/requirements_linux_rocm.txt:1
  - Code:

  # Custom index URL for specific packages
  --extra-index-url https://download.pytorch.org/whl/rocm6.3
  --find-links https://repo.radeon.com/rocm/manylinux/rocm-rel-6.4.1

  torch==2.7.1+rocm6.3
  torchvision==0.22.1+rocm6.3

  tensorboard==2.14.1; python_version=='3.11'
  tensorboard==2.16.2; python_version!='3.11'
  tensorflow-rocm==2.14.0.600; python_version=='3.11'
  tensorflow-rocm==2.16.2; python_version!='3.11'

  # no support for python 3.11
  onnxruntime-rocm==1.21.0

  -r requirements.txt

  - Verification note: This file pins ROCm-specific frameworks and wheel sources.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/hummingbird_xt/README.md:353
  - Code:

  ### Option 2: Docker
  You can download our pre-built Docker image for better reproducibility:
  ```bash
  docker pull panisobe/dmd_flash_image_2:latest

  You can use docker run to run the image. For example:

  docker run -it \
    --shm-size=900g \
    --name hm \
    --network host \
    --ipc=host \
    --cap-add=SYS_PTRACE \
    --security-opt seccomp=unconfined \
    --device=/dev/kfd \
    --device=/dev/dri \
    --group-add video \
    -e HSA_OVERRIDE_GFX_VERSION=11.0.0 \
    -v /home:/home \
    panisobe/dmd_flash_image_2_release:latest

  - Verification note: This includes ROCm device passthrough and ROCm env var handling in a concrete container launch command.

  7) CLI orchestration layer
  - Commit: NOT FOUND (`git rev-parse HEAD` returned no commit on branch)
  - File: `pyproject.toml:1`
  - Code:
  ```toml
  [project]
  name = "fashion_video_pipeline"
  version = "0.1.0"
  requires-python = ">=3.10"

  [project.scripts]
  fashion = "cli.main:app"

  [tool.setuptools]
  packages = ["cli", "cli.commands", "cli.core"]

  - Verification note: This defines the CLI entrypoint routing to cli.main:app.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/main.py:1
  - Code:

  """CLI entrypoint."""

  import typer

  from cli.commands import (
      doctor,
      prepare_assets,
      train_identity,
      generate_still,
      apply_tryon,
      render_blender,
      enhance_video,
      assemble_long_video,
      export,
  )

  app = typer.Typer(add_completion=False)


  @app.callback()
  def main() -> None:
      """Fashion video pipeline CLI."""
      return None


  app.command("doctor")(doctor.run)
  app.command("prepare-assets")(prepare_assets.run)
  app.command("train-identity")(train_identity.run)
  app.command("generate-still")(generate_still.run)
  app.command("apply-garment")(apply_tryon.run)
  app.command("render-scene")(render_blender.run)
  app.command("enhance-video")(enhance_video.run)
  app.command("assemble-long-video")(assemble_long_video.run)
  app.command("export")(export.run)


  if __name__ == "__main__":
      app()

  - Verification note: This is the task-routing layer mapping command names to runnable handlers.

  8. Local LLM integration example

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: NOT FOUND
  - Code:

  NOT FOUND
  Search command used:
  grep -RInF --exclude-dir=.git --exclude-dir=.cache --exclude-dir=.micromamba --exclude-dir=__pycache__ "ollama" cli scripts third_party pyproject.toml
  README.md 2>/dev/null || true
  grep -RInF --exclude-dir=.git --exclude-dir=.cache --exclude-dir=.micromamba --exclude-dir=__pycache__ "llama.cpp" cli scripts third_party pyproject.toml
  README.md 2>/dev/null || true
  grep -RInF --exclude-dir=.git --exclude-dir=.cache --exclude-dir=.micromamba --exclude-dir=__pycache__ "vllm" cli scripts third_party pyproject.toml
  README.md 2>/dev/null || true
  grep -RInF --exclude-dir=.git --exclude-dir=.cache --exclude-dir=.micromamba --exclude-dir=__pycache__ "text-generation-inference" cli scripts third_party
  pyproject.toml README.md 2>/dev/null || true

  - Verification note: No local-LLM invocation path was found in searched first-party and third-party repo code/docs.

  9. Model environment isolation

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: third_party/kohya_ss/docker-compose.yaml:1
  - Code:

  services:
    kohya-ss-gui:
      container_name: kohya-ss-gui
      image: ghcr.io/bmaltais/kohya-ss-gui:latest
      user: 1000:0
      build:
        context: .
        args:
          - UID=1000
        cache_from:
          - ghcr.io/bmaltais/kohya-ss-gui:cache
        cache_to:
          - type=inline
      ports:
        - 7860:7860
      environment:
        SAFETENSORS_FAST_GPU: 1
        TENSORBOARD_PORT: ${TENSORBOARD_PORT:-6006}
      tmpfs:
        - /tmp
      volumes:
        - /tmp/.X11-unix:/tmp/.X11-unix
        - ./models:/app/models
        - ./dataset:/dataset
        - ./dataset/images:/app/data
        - ./dataset/logs:/app/logs
        - ./dataset/outputs:/app/outputs
        - ./dataset/regularization:/app/regularization
        - ./models:/app/models
        - ./.cache/config:/app/config
        - ./.cache/user:/home/1000/.cache
        - ./.cache/triton:/home/1000/.triton
        - ./.cache/nv:/home/1000/.nv
        - ./.cache/keras:/home/1000/.keras
        - ./.cache/config:/home/1000/.config # For backward compatibility
      deploy:
        resources:
          reservations:
            devices:
              - driver: nvidia
                capabilities: [gpu]
                device_ids: ["all"]

    tensorboard:
      container_name: tensorboard
      image: tensorflow/tensorflow:latest-gpu
      ports:
        # !Please change the port in .env file
        - ${TENSORBOARD_PORT:-6006}:6006
      volumes:
        - ./dataset/logs:/app/logs
      command: tensorboard --logdir=/app/logs --bind_all
      deploy:
        resources:
          reservations:
            devices:
              - driver: nvidia
                capabilities: [gpu]
                device_ids: ["all"]

  - Verification note: This shows isolated container boundaries for GUI and TensorBoard workloads.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: scripts/run_demo.sh:1
  - Code:

  #!/usr/bin/env bash
  set -euo pipefail
  export FVP_RUN_ID="run_20260122_170000_ab12"
  cd /home/dom/fashion_video_pipeline
  micromamba run -n fashion_video_env fashion doctor
  micromamba run -n fashion_video_env fashion prepare-assets
  micromamba run -n fashion_video_env fashion apply-garment --human assets/humans/prepared/human_prepared_human_run_20260122_170000_ab12.png --garment
  assets/garments/prepared/garment_front_hoodie_front.png --mode dci_vton
  micromamba run -n fashion_video_env fashion render-scene --scene studio_turntable --duration-seconds 60 --fps 24 --resolution 1920x1080 --garment-front
  assets/garments/prepared/garment_front_hoodie_front.png --garment-back assets/garments/prepared/garment_back_hoodie_back.png
  micromamba run -n fashion_video_env fashion enhance-video --input blender/renders/run_20260122_170000_ab12/
  render_studio_turntable_run_20260122_170000_ab12.mp4 --profile strict
  micromamba run -n fashion_video_env fashion export --input realism/outputs/run_20260122_170000_ab12/enhanced_strict_run_20260122_170000_ab12.mp4 --preset
  social_9x16
  echo "DEMO COMPLETE"

  - Verification note: This enforces execution inside a named micromamba environment boundary.

  10. Logging/runtime monitoring example

  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/core/logging.py:1
  - Code:

  """Structured CLI logging."""

  from datetime import datetime


  def log(msg: str) -> None:
      ts = datetime.utcnow().isoformat() + "Z"
      print(f"[FVP {ts}] {msg}")

  - Verification note: This emits structured timestamped runtime log lines.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/core/paths.py:1
  - Code:

  """Path helpers."""

  from pathlib import Path
  import os

  DEFAULT_ROOT = Path("/home/dom/fashion_video_pipeline")


  def root() -> Path:
      return Path(os.environ.get("FVP_ROOT", str(DEFAULT_ROOT)))


  def run_id() -> str:
      rid = os.environ.get("FVP_RUN_ID", "")
      if not rid:
          raise RuntimeError("FVP_RUN_ID is required")
      return rid


  def run_dir(kind: str) -> Path:
      p = root() / kind / run_id()
      p.mkdir(parents=True, exist_ok=True)
      return p

  - Verification note: This enforces run identifiers and creates run-scoped output directories.
  - Commit: NOT FOUND (git rev-parse HEAD returned no commit on branch)
  - File: cli/commands/enhance_video.py:1
  - Code:

  """Enhance video.

  Attempts Hummingbird-XT first, then deterministic ffmpeg fallback.
  """

  from pathlib import Path
  import typer
  from cli.core.config import load_profile
  from cli.core.paths import run_dir, run_id
  from cli.core.ai_ops import run_hummingbird_xt, run_ffmpeg_fallback


  def run(input: str = typer.Option(..., "--input"), profile: str = typer.Option("strict", "--profile"), force_fallback: str = typer.Option("", "--force-
  fallback")) -> None:
      cfg = load_profile(profile)
      out_dir = run_dir("realism/outputs")
      out_dir.mkdir(parents=True, exist_ok=True)
      out_path = out_dir / f"enhanced_{profile}_run_{run_id()}.mp4"

      if force_fallback == "ffmpeg_grade":
          # Fallback used when Hummingbird deps or weights are not compatible.
          run_ffmpeg_fallback(input, str(out_path))
          print("Enhancement complete")
          return

      try:
          run_hummingbird_xt(input, str(out_path), cfg["num_inference_steps"], cfg["diffusion_strength"])
      except Exception:
          # Strict fallback preserves geometry when Hummingbird fails.
          run_ffmpeg_fallback(input, str(out_path))
      print("Enhancement complete")

  - Verification note: This embeds run-id in output artifact names and routes runtime behavior through fallback hooks.

  };




### PART 2 QA LOGS

• • - Section: System Identity and Runtime Contract

  - Claim: Project identity is fashion_video_pipeline with a CLI entrypoint named fashion.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: pyproject.toml:1-9
  - Snippet:

  [project]
  name = "fashion_video_pipeline"
  version = "0.1.0"
  requires-python = ">=3.10"

  [project.scripts]
  fashion = "cli.main:app"

  [tool.setuptools]
  packages = ["cli", "cli.commands", "cli.core"]

  - Why this is the artifact: Defines the packaged name and the canonical CLI entrypoint for runtime invocation.
  - Verify commands:
  - nl -ba pyproject.toml
  - rg -n "project\\.scripts|fashion" pyproject.toml

  • - Section: System Identity and Runtime Contract

  - Claim: CLI declares itself as “Fashion video pipeline” and registers the command map.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/main.py:1-38
  - Snippet:

  @app.callback()
  def main() -> None:
      """Fashion video pipeline CLI."""
      return None

  app.command("doctor")(doctor.run)
  app.command("prepare-assets")(prepare_assets.run)
  app.command("train-identity")(train_identity.run)
  app.command("generate-still")(generate_still.run)
  app.command("apply-garment")(apply_tryon.run)
  app.command("render-scene")(render_blender.run)
  app.command("enhance-video")(enhance_video.run)
  app.command("assemble-long-video")(assemble_long_video.run)
  app.command("export")(export.run)

  - Why this is the artifact: This is the runtime command map and identity string used by the CLI entrypoint.
  - Verify commands:
  - nl -ba cli/main.py
  - rg -n "app\\.command|Fashion video pipeline" cli/main.py

  • - Section: System Identity and Runtime Contract

  - Claim: FVP_RUN_ID is a required environment variable; FVP_ROOT is optional with default root.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/paths.py:6-17
  - Snippet:

  DEFAULT_ROOT = Path("/home/dom/fashion_video_pipeline")

  def root() -> Path:
      return Path(os.environ.get("FVP_ROOT", str(DEFAULT_ROOT)))

  def run_id() -> str:
      rid = os.environ.get("FVP_RUN_ID", "")
      if not rid:
          raise RuntimeError("FVP_RUN_ID is required")
      return rid

  - Why this is the artifact: Defines the stable run contract for environment variables and fails fast if FVP_RUN_ID is missing.
  - Verify commands:
  - nl -ba cli/core/paths.py
  - rg -n "FVP_ROOT|FVP_RUN_ID" cli/core/paths.py

  • - Section: System Identity and Runtime Contract

  - Claim: Output directories are run-scoped under root()/kind/run_id() with automatic directory creation.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/paths.py:20-23
  - Snippet:

  def run_dir(kind: str) -> Path:
      p = root() / kind / run_id()
      p.mkdir(parents=True, exist_ok=True)
      return p

  - Why this is the artifact: Defines the output directory contract and idempotent directory creation per run.
  - Verify commands:
  - nl -ba cli/core/paths.py
  - rg -n "run_dir" cli/core/paths.py

  • - Section: System Identity and Runtime Contract

  - Claim: Blender render outputs are named with FVP_RUN_ID and stored under blender/renders/<run_id>.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: blender/scripts/render_headless.py:28-33
  - Snippet:

  run_id = os.environ.get("FVP_RUN_ID", "run")
  out_dir = Path(f"/home/dom/fashion_video_pipeline/blender/renders/{run_id}")
  out_dir.mkdir(parents=True, exist_ok=True)
  out_path = out_dir / f"render_{args.scene}_run_{run_id}.mp4"

  - Why this is the artifact: Demonstrates run-scoped output naming and directory structure for render outputs.
  - Verify commands:
  - nl -ba blender/scripts/render_headless.py
  - rg -n "FVP_RUN_ID|blender/renders" blender/scripts/render_headless.py

  • - Section: Deterministic Orchestration

  - Claim: The canonical demo run sequence is fixed: doctor → prepare-assets → apply-garment → render-scene → enhance-video → export.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: scripts/run_demo.sh:1-11
  - Snippet:

  export FVP_RUN_ID="run_20260122_170000_ab12"
  cd /home/dom/fashion_video_pipeline
  micromamba run -n fashion_video_env fashion doctor
  micromamba run -n fashion_video_env fashion prepare-assets
  micromamba run -n fashion_video_env fashion apply-garment --human assets/humans/prepared/human_prepared_human_run_20260122_170000_ab12.png --garment assets/garments/
  prepared/garment_front_hoodie_front.png --mode dci_vton
  micromamba run -n fashion_video_env fashion render-scene --scene studio_turntable --duration-seconds 60 --fps 24 --resolution 1920x1080 --garment-front assets/garments/
  prepared/garment_front_hoodie_front.png --garment-back assets/garments/prepared/garment_back_hoodie_back.png
  micromamba run -n fashion_video_env fashion enhance-video --input blender/renders/run_20260122_170000_ab12/render_studio_turntable_run_20260122_170000_ab12.mp4 --profile
  strict
  micromamba run -n fashion_video_env fashion export --input realism/outputs/run_20260122_170000_ab12/enhanced_strict_run_20260122_170000_ab12.mp4 --preset social_9x16

  - Why this is the artifact: This is the only explicit end-to-end orchestration sequence in the repository.
  - Verify commands:
  - nl -ba scripts/run_demo.sh
  - rg -n "fashion (doctor|prepare-assets|apply-garment|render-scene|enhance-video|export)" scripts/run_demo.sh

  • - Section: Deterministic Orchestration

  - Claim: DCI-VTON invocation is deterministic via fixed seed, fixed sample count, and fixed naming.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/ai_ops.py:31-75
  - Snippet:

  name = "000001_00"
  ...
  cmd = [
      "python", "/home/dom/fashion_video_pipeline/third_party/dci_vton/test.py",
      "--plms", "--gpu_id", "0",
      "--ddim_steps", str(steps),
      "--outdir", str(out_dir),
      "--config", "/home/dom/fashion_video_pipeline/third_party/dci_vton/configs/viton512.yaml",
      "--ckpt", "/home/dom/fashion_video_pipeline/tryon/engine/weights/viton512.ckpt",
      "--dataroot", str(dataroot),
      "--n_samples", "1",
      "--seed", "555",
      "--scale", str(scale),
      "--H", "512",
      "--W", "512",
  ]

  - Why this is the artifact: Fixed seed and fixed output naming enforce deterministic behavior for the DCI-VTON stage.
  - Verify commands:
  - nl -ba cli/core/ai_ops.py
  - rg -n "seed|n_samples|ddim_steps|viton512" cli/core/ai_ops.py

  • - Section: Deterministic Orchestration

  - Claim: generate-still uses a fixed seed and deterministic rename to a run-scoped filename.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/generate_still.py:19-40
  - Snippet:

  out_path = root() / "assets" / "humans" / "prepared" / f"human_prepared_{identity}_run_{run_id()}.png"
  ...
  "--seed", "555",
  ...
  candidates = sorted(out_path.parent.glob("*.png"))
  if candidates:
      candidates[0].replace(out_path)

  - Why this is the artifact: Fixed seed and deterministic selection enforce repeatability and predictable naming.
  - Verify commands:
  - nl -ba cli/commands/generate_still.py
  - rg -n "seed|run_id|replace" cli/commands/generate_still.py

  • - Section: Deterministic Orchestration

  - Claim: Blender binary and scene script are pinned to absolute paths for reproducible rendering.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/blender_ops.py:6-25
  - Snippet:

  BLENDER_BIN = Path("/home/dom/fashion_video_pipeline/blender/project_template/tools/blender-3.6.23-linux-x64/blender")
  ...
  cmd = [
      str(BLENDER_BIN), "-b",
      "/home/dom/fashion_video_pipeline/blender/project_template/scene_template.blend",
      "-P", "/home/dom/fashion_video_pipeline/blender/scripts/render_headless.py",

  - Why this is the artifact: Absolute paths fix binary and scene locations, preventing ambient PATH variation.
  - Verify commands:
  - nl -ba cli/core/blender_ops.py
  - rg -n "blender-3\\.6\\.23|scene_template|render_headless" cli/core/blender_ops.py

  • - Section: Deterministic Orchestration

  - Claim: Render output is deterministic by using fixed FPS, resolution, and frame count derived from duration.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: blender/scripts/render_headless.py:16-39
  - Snippet:

  scene.render.fps = args.fps
  w, h = args.resolution.split("x")
  scene.render.resolution_x = int(w)
  scene.render.resolution_y = int(h)

  frame_count = args.duration_seconds * args.fps
  scene.frame_start = 1
  scene.frame_end = frame_count

  - Why this is the artifact: Fixed render parameters and deterministic frame range define a stable render contract.
  - Verify commands:
  - nl -ba blender/scripts/render_headless.py
  - rg -n "fps|resolution|frame_end" blender/scripts/render_headless.py

  • - Section: Environment Reproducibility

  - Claim: The project specifies only a loose Python version constraint (>=3.10) and no dependency pins in the main project manifest.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: pyproject.toml:1-4
  - Snippet:

  [project]
  name = "fashion_video_pipeline"
  version = "0.1.0"
  requires-python = ">=3.10"

  - Why this is the artifact: The manifest contains no pinned dependency versions, only a loose Python requirement.
  - Verify commands:
  - nl -ba pyproject.toml
  - rg -n "requires-python|dependencies" pyproject.toml

  • - Section: Environment Reproducibility

  - Claim: A lockfile exists but contains no entries.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: requirements.lock:1-1
  - Snippet:



  - Why this is the artifact: The lockfile is empty, so it does not provide reproducible dependency pins.
  - Verify commands:
  - sed -n '1,5p' requirements.lock
  - wc -l requirements.lock

  • - Section: GPU/ROCm/CUDA Boundary

  - Claim: Runtime requires WSL /dev/dxg and a specific ROCm torch version prefix (2.6.0+rocm6.4.2).
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/doctor.py:13-21
  - Snippet:

  if not wsl.has_dxg():
      print("FAIL: /dev/dxg")
      sys.exit(1)

  if not torch.__version__.startswith("2.6.0+rocm6.4.2"):
      print("FAIL: ROCm userland")
      sys.exit(1)

  - Why this is the artifact: Explicit checks enforce GPU passthrough and ROCm userland version constraints.
  - Verify commands:
  - nl -ba cli/commands/doctor.py
  - rg -n "dxg|rocm" cli/commands/doctor.py

  • - Section: GPU/ROCm/CUDA Boundary

  - Claim: DCI-VTON is invoked on GPU 0 explicitly.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/ai_ops.py:62-66
  - Snippet:

  cmd = [
      "python", "/home/dom/fashion_video_pipeline/third_party/dci_vton/test.py",
      "--plms", "--gpu_id", "0",
      "--ddim_steps", str(steps),

  - Why this is the artifact: The invocation sets an explicit GPU device index.
  - Verify commands:
  - nl -ba cli/core/ai_ops.py
  - rg -n "--gpu_id" cli/core/ai_ops.py

  • - Section: GPU/ROCm/CUDA Boundary

  - Claim: GPU VRAM can be queried via torch CUDA properties (helper exists).
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/gpu.py:1-7
  - Snippet:

  import torch

  def vram_gb() -> int:
      return int(torch.cuda.get_device_properties(0).total_memory / (1024**3))

  - Why this is the artifact: Provides a GPU boundary utility for VRAM sizing using CUDA APIs.
  - Verify commands:
  - nl -ba cli/core/gpu.py
  - rg -n "get_device_properties" cli/core/gpu.py

  • - Section: Failure Handling and Fallbacks

  - Claim: enhance-video uses deterministic ffmpeg fallback on failure or forced mode.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/enhance_video.py:19-29
  - Snippet:

  if force_fallback == "ffmpeg_grade":
      run_ffmpeg_fallback(input, str(out_path))
      print("Enhancement complete")
      return

  try:
      run_hummingbird_xt(input, str(out_path), cfg["num_inference_steps"], cfg["diffusion_strength"])
  except Exception:
      run_ffmpeg_fallback(input, str(out_path))

  - Why this is the artifact: Shows explicit fallback execution logic for enhancement failures.
  - Verify commands:
  - nl -ba cli/commands/enhance_video.py
  - rg -n "force_fallback|run_ffmpeg_fallback" cli/commands/enhance_video.py

  • - Section: Failure Handling and Fallbacks

  - Claim: Doctor exits with failure codes on missing dependencies.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/doctor.py:13-31
  - Snippet:

  if not wsl.has_dxg():
      print("FAIL: /dev/dxg")
      sys.exit(1)
  ...
  if not blender.exists():
      print("FAIL: Blender")
      sys.exit(1)
  ...
  except Exception:
      print("FAIL: ffmpeg")
      sys.exit(1)

  - Why this is the artifact: Defines terminal failure behavior and explicit failure messages.
  - Verify commands:
  - nl -ba cli/commands/doctor.py
  - rg -n "FAIL:|sys.exit" cli/commands/doctor.py

  • - Section: Failure Handling and Fallbacks

  - Claim: assemble-long-video fails fast when no input videos are present.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/assemble_long_video.py:16-19
  - Snippet:

  vids = sorted(Path(input_dir).glob("*.mp4"))
  if not vids:
      raise FileNotFoundError("No input videos found")

  - Why this is the artifact: Establishes a hard failure mode for missing input clips.
  - Verify commands:
  - nl -ba cli/commands/assemble_long_video.py
  - rg -n "No input videos found" cli/commands/assemble_long_video.py

  • - Section: Failure Handling and Fallbacks

  - Claim: generate-still fails fast if no identity LoRA weights are found.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/generate_still.py:14-18
  - Snippet:

  loras = glob.glob(str(root() / "identity" / "models" / identity / "*.safetensors"))
  if not loras:
      raise FileNotFoundError("No LoRA found for identity")

  - Why this is the artifact: Shows explicit validation and failure on missing identity models.
  - Verify commands:
  - nl -ba cli/commands/generate_still.py
  - rg -n "No LoRA found" cli/commands/generate_still.py

  • - Section: Failure Handling and Fallbacks

  - Claim: Subprocess execution uses check=True to fail on non-zero exit codes.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/ai_ops.py:76-100
  - Snippet:

  subprocess.run(cmd, check=True)
  ...
  subprocess.run([
      "ffmpeg", "-y", "-i", input_video,
      "-vf", "eq=contrast=1.1:saturation=1.05:brightness=0.02,unsharp=3:3:0.5:3:3:0.0",
      "-c:v", "libx264", "-crf", "18", "-preset", "slow",
      output_video,
  ], check=True)

  - Why this is the artifact: Ensures failures propagate for critical model and ffmpeg steps.
  - Verify commands:
  - nl -ba cli/core/ai_ops.py
  - rg -n "subprocess.run\\(.*check=True" cli/core/ai_ops.py

  • - Section: Observability and Correlation

  - Claim: A structured logging helper with UTC timestamps exists.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/logging.py:1-8
  - Snippet:

  def log(msg: str) -> None:
      ts = datetime.utcnow().isoformat() + "Z"
      print(f"[FVP {ts}] {msg}")

  - Why this is the artifact: Defines a structured log format with timestamp prefix.
  - Verify commands:
  - nl -ba cli/core/logging.py
  - rg -n "utcnow|\\[FVP" cli/core/logging.py

  • - Section: Observability and Correlation

  - Claim: Runtime commands emit plain print messages without correlation fields.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/enhance_video.py:22-30
  - Snippet:

  run_ffmpeg_fallback(input, str(out_path))
  print("Enhancement complete")
  ...
  run_ffmpeg_fallback(input, str(out_path))
  print("Enhancement complete")

  - Why this is the artifact: Shows non-structured print logging without run_id or stage metadata.
  - Verify commands:
  - nl -ba cli/commands/enhance_video.py
  - rg -n "print\\(\"Enhancement complete\"\\)" cli/commands/enhance_video.py

  • - Section: Observability and Correlation

  - Claim: Correlation via run_id exists in output filenames for try-on, enhancement, and export outputs.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/apply_tryon.py:20-21
  - Snippet:

  final = out_dir / f"tryon_human_run_{run_id()}.png"
  result.replace(final)

  - Why this is the artifact: Output naming embeds run_id for correlation across stages.
  - Verify commands:
  - nl -ba cli/commands/apply_tryon.py
  - rg -n "run_id\\(\\)" cli/commands/apply_tryon.py

  • - Section: Security and Secrets Hygiene

  - Claim: Only FVP_ROOT and FVP_RUN_ID are read from the environment in core path resolution.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/paths.py:9-16
  - Snippet:

  def root() -> Path:
      return Path(os.environ.get("FVP_ROOT", str(DEFAULT_ROOT)))

  def run_id() -> str:
      rid = os.environ.get("FVP_RUN_ID", "")
      if not rid:
          raise RuntimeError("FVP_RUN_ID is required")

  - Why this is the artifact: Shows explicit environment variable access points for the runtime.
  - Verify commands:
  - nl -ba cli/core/paths.py
  - rg -n "os\\.environ" cli/core/paths.py

  • - Section: Security and Secrets Hygiene

  - Claim: Subprocess execution uses argument lists (not shell commands) for ffmpeg and model runners.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/video_ops.py:7-13
  - Snippet:

  subprocess.run([
      "ffmpeg", "-y", "-i", input_path,
      "-vf", f"scale={w}:{h},fps={fps}",
      "-c:v", "libx264", "-crf", str(crf), "-preset", preset,
      output_path
  ], check=True)

  - Why this is the artifact: Demonstrates subprocess usage with argv lists, avoiding shell invocation.
  - Verify commands:
  - nl -ba cli/core/video_ops.py
  - rg -n "subprocess.run\\(\\[" cli/core/video_ops.py

  • - Section: Test Evidence

  - Claim: No orchestration tests are defined in the CLI codebase.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/main.py:1-38
  - Snippet:

  app.command("doctor")(doctor.run)
  app.command("prepare-assets")(prepare_assets.run)
  app.command("train-identity")(train_identity.run)
  app.command("generate-still")(generate_still.run)
  app.command("apply-garment")(apply_tryon.run)
  app.command("render-scene")(render_blender.run)
  app.command("enhance-video")(enhance_video.run)
  app.command("assemble-long-video")(assemble_long_video.run)
  app.command("export")(export.run)

  - Why this is the artifact: The runtime code defines commands but contains no embedded test harness; test discovery commands are required to prove absence elsewhere.
  - Verify commands:
  - rg -n "pytest|unittest|test_" cli
  - rg -n "pytest|unittest|test_" .

  • - Section: Production Hardening Signals

  - Claim: Per-run output directories are created with exist_ok=True, enabling idempotent reruns under the same run_id.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/paths.py:20-23
  - Snippet:

  p = root() / kind / run_id()
  p.mkdir(parents=True, exist_ok=True)
  return p

  - Why this is the artifact: Ensures directories exist without failing, enabling rerun behavior.
  - Verify commands:
  - nl -ba cli/core/paths.py
  - rg -n "exist_ok=True" cli/core/paths.py

  • - Section: Production Hardening Signals

  - Claim: ffmpeg export and fallback explicitly overwrite outputs using -y.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/video_ops.py:7-12
  - Snippet:

  subprocess.run([
      "ffmpeg", "-y", "-i", input_path,
      "-vf", f"scale={w}:{h},fps={fps}",
      "-c:v", "libx264", "-crf", str(crf), "-preset", preset,
      output_path
  ], check=True)

  - Why this is the artifact: -y enforces overwrite behavior and repeatable outputs for reruns.
  - Verify commands:
  - nl -ba cli/core/video_ops.py
  - rg -n "ffmpeg\".*-y" cli/core/video_ops.py

  • - Section: Production Hardening Signals

  - Claim: Assemble step is deterministic by copying the first clip only (pass-through MVP).
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/assemble_long_video.py:20-21
  - Snippet:

  # MVP: pass-through first clip to keep assembly deterministic.
  shutil.copy2(vids[0], out_path)

  - Why this is the artifact: Defines deterministic assembly behavior with no stochastic ordering.
  - Verify commands:
  - nl -ba cli/commands/assemble_long_video.py
  - rg -n "pass-through|copy2" cli/commands/assemble_long_video.py

  • - Section: Production Hardening Signals

  - Claim: Training uses fixed hyperparameters and seed for identity LoRA training.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/train_identity.py:21-35
  - Snippet:

  cmd = [
      "python", "/home/dom/fashion_video_pipeline/third_party/kohya_ss/sd-scripts/train_network.py",
      "--pretrained_model_name_or_path", str(base),
      "--train_data_dir", str(train_dir),
      "--output_dir", str(out_dir),
      "--resolution", "512,512",
      "--max_train_steps", "2000",
      "--learning_rate", "1e-4",
      "--text_encoder_lr", "5e-5",
      "--network_module", "networks.lora",
      "--network_dim", "16",
      "--network_alpha", "16",
      "--train_batch_size", "1",
      "--seed", "555",
  ]

  - Why this is the artifact: Fixed parameters and seed enforce reproducible training runs.
  - Verify commands:
  - nl -ba cli/commands/train_identity.py
  - rg -n "seed|max_train_steps|learning_rate" cli/commands/train_identity.py

  • - Section: Local LLM / Model Invocation Reality

  - Claim: Local model execution exists via DCI-VTON test runner invocation.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/ai_ops.py:62-76
  - Snippet:

  cmd = [
      "python", "/home/dom/fashion_video_pipeline/third_party/dci_vton/test.py",
      "--plms", "--gpu_id", "0",
      "--ddim_steps", str(steps),
      "--outdir", str(out_dir),
      "--config", "/home/dom/fashion_video_pipeline/third_party/dci_vton/configs/viton512.yaml",
      "--ckpt", "/home/dom/fashion_video_pipeline/tryon/engine/weights/viton512.ckpt",

  - Why this is the artifact: Confirms concrete local model execution for try-on inference.
  - Verify commands:
  - nl -ba cli/core/ai_ops.py
  - rg -n "dci_vton/test.py" cli/core/ai_ops.py

  • - Section: Local LLM / Model Invocation Reality

  - Claim: Local model execution exists via Hummingbird-XT inference runner invocation.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/ai_ops.py:82-91
  - Snippet:

  cmd = [
      "python", "/home/dom/fashion_video_pipeline/third_party/hummingbird_xt/infer/examples/wan2.2/predict_ti2v_single.py",
      "--input_video", input_video,
      "--output_video", output_video,
      "--steps", str(steps),
      "--strength", str(strength),
  ]

  - Why this is the artifact: Confirms concrete local model execution for video enhancement.
  - Verify commands:
  - nl -ba cli/core/ai_ops.py
  - rg -n "predict_ti2v_single.py" cli/core/ai_ops.py

  • - Section: Provenance and Traceability

  - Claim: Git history is unavailable in the current workspace; provenance must use file hashes.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/main.py:1-38
  - Snippet:

  """CLI entrypoint."""
  ...
  app.command("export")(export.run)

  - Why this is the artifact: Runtime exists but git metadata is absent; hashes are required for traceability.
  - Verify commands:
  - git rev-parse HEAD
  - git log --oneline -n 5

  • - Section: Provenance and Traceability

  - Claim: SHA256 provenance for cli/main.py (runtime entrypoint).
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/main.py:1-38
  - Snippet:

  28acf470c845289122c4ee0cf756d63970aaa505ebd413d10bcc655056bbbcf8  cli/main.py

  - Why this is the artifact: Hash anchors the exact entrypoint state in the absence of git history.
  - Verify commands:
  - sha256sum cli/main.py
  - nl -ba cli/main.py

  • - Section: Provenance and Traceability

  - Claim: SHA256 provenance for cli/core/ai_ops.py (model invocation core).
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/ai_ops.py:1-101
  - Snippet:

  bc9919c2a8a2655bd5b0c93b038577fcd983d34ff22e6c107b0804720d190748  cli/core/ai_ops.py

  - Why this is the artifact: Hash anchors the exact model execution logic.
  - Verify commands:
  - sha256sum cli/core/ai_ops.py
  - nl -ba cli/core/ai_ops.py

  • - Section: Provenance and Traceability

  - Claim: SHA256 provenance for blender/scripts/render_headless.py (render runtime).
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: blender/scripts/render_headless.py:1-58
  - Snippet:

  5bbc3032006d76ca2acbdbeb492ab4bb85782fcb481a7b86be6b5632804c7118  blender/scripts/render_headless.py

  - Why this is the artifact: Hash anchors the exact Blender render script.
  - Verify commands:
  - sha256sum blender/scripts/render_headless.py
  - nl -ba blender/scripts/render_headless.py

  • - Section: Provenance and Traceability

  - Claim: SHA256 provenance for scripts/run_demo.sh (canonical run sequence).
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: scripts/run_demo.sh:1-11
  - Snippet:

  0a7549574bfc9e944994149a79d5cf6b613b0e8650008a2f5f474d2d483a4c02  scripts/run_demo.sh

  - Why this is the artifact: Hash anchors the exact demo orchestration sequence.
  - Verify commands:
  - sha256sum scripts/run_demo.sh
  - nl -ba scripts/run_demo.sh

  • - Section: Mandatory Questions (A-H)

  - Claim: A) Canonical production run path is the fashion CLI sequence in scripts/run_demo.sh.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: scripts/run_demo.sh:3-10
  - Snippet:

  micromamba run -n fashion_video_env fashion doctor
  micromamba run -n fashion_video_env fashion prepare-assets
  micromamba run -n fashion_video_env fashion apply-garment --human assets/humans/prepared/human_prepared_human_run_20260122_170000_ab12.png --garment assets/garments/
  prepared/garment_front_hoodie_front.png --mode dci_vton
  micromamba run -n fashion_video_env fashion render-scene --scene studio_turntable --duration-seconds 60 --fps 24 --resolution 1920x1080 --garment-front assets/garments/
  prepared/garment_front_hoodie_front.png --garment-back assets/garments/prepared/garment_back_hoodie_back.png
  micromamba run -n fashion_video_env fashion enhance-video --input blender/renders/run_20260122_170000_ab12/render_studio_turntable_run_20260122_170000_ab12.mp4 --profile
  strict
  micromamba run -n fashion_video_env fashion export --input realism/outputs/run_20260122_170000_ab12/enhanced_strict_run_20260122_170000_ab12.mp4 --preset social_9x16

  - Why this is the artifact: This is the only explicit end-to-end runtime sequence provided.
  - Verify commands:
  - nl -ba scripts/run_demo.sh
  - rg -n "fashion (doctor|prepare-assets|apply-garment|render-scene|enhance-video|export)" scripts/run_demo.sh

  • - Section: Mandatory Questions (A-H)

  - Claim: B) Reruns are reproducible through fixed seeds and fixed output naming.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/ai_ops.py:59-72
  - Snippet:

  steps = 50 if profile in ["strict", "balanced"] else 30
  scale = 1.0 if profile in ["strict", "balanced"] else 0.8
  ...
  "--seed", "555",
  "--scale", str(scale),
  "--H", "512",
  "--W", "512",

  - Why this is the artifact: Fixed seeds and fixed resolution enforce deterministic model behavior.
  - Verify commands:
  - nl -ba cli/core/ai_ops.py
  - rg -n "seed|H|W" cli/core/ai_ops.py

  • - Section: Mandatory Questions (A-H)

  - Claim: C) Hard failure modes explicitly handled: missing /dev/dxg, ROCm mismatch, missing Blender, missing ffmpeg.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/doctor.py:13-31
  - Snippet:

  if not wsl.has_dxg():
      print("FAIL: /dev/dxg")
      sys.exit(1)

  if not torch.__version__.startswith("2.6.0+rocm6.4.2"):
      print("FAIL: ROCm userland")
      sys.exit(1)

  blender = Path("/home/dom/fashion_video_pipeline/blender/project_template/tools/blender-3.6.23-linux-x64/blender")
  if not blender.exists():
      print("FAIL: Blender")
      sys.exit(1)

  try:
      subprocess.check_output(["ffmpeg", "-version"])
  except Exception:
      print("FAIL: ffmpeg")
      sys.exit(1)

  - Why this is the artifact: Explicit checks with terminal exits define hard failure conditions.
  - Verify commands:
  - nl -ba cli/commands/doctor.py
  - rg -n "FAIL:|sys.exit" cli/commands/doctor.py

  • - Section: Mandatory Questions (A-H)

  - Claim: D) Silent failure modes currently unhandled: enhance-video catches all exceptions without logging error context.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/enhance_video.py:25-29
  - Snippet:

  try:
      run_hummingbird_xt(input, str(out_path), cfg["num_inference_steps"], cfg["diffusion_strength"])
  except Exception:
      run_ffmpeg_fallback(input, str(out_path))

  - Why this is the artifact: The exception is swallowed without error details, so failure reason is silent.
  - Verify commands:
  - nl -ba cli/commands/enhance_video.py
  - rg -n "except Exception" cli/commands/enhance_video.py

  • - Section: Mandatory Questions (A-H)

  - Claim: E) Lock/version drift is not controlled by a populated lockfile.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: requirements.lock:1-1
  - Snippet:



  - Why this is the artifact: The lockfile has no entries, so dependencies are not pinned here.
  - Verify commands:
  - sed -n '1,5p' requirements.lock
  - wc -l requirements.lock

  • - Section: Mandatory Questions (A-H)

  - Claim: F) Observability is limited to print logs; structured logging helper is not used by commands.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/render_blender.py:10-12
  - Snippet:

  render_scene(scene, duration_seconds, fps, resolution, garment_front, garment_back, human_texture)
  print("Render complete")

  - Why this is the artifact: Commands log via plain print without structured fields.
  - Verify commands:
  - nl -ba cli/commands/render_blender.py
  - rg -n "print\\(" cli/commands/render_blender.py

  • - Section: Mandatory Questions (A-H)

  - Claim: G) Deployable from scratch requires micromamba and the fashion CLI entrypoint.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: scripts/run_demo.sh:4-6
  - Snippet:

  cd /home/dom/fashion_video_pipeline
  micromamba run -n fashion_video_env fashion doctor
  micromamba run -n fashion_video_env fashion prepare-assets

  - Why this is the artifact: The only documented execution path uses micromamba and the CLI entrypoint.
  - Verify commands:
  - nl -ba scripts/run_demo.sh
  - rg -n "micromamba run" scripts/run_demo.sh

  • - Section: Mandatory Questions (A-H)

  - Claim: H) Out-of-scope today: long video assembly is explicitly MVP pass-through only.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/assemble_long_video.py:1-21
  - Snippet:

  """Assemble long video.

  Stitches outputs; for MVP with one chunk, pass-through.
  """
  ...
  # MVP: pass-through first clip to keep assembly deterministic.
  shutil.copy2(vids[0], out_path)

  - Why this is the artifact: States MVP scope and implements only pass-through behavior.
  - Verify commands:
  - nl -ba cli/commands/assemble_long_video.py
  - rg -n "MVP" cli/commands/assemble_long_video.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented a Typer CLI with explicit command routing for the pipeline.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/main.py:17-34
  - Snippet:

  app = typer.Typer(add_completion=False)
  ...
  app.command("doctor")(doctor.run)
  app.command("prepare-assets")(prepare_assets.run)
  ...
  app.command("export")(export.run)

  - Why this is the artifact: Shows the full CLI command registration used in production runs.
  - Verify commands:
  - nl -ba cli/main.py
  - rg -n "app\\.command" cli/main.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Enforced run-scoped output directories using FVP_RUN_ID.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/paths.py:13-22
  - Snippet:

  rid = os.environ.get("FVP_RUN_ID", "")
  if not rid:
      raise RuntimeError("FVP_RUN_ID is required")
  ...
  p = root() / kind / run_id()
  p.mkdir(parents=True, exist_ok=True)

  - Why this is the artifact: Confirms the run_id requirement and per-run output directories.
  - Verify commands:
  - nl -ba cli/core/paths.py
  - rg -n "FVP_RUN_ID|run_dir" cli/core/paths.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Built deterministic DCI-VTON data staging with minimal VITON-like dataroot.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/ai_ops.py:13-29
  - Snippet:

  dataroot = root() / "tryon" / "engine" / "dci_vton_data"
  test_dir = dataroot / "test"
  for p in [
      test_dir / "image",
      test_dir / "cloth",
      test_dir / "cloth-mask",
      test_dir / "cloth-warp",
      test_dir / "cloth-warp-mask",
      test_dir / "unpaired-cloth-warp",
      test_dir / "unpaired-cloth-warp-mask",
      test_dir / "image-parse-v3",
      test_dir / "image-parse-agnostic-v3.2",
      test_dir / "openpose_json",
  ]:
      p.mkdir(parents=True, exist_ok=True)

  - Why this is the artifact: Shows the complete deterministic staging structure for DCI-VTON.
  - Verify commands:
  - nl -ba cli/core/ai_ops.py
  - rg -n "dci_vton_data|openpose_json" cli/core/ai_ops.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented deterministic try-on output naming with run_id.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/apply_tryon.py:14-21
  - Snippet:

  out_dir = run_dir("tryon/outputs")
  ...
  final = out_dir / f"tryon_human_run_{run_id()}.png"
  result.replace(final)

  - Why this is the artifact: Shows run-scoped and deterministic final naming for try-on outputs.
  - Verify commands:
  - nl -ba cli/commands/apply_tryon.py
  - rg -n "tryon_human_run" cli/commands/apply_tryon.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented deterministic enhancement fallback using ffmpeg when model inference fails.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/enhance_video.py:19-29
  - Snippet:

  if force_fallback == "ffmpeg_grade":
      run_ffmpeg_fallback(input, str(out_path))
  ...
  except Exception:
      run_ffmpeg_fallback(input, str(out_path))

  - Why this is the artifact: Defines explicit fallback logic for production robustness.
  - Verify commands:
  - nl -ba cli/commands/enhance_video.py
  - rg -n "run_ffmpeg_fallback" cli/commands/enhance_video.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Pinned Blender binary and scene/script paths for reproducible rendering.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/blender_ops.py:6-15
  - Snippet:

  BLENDER_BIN = Path("/home/dom/fashion_video_pipeline/blender/project_template/tools/blender-3.6.23-linux-x64/blender")
  ...
  "/home/dom/fashion_video_pipeline/blender/project_template/scene_template.blend",
  "-P", "/home/dom/fashion_video_pipeline/blender/scripts/render_headless.py",

  - Why this is the artifact: Absolute paths avoid environment variability in the rendering stack.
  - Verify commands:
  - nl -ba cli/core/blender_ops.py
  - rg -n "blender-3\\.6\\.23|scene_template|render_headless" cli/core/blender_ops.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented deterministic image preprocessing to 512x512 with bicubic resampling.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/image_ops.py:8-11
  - Snippet:

  im = Image.open(input_path).convert("RGB")
  im = im.resize((512, 512), resample=Image.BICUBIC)
  im.save(output_path)

  - Why this is the artifact: Shows a fixed preprocessing step for input standardization.
  - Verify commands:
  - nl -ba cli/core/image_ops.py
  - rg -n "resize\\(\\(512, 512\\)" cli/core/image_ops.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented ffmpeg-based export scaling with explicit fps, CRF, and preset parameters.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/video_ops.py:7-13
  - Snippet:

  "-vf", f"scale={w}:{h},fps={fps}",
  "-c:v", "libx264", "-crf", str(crf), "-preset", preset,
  output_path

  - Why this is the artifact: Shows explicit encoding controls for export determinism.
  - Verify commands:
  - nl -ba cli/core/video_ops.py
  - rg -n "scale=|crf|preset" cli/core/video_ops.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented deterministic mask selection logic for garment and torso segmentation.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/prepare_assets.py:42-56
  - Snippet:

  garment_mask = max(masks, key=lambda m: m["area"])["segmentation"]
  ...
  def dist(m):
      y, x = np.where(m["segmentation"])
      if len(x) == 0:
          return 1e9
      return ((x.mean() - cx) ** 2 + (y.mean() - cy) ** 2) ** 0.5

  torso_mask = min(masks_human, key=dist)["segmentation"]

  - Why this is the artifact: Uses deterministic max/min selection for masks based on area and centroid distance.
  - Verify commands:
  - nl -ba cli/commands/prepare_assets.py
  - rg -n "max\\(masks|min\\(masks_human" cli/commands/prepare_assets.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented deterministic identity training settings with fixed seed and hyperparameters.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/train_identity.py:21-35
  - Snippet:

  "--max_train_steps", "2000",
  "--learning_rate", "1e-4",
  "--text_encoder_lr", "5e-5",
  ...
  "--train_batch_size", "1",
  "--seed", "555",

  - Why this is the artifact: Fixed hyperparameters and seed support reproducibility.
  - Verify commands:
  - nl -ba cli/commands/train_identity.py
  - rg -n "max_train_steps|seed" cli/commands/train_identity.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented deterministic render output naming with run_id and scene name.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: blender/scripts/render_headless.py:28-33
  - Snippet:

  out_dir = Path(f"/home/dom/fashion_video_pipeline/blender/renders/{run_id}")
  out_path = out_dir / f"render_{args.scene}_run_{run_id}.mp4"

  - Why this is the artifact: Output filenames encode scene and run_id for traceability.
  - Verify commands:
  - nl -ba blender/scripts/render_headless.py
  - rg -n "render_.*run_" blender/scripts/render_headless.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented ffmpeg-based deterministic fallback grade for enhancement.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/ai_ops.py:94-100
  - Snippet:

  "-vf", "eq=contrast=1.1:saturation=1.05:brightness=0.02,unsharp=3:3:0.5:3:3:0.0",
  "-c:v", "libx264", "-crf", "18", "-preset", "slow",
  output_video,

  - Why this is the artifact: Fixed filter chain and encoding parameters define deterministic fallback behavior.
  - Verify commands:
  - nl -ba cli/core/ai_ops.py
  - rg -n "eq=contrast|unsharp|crf" cli/core/ai_ops.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented run-scoped enhancement outputs with profile labeling.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/enhance_video.py:15-17
  - Snippet:

  out_dir = run_dir("realism/outputs")
  out_path = out_dir / f"enhanced_{profile}_run_{run_id()}.mp4"

  - Why this is the artifact: Encodes profile and run_id in output naming for traceability.
  - Verify commands:
  - nl -ba cli/commands/enhance_video.py
  - rg -n "enhanced_.*run_" cli/commands/enhance_video.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented export presets driven by YAML configuration.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/config.py:14-17
  - Snippet:

  def load_export_preset(name: str) -> dict:
      cfg_path = root() / "finishing" / "exports" / "presets" / f"{name}.yaml"
      with cfg_path.open("r") as f:
          return yaml.safe_load(f)

  - Why this is the artifact: Shows export behavior is controlled by named YAML presets.
  - Verify commands:
  - nl -ba cli/core/config.py
  - rg -n "load_export_preset" cli/core/config.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented strict realism profile parameters in YAML config.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: realism/configs/strict.yaml:1-12
  - Snippet:

  profile: strict
  fps: 24
  resolution: [1920, 1080]
  chunk_seconds: 6.0
  overlap_seconds: 1.0
  anchor_every_seconds: 12.0
  diffusion_strength: 0.20
  noise_schedule: "linear"
  num_inference_steps: 12
  preserve_garment: true
  allow_garment_edit: false
  ssim_threshold: 0.92

  - Why this is the artifact: Defines a production profile with explicit enhancement parameters.
  - Verify commands:
  - nl -ba realism/configs/strict.yaml
  - rg -n "diffusion_strength|num_inference_steps" realism/configs/strict.yaml

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented export preset for social 9:16 outputs.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: finishing/exports/presets/social_9x16.yaml:1-7
  - Snippet:

  name: social_9x16
  scale: [1080, 1920]
  fps: 24
  video_codec: libx264
  crf: 20
  preset: medium
  audio: none

  - Why this is the artifact: Establishes a concrete export target configuration for production output.
  - Verify commands:
  - nl -ba finishing/exports/presets/social_9x16.yaml
  - rg -n "social_9x16" finishing/exports/presets/social_9x16.yaml

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented input validation utilities for size and ffprobe inspection.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/core/validators.py:12-30
  - Snippet:

  def assert_size_range(path: Path, min_bytes: int, max_bytes: int) -> None:
      sz = path.stat().st_size
      if sz < min_bytes or sz > max_bytes:
          raise ValueError(f"File size {sz} outside {min_bytes}-{max_bytes}")

  def ffprobe_resolution(path: Path) -> str:
      result = subprocess.check_output([
          "ffprobe", "-v", "error", "-show_entries", "stream=width,height",
          "-of", "csv=p=0", str(path)
      ])
      return result.decode().strip()

  - Why this is the artifact: Provides concrete validation and inspection helpers for runtime integrity checks.
  - Verify commands:
  - nl -ba cli/core/validators.py
  - rg -n "assert_size_range|ffprobe" cli/core/validators.py

  • - Section: Resume/Interview-Grade Defensible Claims

  - Claim: Implemented deterministic identity image generation path with run_id naming.
  - Commit: NOT FOUND (git metadata unavailable; repository has no HEAD)
  - File: cli/commands/generate_still.py:19-20
  - Snippet:

  out_path = root() / "assets" / "humans" / "prepared" / f"human_prepared_{identity}_run_{run_id()}.png"
  out_path.parent.mkdir(parents=True, exist_ok=True)

  - Why this is the artifact: Ensures run-scoped identity images and stable output directories.
  - Verify commands:
  - nl -ba cli/commands/generate_still.py
  - rg -n "human_prepared_.*run_" cli/commands/generate_still.py

  • - “NOT FOUND Register”

  - NOT FOUND: Git commit SHA unavailable; git rev-parse HEAD fails because repository has no HEAD.
  - Search commands:
  - git rev-parse HEAD
  - git log --oneline -n 5
  - NOT FOUND: Container passthrough requirements (Docker/Compose) for GPU/ROCm are not present in runtime code.
  - Search commands:
  - rg -n "docker|compose" .
  - rg -n "nvidia|rocm" .
  - NOT FOUND: Structured logging with correlation fields (run_id, stage, exit code) is not used in commands.
  - Search commands:
  - rg -n "cli.core.logging|log\\(" cli
  - rg -n "run_id|stage|exit" cli
  - NOT FOUND: Retry behavior for subprocess operations is not implemented in runtime commands.
  - Search commands:
  - rg -n "retry" cli
  - rg -n "backoff" cli
  - NOT FOUND: Timeout handling is not used in runtime commands (helper exists but unused).
  - Search commands:
  - rg -n "timeout" cli
  - rg -n "cli.core.shell" cli
  - NOT FOUND: Secrets redaction or sanitization logic is not present.
  - Search commands:
  - rg -n "redact|mask|sanitize" cli
  - rg -n "secret|token|password|api[_-]?key" cli
  - NOT FOUND: Orchestration or failure-path tests for CLI commands are absent.
  - Search commands:
  - rg -n "pytest|unittest|test_" cli
  - rg -n "pytest|unittest|test_" .
  - NOT FOUND: Local LLM invocation (ollama/llama.cpp/vllm/etc.) in runtime code.
  - Search commands:
  - rg -n "ollama|llama.cpp|vllm|text-generation-inference" cli
  - rg -n "ollama|llama.cpp|vllm|text-generation-inference" .
  - NOT FOUND: Atomic write or temp file strategy in runtime outputs.
  - Search commands:
  - rg -n "atomic|tmp|TemporaryFile|rename" cli
  - rg -n "atomic|tmp|TemporaryFile|rename" .
  - NOT FOUND: Explicit resource boundary controls (memory/VRAM limits, batch limits) enforced in runtime commands.
  - Search commands:
  - rg -n "vram|memory|batch" cli
  - rg -n "limit|resource" cli